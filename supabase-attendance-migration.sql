-- ============================================================
-- MIGRACIÓN: Registros de Asistencia (attendance_records)
-- ============================================================
-- Ejecuta este script en el SQL Editor de Supabase
-- Permite registrar asistencia por alumno por cita/clase
-- ============================================================

-- 1. Crear tabla attendance_records
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'absent' CHECK (status IN ('present', 'absent', 'late')),
    marked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Constraint: Un alumno solo tiene un registro por cita (permite UPSERT)
ALTER TABLE public.attendance_records
  DROP CONSTRAINT IF EXISTS uq_attendance_appointment_student;

ALTER TABLE public.attendance_records
  ADD CONSTRAINT uq_attendance_appointment_student
    UNIQUE (appointment_id, student_id);

-- 3. Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_attendance_organization_id
  ON public.attendance_records(organization_id);

CREATE INDEX IF NOT EXISTS idx_attendance_appointment_id
  ON public.attendance_records(appointment_id);

CREATE INDEX IF NOT EXISTS idx_attendance_student_id
  ON public.attendance_records(student_id);

CREATE INDEX IF NOT EXISTS idx_attendance_status
  ON public.attendance_records(status);

-- 4. Trigger para updated_at automático
CREATE TRIGGER update_attendance_records_updated_at
    BEFORE UPDATE ON public.attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Habilitar RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS

-- Super Admin: Acceso total
CREATE POLICY "attendance_super_admin"
  ON public.attendance_records FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Owner/Staff: Ver registros de su organización
CREATE POLICY "attendance_ver_mi_org"
  ON public.attendance_records FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid()
  ));

-- Owner/Staff: Crear/Editar registros de su organización
CREATE POLICY "attendance_gestionar_mi_org"
  ON public.attendance_records FOR ALL
  TO authenticated
  USING (organization_id IN (
    SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid()
  ))
  WITH CHECK (organization_id IN (
    SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid()
  ));

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
SELECT 'Migración de attendance_records completada exitosamente' AS resultado;
