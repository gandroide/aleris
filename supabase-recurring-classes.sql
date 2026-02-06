-- ============================================================
-- MIGRACIÓN: Clases Recurrentes en Membresías
-- ============================================================
-- Permite definir clases recurrentes por días de la semana
-- y generar automáticamente todas las citas del período
-- ============================================================

-- 1. Agregar campos de recurrencia a la tabla plans
ALTER TABLE public.plans 
  ADD COLUMN IF NOT EXISTS recurring_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurring_days integer[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS recurring_time time DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS default_teacher_type text DEFAULT NULL CHECK (default_teacher_type IN ('system', 'professional', NULL)),
  ADD COLUMN IF NOT EXISTS default_teacher_id uuid DEFAULT NULL;

COMMENT ON COLUMN public.plans.recurring_enabled IS 'Si este plan incluye clases recurrentes automáticas';
COMMENT ON COLUMN public.plans.recurring_days IS 'Array de días de la semana: 0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado';
COMMENT ON COLUMN public.plans.recurring_time IS 'Hora por defecto de las clases recurrentes';
COMMENT ON COLUMN public.plans.default_teacher_type IS 'Tipo de profesor por defecto: system o professional';
COMMENT ON COLUMN public.plans.default_teacher_id IS 'ID del profesor/professional asignado por defecto';

-- 2. Índice para mejorar búsquedas de planes con recurrencia
CREATE INDEX IF NOT EXISTS idx_plans_recurring_enabled 
  ON public.plans(recurring_enabled) WHERE recurring_enabled = true;


-- 3. Función para generar citas recurrentes cuando se crea/activa una membresía
CREATE OR REPLACE FUNCTION public.generate_recurring_appointments(
  p_membership_id uuid
)
RETURNS TABLE (
  appointments_created integer,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_membership record;
  v_plan record;
  v_current_date date;
  v_end_date date;
  v_day_of_week integer;
  v_start_time timestamptz;
  v_count integer := 0;
  v_branch_id uuid;
BEGIN
  -- Obtener información de la membresía y plan
  SELECT m.*, p.*
  INTO v_membership
  FROM memberships m
  JOIN plans p ON m.plan_id = p.id
  WHERE m.id = p_membership_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 'Membresía no encontrada'::text;
    RETURN;
  END IF;

  -- Obtener el plan completo
  SELECT * INTO v_plan FROM plans WHERE id = v_membership.plan_id;

  -- Verificar que el plan tenga recurrencia habilitada
  IF NOT v_plan.recurring_enabled OR v_plan.recurring_days IS NULL OR array_length(v_plan.recurring_days, 1) IS NULL THEN
    RETURN QUERY SELECT 0, 'Este plan no tiene clases recurrentes configuradas'::text;
    RETURN;
  END IF;

  -- Obtener branch_id del estudiante
  SELECT branch_id INTO v_branch_id 
  FROM students 
  WHERE id = v_membership.student_id;

  -- Iterar por cada día en el rango de la membresía
  v_current_date := v_membership.start_date::date;
  v_end_date := v_membership.end_date::date;

  WHILE v_current_date <= v_end_date LOOP
    -- Obtener día de la semana (0=domingo, 1=lunes, etc)
    v_day_of_week := EXTRACT(DOW FROM v_current_date);
    
    -- Si este día está en el array de días recurrentes
    IF v_day_of_week = ANY(v_plan.recurring_days) THEN
      -- Construir timestamp completo
      v_start_time := (v_current_date || ' ' || v_plan.recurring_time)::timestamptz;
      
      -- Verificar que no exista ya una cita en este horario para este alumno
      IF NOT EXISTS (
        SELECT 1 FROM appointments 
        WHERE student_id = v_membership.student_id 
        AND start_time = v_start_time
      ) THEN
        -- Crear la cita
        INSERT INTO appointments (
          organization_id,
          branch_id,
          student_id,
          service_id,
          start_time,
          end_time,
          price_at_booking,
          is_private_class,
          status,
          profile_id,
          professional_id,
          created_from_membership
        ) VALUES (
          v_membership.organization_id,
          v_branch_id,
          v_membership.student_id,
          v_plan.service_id,
          v_start_time,
          v_start_time, -- end_time = start_time por ahora
          0, -- precio 0 porque está cubierto por membresía
          false,
          'scheduled',
          CASE WHEN v_plan.default_teacher_type = 'system' THEN v_plan.default_teacher_id ELSE NULL END,
          CASE WHEN v_plan.default_teacher_type = 'professional' THEN v_plan.default_teacher_id ELSE NULL END,
          true
        );
        
        v_count := v_count + 1;
      END IF;
    END IF;
    
    -- Siguiente día
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;

  RETURN QUERY SELECT v_count, format('Se crearon %s clases recurrentes', v_count)::text;
END;
$$;

COMMENT ON FUNCTION public.generate_recurring_appointments IS 
'Genera automáticamente todas las citas recurrentes para una membresía activa';


-- 4. Agregar campo para marcar citas generadas automáticamente
ALTER TABLE public.appointments 
  ADD COLUMN IF NOT EXISTS created_from_membership boolean DEFAULT false;

COMMENT ON COLUMN public.appointments.created_from_membership IS 
'Indica si esta cita fue generada automáticamente desde una membresía recurrente';

CREATE INDEX IF NOT EXISTS idx_appointments_created_from_membership 
  ON public.appointments(created_from_membership) 
  WHERE created_from_membership = true;


-- 5. Función helper para obtener nombre del día de la semana
CREATE OR REPLACE FUNCTION public.get_weekday_name(day_number integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE day_number
    WHEN 0 THEN 'Domingo'
    WHEN 1 THEN 'Lunes'
    WHEN 2 THEN 'Martes'
    WHEN 3 THEN 'Miércoles'
    WHEN 4 THEN 'Jueves'
    WHEN 5 THEN 'Viernes'
    WHEN 6 THEN 'Sábado'
    ELSE 'Desconocido'
  END;
END;
$$;


-- 6. Vista para ver planes con configuración de recurrencia
CREATE OR REPLACE VIEW public.plans_with_recurrence_details AS
SELECT 
  p.*,
  s.name as service_name,
  CASE 
    WHEN p.default_teacher_type = 'system' THEN pr.full_name
    WHEN p.default_teacher_type = 'professional' THEN prof.full_name
    ELSE NULL
  END as default_teacher_name,
  array_to_string(
    ARRAY(
      SELECT get_weekday_name(unnest) 
      FROM unnest(p.recurring_days) 
      ORDER BY unnest
    ), 
    ', '
  ) as recurring_days_names
FROM plans p
LEFT JOIN services s ON p.service_id = s.id
LEFT JOIN profiles pr ON (p.default_teacher_id = pr.id AND p.default_teacher_type = 'system')
LEFT JOIN professionals prof ON (p.default_teacher_id = prof.id AND p.default_teacher_type = 'professional');

COMMENT ON VIEW public.plans_with_recurrence_details IS 
'Vista que muestra los planes con información legible de su configuración de recurrencia';


-- 7. Función para eliminar citas recurrentes de una membresía (en caso de cancelación)
CREATE OR REPLACE FUNCTION public.delete_recurring_appointments(
  p_membership_id uuid
)
RETURNS TABLE (
  appointments_deleted integer,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_membership record;
  v_count integer := 0;
BEGIN
  -- Obtener información de la membresía
  SELECT * INTO v_membership FROM memberships WHERE id = p_membership_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 'Membresía no encontrada'::text;
    RETURN;
  END IF;

  -- Eliminar solo las citas futuras que fueron creadas automáticamente
  -- y que aún están en estado 'scheduled'
  DELETE FROM appointments
  WHERE student_id = v_membership.student_id
    AND created_from_membership = true
    AND status = 'scheduled'
    AND start_time >= NOW()
    AND start_time BETWEEN v_membership.start_date AND v_membership.end_date;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT v_count, format('Se eliminaron %s clases futuras', v_count)::text;
END;
$$;

COMMENT ON FUNCTION public.delete_recurring_appointments IS 
'Elimina las citas futuras generadas automáticamente de una membresía (útil para cancelaciones)';


-- ============================================================
-- PERMISOS Y SEGURIDAD
-- ============================================================

-- Las funciones usan SECURITY DEFINER, por lo que se ejecutan con permisos del owner
-- Las policies de RLS existentes ya protegen appointments y memberships

-- ============================================================
-- EJEMPLOS DE USO
-- ============================================================

-- Ejemplo 1: Generar clases recurrentes para una membresía
-- SELECT * FROM generate_recurring_appointments('uuid-de-membresia-aqui');

-- Ejemplo 2: Ver planes con configuración de recurrencia
-- SELECT * FROM plans_with_recurrence_details WHERE recurring_enabled = true;

-- Ejemplo 3: Eliminar clases recurrentes futuras de una membresía
-- SELECT * FROM delete_recurring_appointments('uuid-de-membresia-aqui');

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
SELECT 'Migración de clases recurrentes completada exitosamente' AS resultado;

