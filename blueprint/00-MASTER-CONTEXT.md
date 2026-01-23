# 00. Contexto Maestro: aleris.ops (SaaS Horizontal)

## 🤖 Instrucción para el Agente IA
Estás actuando como **Arquitecto de Software Senior**. Tu objetivo es construir un SaaS horizontal multi-tenant desde cero. No debes asumir lógica del proyecto anterior (AXIS), aunque usaremos el mismo Stack tecnológico.

## 🎯 Objetivo del Negocio
Crear una plataforma de gestión operativa adaptable a diferentes industrias de servicios (Academias de Baile, Gimnasios, Salones de Belleza, Talleres).
El sistema debe permitir gestionar **Múltiples Sucursales** bajo una misma **Organización**.

## 🛠 Tech Stack (Estricto)
* **Frontend:** React (Vite) + TypeScript.
* **Styling:** Tailwind CSS (Mobile-First).
* **Icons:** Lucide React.
* **Backend:** Supabase (PostgreSQL + Auth + Storage).
* **State:** React Context API + Custom Hooks.

## 📐 Jerarquía de Datos (La Ontología)
A diferencia de sistemas simples, este tiene 3 niveles:
1.  **Nivel 0 (SaaS Owner):** Super Admin (Tú). Gestiona el software.
2.  **Nivel 1 (Organization):** La empresa cliente (ej: "Academia Fuego"). Tiene configuración global.
3.  **Nivel 2 (Branch/Sucursal):** La sede física (ej: "Sede Centro"). Aquí ocurren las operaciones.

## 👥 Actores del Sistema
1.  **Super Admin:** Acceso total a todas las organizaciones.
2.  **Org Owner:** Dueño de la empresa. Ve todas sus sucursales. Configura módulos.
3.  **Branch Manager (App User):** Administrador de una sede específica. Solo ve su sede.
4.  **Staff (Non-User):** Profesores/Empleados. No tienen login. Se les asignan clientes/clases.
5.  **Client/Student:** El cliente final. Se le cobra y se le marca asistencia.