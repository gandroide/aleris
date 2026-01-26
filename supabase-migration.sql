-- ============================================
-- CORE.ops - Database Schema & RLS Policies
-- ============================================
-- Este script crea todas las tablas, relaciones y políticas de seguridad
-- para un sistema multi-tenant con aislamiento completo entre organizaciones.
-- ============================================

-- ============================================
-- 1. TABLAS PRINCIPALES
-- ============================================

-- Tabla: organizations (Entidad raíz)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    industry TEXT NOT NULL CHECK (industry IN ('dance', 'fitness', 'beauty', 'workshop')),
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla: branches (Sedes físicas)
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    timezone TEXT DEFAULT 'America/Mexico_City',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla: profiles (Usuarios con acceso al sistema)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'owner', 'manager', 'receptionist')),
    assigned_branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla: staff (Personal sin acceso - profesores/empleados)
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    specialty TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla: clients (Alumnos/Clientes)
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'debtor')),
    last_payment_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 2. ÍNDICES PARA OPTIMIZACIÓN
-- ============================================

-- Índices para Foreign Keys (mejoran JOINs y RLS policies)
CREATE INDEX IF NOT EXISTS idx_branches_organization_id ON public.branches(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_branch_id ON public.profiles(assigned_branch_id);
CREATE INDEX IF NOT EXISTS idx_staff_branch_id ON public.staff(branch_id);
CREATE INDEX IF NOT EXISTS idx_clients_branch_id ON public.clients(branch_id);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON public.organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);

-- ============================================
-- 3. FUNCIONES AUXILIARES PARA RLS
-- ============================================

-- Función: Verifica si el usuario es super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid())
        AND role = 'super_admin'
    );
$$;

-- Función: Obtiene el organization_id del usuario actual (si es owner)
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT organization_id FROM public.organizations
    WHERE owner_id = (SELECT auth.uid())
    LIMIT 1;
$$;

-- Función: Verifica si el usuario tiene acceso a una organización
CREATE OR REPLACE FUNCTION public.has_organization_access(org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT 
        (SELECT is_super_admin()) OR
        EXISTS (
            SELECT 1 FROM public.organizations
            WHERE id = org_id
            AND owner_id = (SELECT auth.uid())
        );
$$;

-- Función: Verifica si el usuario tiene acceso a una branch
CREATE OR REPLACE FUNCTION public.has_branch_access(branch_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT 
        (SELECT is_super_admin()) OR
        EXISTS (
            SELECT 1 FROM public.branches b
            INNER JOIN public.organizations o ON b.organization_id = o.id
            WHERE b.id = branch_id
            AND (
                o.owner_id = (SELECT auth.uid()) OR
                EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = (SELECT auth.uid())
                    AND p.assigned_branch_id = branch_id
                )
            )
        );
$$;

-- ============================================
-- 4. HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. POLÍTICAS RLS: ORGANIZATIONS
-- ============================================

-- Super Admin: Acceso total
CREATE POLICY "super_admin_all_organizations"
ON public.organizations
FOR ALL
TO authenticated
USING ((SELECT is_super_admin()))
WITH CHECK ((SELECT is_super_admin()));

-- Owner: Puede ver/editar solo su organización
CREATE POLICY "owner_own_organization"
ON public.organizations
FOR ALL
TO authenticated
USING (owner_id = (SELECT auth.uid()))
WITH CHECK (owner_id = (SELECT auth.uid()));

-- Manager/Receptionist: Pueden ver su organización (solo lectura)
CREATE POLICY "staff_view_organization"
ON public.organizations
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.branches b
        INNER JOIN public.profiles p ON p.assigned_branch_id = b.id
        WHERE b.organization_id = organizations.id
        AND p.id = (SELECT auth.uid())
    )
);

-- ============================================
-- 6. POLÍTICAS RLS: BRANCHES
-- ============================================

-- Super Admin: Acceso total
CREATE POLICY "super_admin_all_branches"
ON public.branches
FOR ALL
TO authenticated
USING ((SELECT is_super_admin()))
WITH CHECK ((SELECT is_super_admin()));

-- Owner: Puede ver/editar todas las branches de su organización
CREATE POLICY "owner_organization_branches"
ON public.branches
FOR ALL
TO authenticated
USING ((SELECT has_organization_access(organization_id)))
WITH CHECK ((SELECT has_organization_access(organization_id)));

-- Manager: Puede ver/editar solo su branch asignada
CREATE POLICY "manager_own_branch"
ON public.branches
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid())
        AND assigned_branch_id = branches.id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid())
        AND assigned_branch_id = branches.id
    )
);

-- Receptionist: Solo lectura de su branch
CREATE POLICY "receptionist_view_branch"
ON public.branches
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid())
        AND role = 'receptionist'
        AND assigned_branch_id = branches.id
    )
);

-- ============================================
-- 7. POLÍTICAS RLS: PROFILES
-- ============================================

-- Super Admin: Acceso total
CREATE POLICY "super_admin_all_profiles"
ON public.profiles
FOR ALL
TO authenticated
USING ((SELECT is_super_admin()))
WITH CHECK ((SELECT is_super_admin()));

-- Usuario puede ver su propio perfil
CREATE POLICY "user_own_profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = (SELECT auth.uid()));

-- Owner: Puede ver/editar perfiles de su organización
CREATE POLICY "owner_organization_profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (
    (SELECT is_super_admin()) OR
    EXISTS (
        SELECT 1 FROM public.organizations
        WHERE owner_id = (SELECT auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.branches
            WHERE organization_id = organizations.id
            AND (
                branches.id = profiles.assigned_branch_id OR
                profiles.assigned_branch_id IS NULL
            )
        )
    )
)
WITH CHECK (
    (SELECT is_super_admin()) OR
    EXISTS (
        SELECT 1 FROM public.organizations
        WHERE owner_id = (SELECT auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.branches
            WHERE organization_id = organizations.id
            AND (
                branches.id = profiles.assigned_branch_id OR
                profiles.assigned_branch_id IS NULL
            )
        )
    )
);

-- Manager: Puede ver perfiles de su branch
CREATE POLICY "manager_branch_profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
        AND p.assigned_branch_id = profiles.assigned_branch_id
    )
);

-- ============================================
-- 8. POLÍTICAS RLS: STAFF
-- ============================================

-- Super Admin: Acceso total
CREATE POLICY "super_admin_all_staff"
ON public.staff
FOR ALL
TO authenticated
USING ((SELECT is_super_admin()))
WITH CHECK ((SELECT is_super_admin()));

-- Owner: Puede ver/editar staff de todas sus branches
CREATE POLICY "owner_organization_staff"
ON public.staff
FOR ALL
TO authenticated
USING ((SELECT has_branch_access(branch_id)))
WITH CHECK ((SELECT has_branch_access(branch_id)));

-- Manager: Puede ver/editar staff de su branch
CREATE POLICY "manager_branch_staff"
ON public.staff
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid())
        AND assigned_branch_id = staff.branch_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid())
        AND assigned_branch_id = staff.branch_id
    )
);

-- Receptionist: Solo lectura de staff de su branch
CREATE POLICY "receptionist_view_staff"
ON public.staff
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid())
        AND role = 'receptionist'
        AND assigned_branch_id = staff.branch_id
    )
);

-- ============================================
-- 9. POLÍTICAS RLS: CLIENTS
-- ============================================

-- Super Admin: Acceso total
CREATE POLICY "super_admin_all_clients"
ON public.clients
FOR ALL
TO authenticated
USING ((SELECT is_super_admin()))
WITH CHECK ((SELECT is_super_admin()));

-- Owner: Puede ver/editar clientes de todas sus branches
CREATE POLICY "owner_organization_clients"
ON public.clients
FOR ALL
TO authenticated
USING ((SELECT has_branch_access(branch_id)))
WITH CHECK ((SELECT has_branch_access(branch_id)));

-- Manager: Puede ver/editar clientes de su branch
CREATE POLICY "manager_branch_clients"
ON public.clients
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid())
        AND assigned_branch_id = clients.branch_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid())
        AND assigned_branch_id = clients.branch_id
    )
);

-- Receptionist: Puede ver/editar clientes de su branch
CREATE POLICY "receptionist_branch_clients"
ON public.clients
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid())
        AND role = 'receptionist'
        AND assigned_branch_id = clients.branch_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid())
        AND role = 'receptionist'
        AND assigned_branch_id = clients.branch_id
    )
);

-- ============================================
-- 10. TRIGGERS PARA updated_at
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Aplicar trigger a todas las tablas
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_branches_updated_at
    BEFORE UPDATE ON public.branches
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_updated_at
    BEFORE UPDATE ON public.staff
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- Verificación: Ejecuta este script en el SQL Editor de Supabase
-- Asegúrate de que todas las políticas se crearon correctamente
-- ============================================

