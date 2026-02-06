-- ============================================================
-- MIGRACIÓN: Vincular Planes con Servicios
-- Ejecuta esto en el SQL Editor de Supabase
-- ============================================================
-- Esto permite que cada Plan/Membresía esté ligado a un
-- Servicio específico (ej: "Plan Mensual Tambor" → servicio "Tambor")
-- ============================================================

-- 1. Agregar columna service_id a plans
ALTER TABLE public.plans 
  ADD COLUMN IF NOT EXISTS service_id uuid;

-- 2. Agregar FK
ALTER TABLE public.plans
  DROP CONSTRAINT IF EXISTS fk_plans_service,
  ADD CONSTRAINT fk_plans_service 
    FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;

-- 3. Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_plans_service_id ON public.plans(service_id);

-- 4. RLS: la política existente de plans ya cubre esta columna
-- No se necesitan cambios adicionales de RLS

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
SELECT 'Migración exitosa: plans ahora tiene service_id' AS resultado;

