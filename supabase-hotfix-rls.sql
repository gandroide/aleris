-- ============================================================
-- 🚨 HOTFIX: Recursión infinita en RLS de profiles
-- ============================================================
-- SAFE: Cada CREATE tiene su DROP IF EXISTS antes
-- ============================================================

-- PASO 0: Funciones SECURITY DEFINER (saltan RLS)
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

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'owner'
  );
$function$;


-- ============================================================
-- PASO 1: FIX profiles
-- ============================================================
DROP POLICY IF EXISTS "Dueño ve perfiles de su org" ON public.profiles;
DROP POLICY IF EXISTS "Dueño edita perfiles de su org" ON public.profiles;
DROP POLICY IF EXISTS "Ver perfiles de mi org" ON public.profiles;
DROP POLICY IF EXISTS "Equipo ve perfiles" ON public.profiles;

CREATE POLICY "Dueño ve perfiles de su org"
  ON public.profiles FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "Dueño edita perfiles de su org"
  ON public.profiles FOR UPDATE
  USING (is_owner() AND organization_id = get_my_org_id());


-- ============================================================
-- PASO 2: FIX todas las demás tablas
-- ============================================================

-- professionals
DROP POLICY IF EXISTS "Ver profesionales de mi org" ON public.professionals;
DROP POLICY IF EXISTS "Gestionar profesionales de mi org" ON public.professionals;

CREATE POLICY "Ver profesionales de mi org"
  ON public.professionals FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "Gestionar profesionales de mi org"
  ON public.professionals FOR ALL
  USING (is_owner() AND organization_id = get_my_org_id())
  WITH CHECK (is_owner() AND organization_id = get_my_org_id());


-- students
DROP POLICY IF EXISTS "Ver clientes de mi org" ON public.students;
DROP POLICY IF EXISTS "Equipo crea clientes" ON public.students;
DROP POLICY IF EXISTS "Equipo edita clientes" ON public.students;
DROP POLICY IF EXISTS "Dueños borran clientes" ON public.students;
DROP POLICY IF EXISTS "Equipo ve clientes" ON public.students;
DROP POLICY IF EXISTS "Ver clientes propios" ON public.students;
DROP POLICY IF EXISTS "Gestionar clientes" ON public.students;

CREATE POLICY "Ver clientes de mi org"
  ON public.students FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "Equipo crea clientes"
  ON public.students FOR INSERT
  WITH CHECK (organization_id = get_my_org_id());

CREATE POLICY "Equipo edita clientes"
  ON public.students FOR UPDATE
  USING (organization_id = get_my_org_id());

CREATE POLICY "Dueños borran clientes"
  ON public.students FOR DELETE
  USING (is_owner() AND organization_id = get_my_org_id());


-- transactions
DROP POLICY IF EXISTS "Ver transacciones de mi org" ON public.transactions;
DROP POLICY IF EXISTS "Equipo crea transacciones" ON public.transactions;
DROP POLICY IF EXISTS "Owner edita transacciones" ON public.transactions;
DROP POLICY IF EXISTS "Owner elimina transacciones" ON public.transactions;
DROP POLICY IF EXISTS "Editar transacciones (Owner)" ON public.transactions;
DROP POLICY IF EXISTS "Eliminar transacciones (Owner)" ON public.transactions;
DROP POLICY IF EXISTS "Equipo ve transacciones" ON public.transactions;
DROP POLICY IF EXISTS "Ver transacciones propias" ON public.transactions;
DROP POLICY IF EXISTS "Gestionar transacciones" ON public.transactions;

CREATE POLICY "Ver transacciones de mi org"
  ON public.transactions FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "Equipo crea transacciones"
  ON public.transactions FOR INSERT
  WITH CHECK (organization_id = get_my_org_id());

CREATE POLICY "Owner edita transacciones"
  ON public.transactions FOR UPDATE
  USING (is_owner() AND organization_id = get_my_org_id());

CREATE POLICY "Owner elimina transacciones"
  ON public.transactions FOR DELETE
  USING (is_owner() AND organization_id = get_my_org_id());


-- courses
DROP POLICY IF EXISTS "Ver cursos de mi org" ON public.courses;
DROP POLICY IF EXISTS "Owner gestiona cursos" ON public.courses;
DROP POLICY IF EXISTS "Gestionar cursos (Owner)" ON public.courses;
DROP POLICY IF EXISTS "Equipo ve cursos" ON public.courses;
DROP POLICY IF EXISTS "Ver cursos propios" ON public.courses;

CREATE POLICY "Ver cursos de mi org"
  ON public.courses FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "Owner gestiona cursos"
  ON public.courses FOR ALL
  USING (is_owner() AND organization_id = get_my_org_id())
  WITH CHECK (is_owner() AND organization_id = get_my_org_id());


-- enrollments
DROP POLICY IF EXISTS "Ver inscripciones de mi org" ON public.enrollments;
DROP POLICY IF EXISTS "Equipo gestiona inscripciones" ON public.enrollments;
DROP POLICY IF EXISTS "Gestionar inscripciones (Owner/Staff)" ON public.enrollments;
DROP POLICY IF EXISTS "Equipo ve inscripciones" ON public.enrollments;
DROP POLICY IF EXISTS "Ver inscripciones propias" ON public.enrollments;

CREATE POLICY "Ver inscripciones de mi org"
  ON public.enrollments FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "Equipo gestiona inscripciones"
  ON public.enrollments FOR ALL
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());


-- payments
DROP POLICY IF EXISTS "Ver pagos de mi org" ON public.payments;
DROP POLICY IF EXISTS "Equipo gestiona pagos" ON public.payments;
DROP POLICY IF EXISTS "Gestionar pagos (Owner/Staff)" ON public.payments;
DROP POLICY IF EXISTS "Equipo ve pagos" ON public.payments;
DROP POLICY IF EXISTS "Ver pagos propios" ON public.payments;

CREATE POLICY "Ver pagos de mi org"
  ON public.payments FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "Equipo gestiona pagos"
  ON public.payments FOR ALL
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());


-- organization_invitations
DROP POLICY IF EXISTS "Owner gestiona invitaciones" ON public.organization_invitations;
DROP POLICY IF EXISTS "Dueños gestionan invitaciones" ON public.organization_invitations;

CREATE POLICY "Owner gestiona invitaciones"
  ON public.organization_invitations FOR ALL
  USING (is_owner() AND organization_id = get_my_org_id())
  WITH CHECK (is_owner() AND organization_id = get_my_org_id());


-- appointments
DROP POLICY IF EXISTS "Ver citas de mi org" ON public.appointments;
DROP POLICY IF EXISTS "Equipo gestiona citas" ON public.appointments;
DROP POLICY IF EXISTS "Equipo ve citas" ON public.appointments;
DROP POLICY IF EXISTS "Ver citas propias" ON public.appointments;
DROP POLICY IF EXISTS "Gestionar citas" ON public.appointments;

CREATE POLICY "Ver citas de mi org"
  ON public.appointments FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "Equipo gestiona citas"
  ON public.appointments FOR ALL
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());


-- memberships
DROP POLICY IF EXISTS "Ver membresías de mi org" ON public.memberships;
DROP POLICY IF EXISTS "Equipo gestiona membresías" ON public.memberships;
DROP POLICY IF EXISTS "Equipo ve membresías" ON public.memberships;
DROP POLICY IF EXISTS "Ver membresías propias" ON public.memberships;
DROP POLICY IF EXISTS "Gestionar membresías" ON public.memberships;

CREATE POLICY "Ver membresías de mi org"
  ON public.memberships FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "Equipo gestiona membresías"
  ON public.memberships FOR ALL
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());


-- services
DROP POLICY IF EXISTS "Ver servicios de mi org" ON public.services;
DROP POLICY IF EXISTS "Equipo gestiona servicios" ON public.services;
DROP POLICY IF EXISTS "Equipo ve servicios" ON public.services;
DROP POLICY IF EXISTS "Ver servicios propios" ON public.services;
DROP POLICY IF EXISTS "Gestionar servicios propios" ON public.services;

CREATE POLICY "Ver servicios de mi org"
  ON public.services FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "Equipo gestiona servicios"
  ON public.services FOR ALL
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());


-- plans
DROP POLICY IF EXISTS "Ver planes de mi org" ON public.plans;
DROP POLICY IF EXISTS "Equipo gestiona planes" ON public.plans;
DROP POLICY IF EXISTS "Equipo ve planes" ON public.plans;
DROP POLICY IF EXISTS "Ver planes propios" ON public.plans;
DROP POLICY IF EXISTS "Gestionar planes" ON public.plans;

CREATE POLICY "Ver planes de mi org"
  ON public.plans FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "Equipo gestiona planes"
  ON public.plans FOR ALL
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());


-- branch_staff
DROP POLICY IF EXISTS "Ver staff de mi org" ON public.branch_staff;
DROP POLICY IF EXISTS "Equipo gestiona staff" ON public.branch_staff;
DROP POLICY IF EXISTS "Equipo ve branch_staff" ON public.branch_staff;
DROP POLICY IF EXISTS "Ver branch_staff propios" ON public.branch_staff;
DROP POLICY IF EXISTS "Gestionar branch_staff" ON public.branch_staff;

CREATE POLICY "Ver staff de mi org"
  ON public.branch_staff FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "Equipo gestiona staff"
  ON public.branch_staff FOR ALL
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());


-- staff_schedules
DROP POLICY IF EXISTS "Ver horarios de mi org" ON public.staff_schedules;
DROP POLICY IF EXISTS "Equipo gestiona horarios" ON public.staff_schedules;
DROP POLICY IF EXISTS "Equipo ve horarios" ON public.staff_schedules;
DROP POLICY IF EXISTS "Ver horarios propios" ON public.staff_schedules;
DROP POLICY IF EXISTS "Gestionar horarios" ON public.staff_schedules;

CREATE POLICY "Ver horarios de mi org"
  ON public.staff_schedules FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "Equipo gestiona horarios"
  ON public.staff_schedules FOR ALL
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());


-- teacher_reviews
DROP POLICY IF EXISTS "Ver reviews de mi org" ON public.teacher_reviews;
DROP POLICY IF EXISTS "Equipo gestiona reviews" ON public.teacher_reviews;
DROP POLICY IF EXISTS "Equipo ve reviews" ON public.teacher_reviews;
DROP POLICY IF EXISTS "Ver reviews propias" ON public.teacher_reviews;
DROP POLICY IF EXISTS "Gestionar reviews" ON public.teacher_reviews;

CREATE POLICY "Ver reviews de mi org"
  ON public.teacher_reviews FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "Equipo gestiona reviews"
  ON public.teacher_reviews FOR ALL
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());


-- ============================================================
-- ✅ HOTFIX COMPLETO - Idempotente (se puede ejecutar N veces)
-- ============================================================
