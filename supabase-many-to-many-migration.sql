-- ============================================================
-- MIGRACIÓN: Many-to-Many — Appointments & Plans
-- ============================================================
-- Ejecuta este script en el SQL Editor de Supabase
-- Crea tablas junction y migra datos existentes
-- ============================================================

-- ============================================================
-- PARTE A: appointment_attendees (Multi-Alumno por Cita)
-- ============================================================

-- 1. Crear tabla junction
CREATE TABLE IF NOT EXISTS public.appointment_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. UNIQUE: un alumno solo aparece una vez por cita
ALTER TABLE public.appointment_attendees
  DROP CONSTRAINT IF EXISTS uq_appointment_attendee;
ALTER TABLE public.appointment_attendees
  ADD CONSTRAINT uq_appointment_attendee UNIQUE (appointment_id, student_id);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_appt_attendees_appointment_id
  ON public.appointment_attendees(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appt_attendees_student_id
  ON public.appointment_attendees(student_id);

-- 4. Migrar datos existentes: copiar appointments.student_id → junction
INSERT INTO public.appointment_attendees (appointment_id, student_id)
SELECT id, student_id
FROM public.appointments
WHERE student_id IS NOT NULL
ON CONFLICT (appointment_id, student_id) DO NOTHING;

-- 5. Hacer student_id opcional (nullable)
ALTER TABLE public.appointments
  ALTER COLUMN student_id DROP NOT NULL;

-- 6. RLS
ALTER TABLE public.appointment_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appt_attendees_super_admin"
  ON public.appointment_attendees FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "appt_attendees_org_access"
  ON public.appointment_attendees FOR ALL
  TO authenticated
  USING (
    appointment_id IN (
      SELECT a.id FROM appointments a
      WHERE a.organization_id IN (
        SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid()
      )
    )
  )
  WITH CHECK (
    appointment_id IN (
      SELECT a.id FROM appointments a
      WHERE a.organization_id IN (
        SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid()
      )
    )
  );

-- ============================================================
-- PARTE B: plan_services_access (Multi-Servicio por Plan)
-- ============================================================

-- 1. Crear tabla junction
CREATE TABLE IF NOT EXISTS public.plan_services_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. UNIQUE
ALTER TABLE public.plan_services_access
  DROP CONSTRAINT IF EXISTS uq_plan_service;
ALTER TABLE public.plan_services_access
  ADD CONSTRAINT uq_plan_service UNIQUE (plan_id, service_id);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_plan_services_plan_id
  ON public.plan_services_access(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_services_service_id
  ON public.plan_services_access(service_id);

-- 4. Migrar datos existentes: copiar plans.service_id → junction
INSERT INTO public.plan_services_access (plan_id, service_id)
SELECT id, service_id
FROM public.plans
WHERE service_id IS NOT NULL
ON CONFLICT (plan_id, service_id) DO NOTHING;

-- 5. Hacer plans.service_id nullable (mantener la columna para compat)
ALTER TABLE public.plans
  ALTER COLUMN service_id DROP NOT NULL;

-- 6. RLS
ALTER TABLE public.plan_services_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_services_super_admin"
  ON public.plan_services_access FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "plan_services_org_access"
  ON public.plan_services_access FOR ALL
  TO authenticated
  USING (
    plan_id IN (
      SELECT p.id FROM plans p
      WHERE p.organization_id IN (
        SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid()
      )
    )
  )
  WITH CHECK (
    plan_id IN (
      SELECT p.id FROM plans p
      WHERE p.organization_id IN (
        SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid()
      )
    )
  );

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
SELECT 'Migración M:N completada exitosamente' AS resultado;
