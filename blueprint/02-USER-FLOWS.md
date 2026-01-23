# 02. Flujos Críticos de Usuario

## 🤖 Instrucción para el Agente IA
Usa estos flujos para construir las páginas y la lógica de redirección (`react-router-dom`).

## 🔄 Flujo A: Onboarding (Nuevo Cliente SaaS)
Este es el momento más importante.
1.  **Registro (`/signup`):** Email + Password. Trigger crea `profile`.
2.  **Wizard Paso 1:** "¿Cómo se llama tu negocio?" -> Crea `organization`.
3.  **Wizard Paso 2:** "¿A qué industria perteneces?" (Select: Academia, Salud, Belleza) -> Configura `settings` JSONB.
4.  **Wizard Paso 3:** "Crea tu primera sede" -> Crea `branch`.
5.  **Final:** Redirigir a `/dashboard`.

## 🏢 Flujo B: Dashboard Multi-Vista
1.  El sistema detecta el rol del usuario.
2.  **Si es Owner:**
    * Muestra un Dropdown en el Header: "Todas las sedes" (Default) | "Sede A" | "Sede B".
    * Si selecciona "Todas", muestra métricas agregadas (Total Ventas Global).
3.  **Si es Manager:**
    * No ve el Dropdown. Solo ve los datos de su `assigned_branch_id`.

## 🎓 Flujo C: Gestión Académica (Ejemplo Industria Danza)
Si `organization.industry === 'dance'`:
1.  Ocultar módulo "Inventario".
2.  Mostrar módulo "Alumnos".
3.  Al crear un cobro (`transaction`), solicitar:
    * Alumno (Select from `clients`)
    * Profesor (Select from `staff`)
    * Concepto (Mensualidad, Clase suelta).