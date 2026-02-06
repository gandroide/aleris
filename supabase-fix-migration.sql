-- ============================================================
-- 🔧 MIGRACIÓN CORRECTIVA COMPLETA PARA ALERIS
-- ============================================================
-- Ejecuta este script en el SQL Editor de Supabase
-- IMPORTANTE: Ejecútalo completo de una sola vez
-- ============================================================

-- ============================================================
-- PASO 1: FIX CRÍTICO - handle_new_user (SIGNUPS ROTOS)
-- El INSERT a organizations no incluía owner_id (campo NOT NULL)
-- Esto causaba que TODO signup de usuario nuevo fallara.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  invite_data record;
  new_org_id uuid;
BEGIN
  -- A. Verificar si el email tiene una invitación pendiente
  SELECT * INTO invite_data 
  FROM public.organization_invitations 
  WHERE email = new.email 
  AND status = 'pending'
  ORDER BY created_at DESC LIMIT 1;

  IF found THEN
    -- CASO 1: ES UN EMPLEADO INVITADO
    INSERT INTO public.profiles (id, email, full_name, role, organization_id)
    VALUES (
      new.id, 
      new.email, 
      COALESCE(new.raw_user_meta_data->>'full_name', 'Usuario Nuevo'), 
      COALESCE(invite_data.role, 'staff'),
      invite_data.organization_id
    );
    
    -- Marcar invitación como aceptada
    UPDATE public.organization_invitations 
    SET status = 'accepted' 
    WHERE id = invite_data.id;

  ELSE
    -- CASO 2: ES UN DUEÑO NUEVO
    -- ✅ FIX: Ahora incluye owner_id = new.id (antes faltaba y causaba error)
    INSERT INTO public.organizations (owner_id, name)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'organization_name', 'Mi Organización')
    )
    RETURNING id INTO new_org_id;

    -- Crear perfil de owner
    INSERT INTO public.profiles (id, email, full_name, role, organization_id)
    VALUES (
      new.id, 
      new.email, 
      COALESCE(new.raw_user_meta_data->>'full_name', 'Dueño'), 
      'owner', 
      new_org_id
    );
  END IF;

  RETURN new;
END;
$function$;


-- ============================================================
-- PASO 2: FOREIGN KEYS (No existía NINGUNA - 0 integridad)
-- ============================================================

-- ⚠️ LIMPIEZA PREVENTIVA: Eliminar datos huérfanos antes de crear FK
-- Sin FK previas, es posible que haya referencias a registros borrados

-- Limpiar profiles con organizaciones inexistentes
UPDATE public.profiles SET organization_id = NULL
WHERE organization_id IS NOT NULL 
  AND organization_id NOT IN (SELECT id FROM public.organizations);

UPDATE public.profiles SET assigned_branch_id = NULL
WHERE assigned_branch_id IS NOT NULL 
  AND assigned_branch_id NOT IN (SELECT id FROM public.branches);

-- Limpiar students con referencias rotas
UPDATE public.students SET branch_id = NULL
WHERE branch_id IS NOT NULL 
  AND branch_id NOT IN (SELECT id FROM public.branches);

DELETE FROM public.students
WHERE organization_id IS NOT NULL 
  AND organization_id NOT IN (SELECT id FROM public.organizations);

-- Limpiar appointments con referencias rotas
UPDATE public.appointments SET branch_id = NULL
WHERE branch_id IS NOT NULL 
  AND branch_id NOT IN (SELECT id FROM public.branches);

UPDATE public.appointments SET student_id = NULL
WHERE student_id IS NOT NULL 
  AND student_id NOT IN (SELECT id FROM public.students);

UPDATE public.appointments SET service_id = NULL
WHERE service_id IS NOT NULL 
  AND service_id NOT IN (SELECT id FROM public.services);

UPDATE public.appointments SET profile_id = NULL
WHERE profile_id IS NOT NULL 
  AND profile_id NOT IN (SELECT id FROM public.profiles);

UPDATE public.appointments SET professional_id = NULL
WHERE professional_id IS NOT NULL 
  AND professional_id NOT IN (SELECT id FROM public.professionals);

DELETE FROM public.appointments
WHERE organization_id IS NOT NULL 
  AND organization_id NOT IN (SELECT id FROM public.organizations);

-- Limpiar transactions con referencias rotas
UPDATE public.transactions SET branch_id = NULL
WHERE branch_id IS NOT NULL 
  AND branch_id NOT IN (SELECT id FROM public.branches);

UPDATE public.transactions SET student_id = NULL
WHERE student_id IS NOT NULL 
  AND student_id NOT IN (SELECT id FROM public.students);

DELETE FROM public.transactions
WHERE organization_id IS NOT NULL 
  AND organization_id NOT IN (SELECT id FROM public.organizations);

-- Limpiar memberships con referencias rotas
DELETE FROM public.memberships
WHERE student_id IS NOT NULL 
  AND student_id NOT IN (SELECT id FROM public.students);

UPDATE public.memberships SET plan_id = NULL
WHERE plan_id IS NOT NULL 
  AND plan_id NOT IN (SELECT id FROM public.plans);

DELETE FROM public.memberships
WHERE organization_id IS NOT NULL 
  AND organization_id NOT IN (SELECT id FROM public.organizations);

-- Limpiar branch_staff con referencias rotas
DELETE FROM public.branch_staff
WHERE profile_id IS NOT NULL 
  AND profile_id NOT IN (SELECT id FROM public.profiles);

DELETE FROM public.branch_staff
WHERE branch_id IS NOT NULL 
  AND branch_id NOT IN (SELECT id FROM public.branches);

DELETE FROM public.branch_staff
WHERE professional_id IS NOT NULL 
  AND professional_id NOT IN (SELECT id FROM public.professionals);

DELETE FROM public.branch_staff
WHERE organization_id IS NOT NULL 
  AND organization_id NOT IN (SELECT id FROM public.organizations);

-- Limpiar staff_schedules con referencias rotas
DELETE FROM public.staff_schedules
WHERE profile_id IS NOT NULL 
  AND profile_id NOT IN (SELECT id FROM public.profiles);

DELETE FROM public.staff_schedules
WHERE branch_id IS NOT NULL 
  AND branch_id NOT IN (SELECT id FROM public.branches);

DELETE FROM public.staff_schedules
WHERE organization_id IS NOT NULL 
  AND organization_id NOT IN (SELECT id FROM public.organizations);

-- Limpiar organization_invitations con referencias rotas
DELETE FROM public.organization_invitations
WHERE organization_id IS NOT NULL 
  AND organization_id NOT IN (SELECT id FROM public.organizations);

-- Limpiar teacher_reviews con referencias rotas
DELETE FROM public.teacher_reviews
WHERE teacher_id IS NOT NULL 
  AND teacher_id NOT IN (SELECT id FROM public.profiles);

UPDATE public.teacher_reviews SET student_id = NULL
WHERE student_id IS NOT NULL 
  AND student_id NOT IN (SELECT id FROM public.students);

DELETE FROM public.teacher_reviews
WHERE organization_id IS NOT NULL 
  AND organization_id NOT IN (SELECT id FROM public.organizations);

-- ✅ LIMPIEZA COMPLETADA - Ahora creamos las FK

-- branches → organizations
ALTER TABLE public.branches
  DROP CONSTRAINT IF EXISTS fk_branches_organization,
  ADD CONSTRAINT fk_branches_organization 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- profiles → organizations
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS fk_profiles_organization,
  ADD CONSTRAINT fk_profiles_organization 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

-- profiles → branches (assigned_branch)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS fk_profiles_branch,
  ADD CONSTRAINT fk_profiles_branch 
    FOREIGN KEY (assigned_branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

-- profiles → auth.users
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS fk_profiles_auth_user,
  ADD CONSTRAINT fk_profiles_auth_user 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- students → organizations
ALTER TABLE public.students
  DROP CONSTRAINT IF EXISTS fk_students_organization,
  ADD CONSTRAINT fk_students_organization 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- students → branches
ALTER TABLE public.students
  DROP CONSTRAINT IF EXISTS fk_students_branch,
  ADD CONSTRAINT fk_students_branch 
    FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

-- services → organizations
ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS fk_services_organization,
  ADD CONSTRAINT fk_services_organization 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- plans → organizations
ALTER TABLE public.plans
  DROP CONSTRAINT IF EXISTS fk_plans_organization,
  ADD CONSTRAINT fk_plans_organization 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- professionals → organizations
ALTER TABLE public.professionals
  DROP CONSTRAINT IF EXISTS fk_professionals_organization,
  ADD CONSTRAINT fk_professionals_organization 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- appointments → organizations
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS fk_appointments_organization,
  ADD CONSTRAINT fk_appointments_organization 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- appointments → branches
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS fk_appointments_branch,
  ADD CONSTRAINT fk_appointments_branch 
    FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

-- appointments → students
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS fk_appointments_student,
  ADD CONSTRAINT fk_appointments_student 
    FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE SET NULL;

-- appointments → services
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS fk_appointments_service,
  ADD CONSTRAINT fk_appointments_service 
    FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;

-- appointments → profiles (internal teacher)
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS fk_appointments_profile,
  ADD CONSTRAINT fk_appointments_profile 
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- appointments → professionals (external teacher)
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS fk_appointments_professional,
  ADD CONSTRAINT fk_appointments_professional 
    FOREIGN KEY (professional_id) REFERENCES public.professionals(id) ON DELETE SET NULL;

-- transactions → organizations
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS fk_transactions_organization,
  ADD CONSTRAINT fk_transactions_organization 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- transactions → branches
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS fk_transactions_branch,
  ADD CONSTRAINT fk_transactions_branch 
    FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

-- transactions → students
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS fk_transactions_student,
  ADD CONSTRAINT fk_transactions_student 
    FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE SET NULL;

-- memberships → organizations
ALTER TABLE public.memberships
  DROP CONSTRAINT IF EXISTS fk_memberships_organization,
  ADD CONSTRAINT fk_memberships_organization 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- memberships → students
ALTER TABLE public.memberships
  DROP CONSTRAINT IF EXISTS fk_memberships_student,
  ADD CONSTRAINT fk_memberships_student 
    FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

-- memberships → plans
ALTER TABLE public.memberships
  DROP CONSTRAINT IF EXISTS fk_memberships_plan,
  ADD CONSTRAINT fk_memberships_plan 
    FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE SET NULL;

-- branch_staff → organizations
ALTER TABLE public.branch_staff
  DROP CONSTRAINT IF EXISTS fk_branch_staff_organization,
  ADD CONSTRAINT fk_branch_staff_organization 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- branch_staff → profiles
ALTER TABLE public.branch_staff
  DROP CONSTRAINT IF EXISTS fk_branch_staff_profile,
  ADD CONSTRAINT fk_branch_staff_profile 
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- branch_staff → branches
ALTER TABLE public.branch_staff
  DROP CONSTRAINT IF EXISTS fk_branch_staff_branch,
  ADD CONSTRAINT fk_branch_staff_branch 
    FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

-- branch_staff → professionals
ALTER TABLE public.branch_staff
  DROP CONSTRAINT IF EXISTS fk_branch_staff_professional,
  ADD CONSTRAINT fk_branch_staff_professional 
    FOREIGN KEY (professional_id) REFERENCES public.professionals(id) ON DELETE CASCADE;

-- staff_schedules → organizations
ALTER TABLE public.staff_schedules
  DROP CONSTRAINT IF EXISTS fk_staff_schedules_organization,
  ADD CONSTRAINT fk_staff_schedules_organization 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- staff_schedules → profiles
ALTER TABLE public.staff_schedules
  DROP CONSTRAINT IF EXISTS fk_staff_schedules_profile,
  ADD CONSTRAINT fk_staff_schedules_profile 
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- staff_schedules → branches
ALTER TABLE public.staff_schedules
  DROP CONSTRAINT IF EXISTS fk_staff_schedules_branch,
  ADD CONSTRAINT fk_staff_schedules_branch 
    FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

-- organization_invitations → organizations
ALTER TABLE public.organization_invitations
  DROP CONSTRAINT IF EXISTS fk_org_invitations_organization,
  ADD CONSTRAINT fk_org_invitations_organization 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- teacher_reviews → organizations
ALTER TABLE public.teacher_reviews
  DROP CONSTRAINT IF EXISTS fk_teacher_reviews_organization,
  ADD CONSTRAINT fk_teacher_reviews_organization 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- teacher_reviews → profiles (teacher)
ALTER TABLE public.teacher_reviews
  DROP CONSTRAINT IF EXISTS fk_teacher_reviews_teacher,
  ADD CONSTRAINT fk_teacher_reviews_teacher 
    FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- teacher_reviews → students
ALTER TABLE public.teacher_reviews
  DROP CONSTRAINT IF EXISTS fk_teacher_reviews_student,
  ADD CONSTRAINT fk_teacher_reviews_student 
    FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE SET NULL;


-- ============================================================
-- PASO 3: FIX VISTAS (tipos incorrectos causaban bugs graves)
-- El código espera type='system'/'professional' 
-- pero las vistas devolvían 'Internal'/'External'
-- Resultado: Nómina, asignaciones y calendario ROTOS
-- ============================================================

-- 3A. FIX staff_details_view
-- Problemas:
--   - Devolvía 'Internal'/'External' (código espera 'system'/'professional')
--   - Ponía base_salary=0 y commission=0 para internos (ignoraba profiles)
--   - No incluía columna 'role' (el Dashboard la necesita)
DROP VIEW IF EXISTS public.staff_details_view;
CREATE VIEW public.staff_details_view AS
  -- Profesionales externos
  SELECT 
    p.id,
    p.organization_id,
    p.full_name,
    p.email,
    p.phone,
    p.specialty,
    'professional'::text AS type,
    'professional'::text AS role,
    p.base_salary,
    p.commission_percentage,
    NULL::uuid AS branch_id
  FROM professionals p
  UNION ALL
  -- Staff interno (desde branch_staff + profiles)
  SELECT 
    bs.id,
    bs.organization_id,
    pr.full_name,
    pr.email,
    pr.phone,
    pr.specialty,
    'system'::text AS type,
    pr.role,
    COALESCE(pr.base_salary, 0) AS base_salary,
    COALESCE(pr.commission_percentage, 0) AS commission_percentage,
    bs.branch_id
  FROM branch_staff bs
  JOIN profiles pr ON bs.profile_id = pr.id;


-- 3B. FIX available_teachers_view
-- Corregido: devuelve pr.id (profile UUID real) para system users,
-- no bs.id (branch_staff UUID), así profile_id en appointments es correcto.
DROP VIEW IF EXISTS public.available_teachers_view;
CREATE VIEW public.available_teachers_view AS
  SELECT 
    p.id,
    p.organization_id,
    p.full_name,
    'professional'::text AS type,
    NULL::uuid AS specific_branch_id
  FROM professionals p
  UNION ALL
  SELECT 
    pr.id,
    bs.organization_id,
    COALESCE(pr.full_name, 'Staff Sin Nombre'::text) AS full_name,
    'system'::text AS type,
    bs.branch_id AS specific_branch_id
  FROM branch_staff bs
  JOIN profiles pr ON bs.profile_id = pr.id;


-- ============================================================
-- PASO 4: INDEXES FALTANTES (Performance)
-- Muchas tablas se filtran por organization_id sin índice
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_students_organization_id 
  ON public.students(organization_id);

CREATE INDEX IF NOT EXISTS idx_students_branch_id 
  ON public.students(branch_id);

CREATE INDEX IF NOT EXISTS idx_appointments_organization_id 
  ON public.appointments(organization_id);

CREATE INDEX IF NOT EXISTS idx_appointments_start_time 
  ON public.appointments(start_time);

CREATE INDEX IF NOT EXISTS idx_appointments_student_id 
  ON public.appointments(student_id);

CREATE INDEX IF NOT EXISTS idx_transactions_organization_id 
  ON public.transactions(organization_id);

CREATE INDEX IF NOT EXISTS idx_transactions_student_id 
  ON public.transactions(student_id);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at 
  ON public.transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_memberships_organization_id 
  ON public.memberships(organization_id);

CREATE INDEX IF NOT EXISTS idx_memberships_student_id 
  ON public.memberships(student_id);

CREATE INDEX IF NOT EXISTS idx_memberships_status 
  ON public.memberships(status);

CREATE INDEX IF NOT EXISTS idx_professionals_organization_id 
  ON public.professionals(organization_id);

CREATE INDEX IF NOT EXISTS idx_services_organization_id 
  ON public.services(organization_id);

CREATE INDEX IF NOT EXISTS idx_plans_organization_id 
  ON public.plans(organization_id);

CREATE INDEX IF NOT EXISTS idx_branch_staff_organization_id 
  ON public.branch_staff(organization_id);

CREATE INDEX IF NOT EXISTS idx_branch_staff_profile_id 
  ON public.branch_staff(profile_id);

CREATE INDEX IF NOT EXISTS idx_branch_staff_professional_id 
  ON public.branch_staff(professional_id);

CREATE INDEX IF NOT EXISTS idx_staff_schedules_profile_id 
  ON public.staff_schedules(profile_id);

CREATE INDEX IF NOT EXISTS idx_staff_schedules_branch_id 
  ON public.staff_schedules(branch_id);

CREATE INDEX IF NOT EXISTS idx_org_invitations_email 
  ON public.organization_invitations(email);

CREATE INDEX IF NOT EXISTS idx_teacher_reviews_teacher_id 
  ON public.teacher_reviews(teacher_id);


-- ============================================================
-- PASO 5: RLS POLICIES FALTANTES Y CORRECCIONES
-- ============================================================

-- 5A. FIX: professionals - BORRAR política abierta (SECURITY HOLE)
-- Cualquier usuario autenticado podía ver/editar profesionales de OTRAS orgs
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.professionals;

-- Reemplazar con políticas seguras
CREATE POLICY "Ver profesionales de mi org"
  ON public.professionals FOR SELECT
  USING (organization_id IN (
    SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid()
  ));

CREATE POLICY "Gestionar profesionales de mi org"
  ON public.professionals FOR ALL
  USING (organization_id IN (
    SELECT profiles.organization_id FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'owner'
  ))
  WITH CHECK (organization_id IN (
    SELECT profiles.organization_id FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'owner'
  ));

-- Super admin acceso total a professionals
CREATE POLICY "professionals_super_admin"
  ON public.professionals FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());


-- 5B. students - Falta UPDATE policy (guardar notas falla)
CREATE POLICY "Equipo edita clientes"
  ON public.students FOR UPDATE
  USING (organization_id IN (
    SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid()
  ));

-- students - Falta DELETE policy
CREATE POLICY "Dueños borran clientes"
  ON public.students FOR DELETE
  USING (organization_id IN (
    SELECT profiles.organization_id FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'owner'
  ));

-- students - Super admin
CREATE POLICY "students_super_admin"
  ON public.students FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());


-- 5C. transactions - Faltan UPDATE/DELETE policies
CREATE POLICY "Editar transacciones (Owner)"
  ON public.transactions FOR UPDATE
  USING (organization_id IN (
    SELECT profiles.organization_id FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'owner'
  ));

CREATE POLICY "Eliminar transacciones (Owner)"
  ON public.transactions FOR DELETE
  USING (organization_id IN (
    SELECT profiles.organization_id FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'owner'
  ));


-- 5D. courses - Solo tiene SELECT, falta el resto
CREATE POLICY "Gestionar cursos (Owner)"
  ON public.courses FOR ALL
  USING (organization_id IN (
    SELECT profiles.organization_id FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'owner'
  ))
  WITH CHECK (organization_id IN (
    SELECT profiles.organization_id FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'owner'
  ));


-- 5E. enrollments - Solo tiene SELECT, falta el resto
CREATE POLICY "Gestionar inscripciones (Owner/Staff)"
  ON public.enrollments FOR ALL
  USING (organization_id IN (
    SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid()
  ))
  WITH CHECK (organization_id IN (
    SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid()
  ));


-- 5F. payments - Solo tiene SELECT, falta el resto
CREATE POLICY "Gestionar pagos (Owner/Staff)"
  ON public.payments FOR ALL
  USING (organization_id IN (
    SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid()
  ))
  WITH CHECK (organization_id IN (
    SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid()
  ));


-- 5G. organization_invitations - ¡RLS DESACTIVADO! Activar + agregar policies
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dueños gestionan invitaciones"
  ON public.organization_invitations FOR ALL
  USING (organization_id IN (
    SELECT profiles.organization_id FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'owner'
  ))
  WITH CHECK (organization_id IN (
    SELECT profiles.organization_id FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'owner'
  ));

-- Permitir al trigger (service_role) insertar invitaciones
CREATE POLICY "Service role full access invitations"
  ON public.organization_invitations FOR ALL
  USING (true)
  WITH CHECK (true);

-- Restricción: la policy anterior solo para service_role, no para anon/authenticated
-- Corregimos: la policy de arriba es demasiado permisiva, la borramos y usamos solo la de dueños
DROP POLICY IF EXISTS "Service role full access invitations" ON public.organization_invitations;


-- 5H. LIMPIAR DUPLICADOS en profiles
-- Hay 3 políticas SELECT y 3 UPDATE duplicadas que hacen lo mismo
DROP POLICY IF EXISTS "Usuarios editan su perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios editan su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Ver mi propio perfil" ON public.profiles;
-- Dejamos: "Editar mi propio perfil" (UPDATE) y "Usuarios ven su propio perfil" (SELECT)

-- Profiles: Dueños pueden ver perfiles de su organización
CREATE POLICY "Dueño ve perfiles de su org"
  ON public.profiles FOR SELECT
  USING (
    organization_id IN (
      SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid()
    )
  );

-- Profiles: Dueños pueden editar perfiles de su org (para cambiar salary, etc)
CREATE POLICY "Dueño edita perfiles de su org"
  ON public.profiles FOR UPDATE
  USING (
    organization_id IN (
      SELECT o.id FROM organizations o WHERE o.owner_id = auth.uid()
    )
  );


-- 5I. LIMPIAR DUPLICADOS en services
-- Hay 4 policies haciendo lo mismo
DROP POLICY IF EXISTS "Equipo ve servicios" ON public.services;
DROP POLICY IF EXISTS "Ver servicios propios" ON public.services;
DROP POLICY IF EXISTS "Gestionar servicios propios" ON public.services;
-- Dejamos: "Equipo gestiona servicios" (ALL) que cubre todo


-- ============================================================
-- PASO 6: FIX CHECK CONSTRAINTS
-- profiles.role solo permite 'super_admin','owner','staff' 
-- pero se necesita 'teacher' para invitaciones
-- ============================================================

ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('super_admin', 'owner', 'staff', 'teacher'));


-- ============================================================
-- PASO 7: UNIQUE CONSTRAINT para branch_staff + professional_id
-- El actual solo cubre (profile_id, branch_id), pero los 
-- profesionales externos usan professional_id (con profile_id NULL)
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_branch_staff_professional_branch 
  ON public.branch_staff(professional_id, branch_id) 
  WHERE professional_id IS NOT NULL;


-- ============================================================
-- PASO 8: FIX get_my_org_id para ser más robusto
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT organization_id FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$function$;


-- ============================================================
-- LISTO - RESUMEN DE CAMBIOS REALIZADOS
-- ============================================================
-- ✅ 1. handle_new_user: Corregido (owner_id faltante)
-- ✅ 2. Foreign Keys: 30+ FK constraints añadidos
-- ✅ 3. Vistas: staff_details_view y available_teachers_view corregidas
-- ✅ 4. Índices: 20+ índices de rendimiento añadidos
-- ✅ 5. RLS: Policies faltantes añadidas, duplicadas eliminadas, hole cerrado
-- ✅ 6. Check Constraints: profiles.role actualizado
-- ✅ 7. Unique: branch_staff + professional_id protegido
-- ✅ 8. Funciones: get_my_org_id mejorado
-- ============================================================

