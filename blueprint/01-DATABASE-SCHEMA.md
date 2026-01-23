# 01. Esquema de Base de Datos y RLS

## 🤖 Instrucción para el Agente IA
Genera un script SQL para Supabase que cree las siguientes tablas. Asegúrate de habilitar RLS (Row Level Security) inmediatamente.

## 📋 Tablas Principales

### 1. `public.organizations`
Entidad raíz.
* `id` (uuid, PK)
* `owner_id` (uuid, FK -> auth.users): El usuario que paga.
* `name` (text): "Academia Fuego".
* `industry` (text): 'dance', 'fitness', 'beauty'.
* `settings` (jsonb): Configuración de módulos activos `{ "inventory": false, "classes": true }`.

### 2. `public.branches`
Sedes físicas.
* `id` (uuid, PK)
* `organization_id` (uuid, FK -> organizations)
* `name` (text): "Sede Norte".
* `address` (text).
* `timezone` (text).

### 3. `public.profiles` (Usuarios con Acceso)
Personas que hacen login en la App.
* `id` (uuid, PK, FK -> auth.users)
* `email` (text)
* `full_name` (text)
* `role` (text): 'super_admin', 'owner', 'manager', 'receptionist'.
* `assigned_branch_id` (uuid, nullable): Si es NULL y es owner, ve todo. Si tiene ID, solo ve esa branch.

### 4. `public.staff` (Personal sin Acceso)
Profesores o empleados operativos.
* `id` (uuid, PK)
* `branch_id` (uuid, FK -> branches)
* `name` (text): "Profesor Carlos".
* `specialty` (text): "Salsa", "Bachata".
* `is_active` (bool).

### 5. `public.clients` (Alumnos)
* `id` (uuid, PK)
* `branch_id` (uuid, FK -> branches)
* `full_name` (text)
* `phone` (text)
* `status` (text): 'active', 'inactive', 'debtor'.
* `last_payment_date` (date).

## 🔒 Reglas de Seguridad (RLS Policies)
1.  **Super Admin:** `true` para todo.
2.  **Owner:** Puede ver/editar todo donde `organization.owner_id == auth.uid()`.
3.  **Manager:** Puede ver/editar todo donde `branch_id == profiles.assigned_branch_id`.