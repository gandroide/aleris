# 03. Lista de Tareas Iniciales (Bootstrap)

## 🤖 Instrucción para el Agente IA
Ejecuta estas tareas en orden secuencial. No avances si la anterior falla.

## 🚀 Fase 1: Cimientos
1.  **Init:** Inicializar proyecto Vite + React + TS + Tailwind.
2.  **Supabase Setup:** Generar y ejecutar la migración SQL basada en `01-DATABASE-SCHEMA.md`.
3.  **Auth Context:** Crear `AuthProvider` que no solo recupere el usuario, sino que busque el `organization_id` y `role` del perfil para tenerlos en memoria.

## 🏗 Fase 2: Layouts y Navegación
1.  Crear `AppLayout.tsx`: Sidebar + Header + Área de contenido.
2.  Implementar **Sidebar Dinámico**:
    * Leer `organization.settings`.
    * Si `inventory: false`, no renderizar el botón de inventario.
3.  Implementar el **BranchSelector**: Componente en el header para cambiar de sucursal (solo visible para Owners).

## 👥 Fase 3: CRUDs Básicos
1.  Página de **Staff**: Crear/Editar/Borrar profesores.
2.  Página de **Alumnos**: Lista con indicador visual de estado (Verde=Al día, Rojo=Deuda).