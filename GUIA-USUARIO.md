# 📱 ALERIS.ops - Guía del Usuario

**Sistema Operativo para Gestión de Academias y Centros Educativos**

---

## 🎯 ¿Qué es ALERIS.ops?

ALERIS.ops es una **aplicación web progresiva (PWA)** diseñada para facilitar la gestión completa de academias, escuelas de danza, gimnasios, y cualquier centro que necesite administrar:

- 👥 Clientes y alumnos
- 🧑‍💼 Personal y staff
- 📅 Agenda y citas
- 💰 Finanzas y pagos
- 📊 Reportes y estadísticas

**Ventajas principales:**
- ✅ Acceso desde cualquier dispositivo (móvil, tablet, computadora)
- ✅ Funciona sin conexión (PWA instalable)
- ✅ Gestión multi-sede
- ✅ Sistema de roles y permisos
- ✅ Interfaz moderna y rápida

---

## 👥 Roles y Permisos

ALERIS.ops maneja 4 tipos de usuarios con diferentes niveles de acceso:

### 1. 👑 Super Admin
**Acceso total al sistema**

- Gestiona múltiples organizaciones
- Monitorea suscripciones
- Administra planes globales
- Visualiza estadísticas generales

**¿Quién es?** Administrador principal de ALERIS (nivel plataforma)

---

### 2. 🏢 Owner (Propietario/Gerente)
**Control total de su organización**

- Dashboard gerencial con métricas clave
- Gestión completa de clientes
- Administración de todo el staff
- Control de finanzas y tesorería
- Creación y edición de servicios
- Gestión de múltiples sucursales
- Reportes avanzados

**¿Quién es?** Dueño o director de la academia

**Acceso:**
- ✅ Todas las sedes
- ✅ Todos los módulos
- ✅ Configuración general

---

### 3. 🧑‍💼 Staff (Personal Administrativo)
**Operaciones del día a día**

- Dashboard operativo
- Gestión de clientes asignados
- Agenda y calendario
- Registro de pagos
- Acceso limitado a su(s) sede(s)

**¿Quién es?** Recepcionista, coordinador, asistente administrativo

**Acceso:**
- ✅ Clientes de su sede
- ✅ Agenda y calendario
- ✅ Módulo de finanzas (registro de pagos)
- ⚠️ No puede ver nómina completa
- ⚠️ Limitado a su(s) sede(s) asignada(s)

---

### 4. 👨‍🏫 Teacher (Profesor/Instructor)
**Acceso a su horario y alumnos**

- Visualización de clases asignadas
- Lista de alumnos
- Horarios personales

**¿Quién es?** Profesor, instructor, entrenador

**Acceso:**
- ✅ Sus clases programadas
- ✅ Sus alumnos
- ⚠️ No acceso a finanzas
- ⚠️ No gestión administrativa

---

## 🚀 Primeros Pasos

### 1️⃣ Registro e Inicio de Sesión

**Página de Login:** `/login`

1. **Si eres nuevo:** 
   - Click en "Crear cuenta"
   - Ingresa tu correo y contraseña
   - Completa tu nombre y el nombre de tu organización
   - ✅ Tu cuenta de Owner se crea automáticamente

2. **Si te invitaron:**
   - Regístrate con el mismo correo de la invitación
   - Automáticamente serás asignado a la organización
   - Tu rol será el definido en la invitación

3. **Si ya tienes cuenta:**
   - Ingresa correo y contraseña
   - Click en "Iniciar Sesión"

---

### 2️⃣ Instalación como App

ALERIS.ops puede instalarse como una aplicación nativa:

**En Móvil (iOS/Android):**
1. Abre ALERIS en tu navegador
2. Busca el botón "Agregar a pantalla de inicio"
3. Confirma la instalación
4. ✅ Icono en tu pantalla principal

**En Escritorio (Chrome/Edge):**
1. Click en el icono de instalación en la barra de direcciones
2. "Instalar ALERIS.ops"
3. ✅ Aplicación en tu sistema

**Beneficios:**
- 🚀 Carga más rápida
- 📱 Funciona offline
- 🔔 Notificaciones push (futuro)

---

## 📊 Dashboard Principal

**Página:** `/dashboard`

El dashboard es tu centro de control. Lo que ves depende de tu rol:

### Dashboard Owner (Gerencial)

**Métricas Principales:**

1. **📊 Alumnos Activos**
   - Número total de estudiantes
   - Crecimiento mensual
   - Click para ver detalle

2. **💰 Tasa de Solvencia**
   - % de alumnos al día con pagos
   - Indicador de salud financiera
   - Verde = Bueno (>80%), Amarillo = Atención (<80%), Rojo = Crítico (<60%)

3. **📅 Clases para Hoy**
   - Citas programadas del día
   - Próxima clase destacada
   - Click para ir al calendario

4. **👥 Staff Operativo**
   - Número de empleados
   - Incluye staff + profesores externos

**Widgets Interactivos:**

- **Agenda del Día:** Resumen de clases, próxima sesión, horarios
- **Finanzas del Mes:** 
  - Ingresos totales
  - Nómina estimada
  - Click para ir a Tesorería

**Sistema en Tiempo Real:**
- 🔄 Actualización automática cada 30 segundos
- 💾 Datos en caché para carga instantánea

---

### Dashboard Staff (Operativo)

Similar al Owner pero con datos filtrados de tu sede asignada:

- Solo ves alumnos de tu sucursal
- Solo clases de tu agenda
- No ves nómina completa

---

## 👥 Módulo: Clientes

**Página:** `/clients`

Gestiona toda tu base de alumnos con expedientes digitales completos.

### Vista Principal

**Lista de Clientes:**
- Cards visuales con foto de perfil
- Indicador de solvencia (verde/rojo/gris)
- Información de contacto
- Búsqueda en tiempo real

**Barra de Búsqueda:**
- Busca por nombre o apellido
- Filtrado instantáneo
- Sin necesidad de dar Enter

---

### Crear Nuevo Cliente

**Botón:** "Nuevo Cliente" (superior derecha)

**Formulario:**
1. Nombre (obligatorio)
2. Apellido (obligatorio)
3. Email (opcional)
4. Teléfono (opcional)
5. Notas internas

**Tip:** Los datos de contacto se usan para acciones rápidas (WhatsApp, Email)

---

### Expediente Digital del Cliente

**Click en cualquier cliente para abrir su ficha completa**

#### 📋 Tab 1: Perfil

**Información Personal:**
- Email y teléfono
- Dirección
- Fecha de nacimiento

**Acciones Rápidas:**
- 📧 Enviar Email (click directo)
- 📱 WhatsApp (abre chat directo)

**Notas Privadas:**
- Campo de texto libre
- Visible solo para staff/owner
- Útil para recordatorios, observaciones, historial
- **Importante:** Click "GUARDAR" para persistir cambios

---

#### 👑 Tab 2: Membresía

**Plan(es) Activo(s):**

Si el alumno tiene membresía activa, verás:

1. **Tarjeta de Plan:**
   - Nombre del plan
   - Fecha de inicio
   - Fecha de vencimiento
   - Días restantes (con código de color)
   - Clases usadas / Total permitidas

2. **Barra de Progreso:**
   - Visual del tiempo restante
   - Verde = Vigente
   - Amarillo = Próximo a vencer (<5 días)
   - Rojo = Vencido

**Multi-Plan:**
- Un alumno puede tener múltiples planes activos simultáneamente
- Ej: Plan de Salsa + Plan de Gym

**Sin Plan:**
- Mensaje: "No tiene planes activos"
- Botón directo a Tesorería para vender plan

---

#### 💳 Tab 3: Historial

**Últimas 10 Transacciones:**
- Pagos realizados
- Fecha y hora
- Concepto (pago de mensualidad, matrícula, etc.)
- Monto
- Ordenado por más reciente

**Sin movimientos:**
- Mensaje: "Sin movimientos recientes"

---

### Estados de Solvencia

Los clientes se clasifican automáticamente:

1. **🟢 Solvente:**
   - Tiene al menos un plan activo vigente
   - Badge verde en el card

2. **🔴 Moroso:**
   - Tuvo planes pero todos están vencidos
   - Badge rojo en el card
   - Requiere atención

3. **⚪ Sin Pagos:**
   - Nunca ha tenido membresía
   - Cliente prospecto o en proceso
   - Badge gris

---

## 🧑‍💼 Módulo: Equipo y Staff

**Página:** `/staff`

Administra todo tu personal: empleados internos y profesores externos.

### Vista Principal

**Cards de Staff:**
- Avatar con inicial del nombre
- Nombre completo
- Especialidad (ej: Salsa, Yoga, etc.)
- Rating promedio (⭐)
- Número de sedes asignadas
- Badge "EXT" si es profesional externo
- Badge de Owner destacado

**Búsqueda:**
- Busca por nombre
- Filtrado instantáneo

---

### Agregar Nuevo Miembro

**Botón:** "Nuevo Miembro"

ALERIS te ofrece **2 formas** de agregar personal, según si usarán la app o no:

---

#### 👤 OPCIÓN 1: Profesor Externo (Recomendado para instructores)

**¿Cuándo usar?**
- Profesores que solo darán clases
- NO necesitan acceso a la app
- Solo quieres asignarlos a horarios

**Datos necesarios:**
1. ✅ Nombre (obligatorio)
2. ✅ Apellido (obligatorio)
3. Especialidad (opcional) - Ej: "Salsa", "Yoga"
4. Teléfono (opcional) - Para contacto
5. Email (opcional) - Solo para contacto, NO se envía invitación

**Pasos:**
1. Click "Nuevo Miembro"
2. Por defecto viene seleccionado "Profesor Externo"
3. Completa nombre y apellido
4. (Opcional) Agrega especialidad, teléfono, email
5. Click "✓ Agregar Profesor"
6. ✅ ¡Listo! Ya aparece en tu lista de staff

**Ventajas:**
- ⚡ Inmediato (sin esperar registro)
- 🎯 Simple (solo nombre)
- 💼 Ideal para profesores freelance

---

#### 📧 OPCIÓN 2: Staff con Acceso (Para personal administrativo)

**¿Cuándo usar?**
- Personal que necesita usar ALERIS
- Recepcionistas, coordinadores
- Profesores que quieren ver su agenda

**Datos necesarios:**
1. ✅ Email (obligatorio)
2. ✅ Rol en la app:
   - Staff Administrativo
   - Profesor con Acceso

**Pasos:**
1. Click "Nuevo Miembro"
2. Selecciona "Staff con Acceso"
3. Ingresa email del empleado
4. Selecciona rol
5. Click "📧 Enviar Invitación"
6. ⏳ Espera a que la persona se registre

**¿Cómo funciona?**
- El email queda registrado en el sistema
- Cuando esa persona se registre en ALERIS con ese email
- Automáticamente será asignado a tu organización con el rol definido
- ✅ No necesita código de invitación complejo

---

### 💡 Comparación Rápida

| Característica | Profesor Externo | Staff con Acceso |
|----------------|------------------|------------------|
| **Registro** | Inmediato | Debe registrarse |
| **Email** | Opcional | Obligatorio |
| **Acceso a app** | ❌ No | ✅ Sí |
| **Puede ver agenda** | ❌ No | ✅ Sí |
| **Asignable a clases** | ✅ Sí | ✅ Sí |
| **Gestiona clientes** | ❌ No | ✅ Sí (si es staff) |
| **Ideal para** | Instructores externos | Personal de planta |

---

### 🎯 Ejemplo de Uso Real

**Caso: Academia de Danza**

**Profesores Externos:**
- Juan Pérez (Salsa)
- María González (Bachata)
- Pedro Rodríguez (Merengue)
- ➡️ Usa "Profesor Externo" para todos

**Staff con Acceso:**
- Ana López (Recepcionista) → Necesita ver pagos y agenda
- Carlos Ruiz (Coordinador) → Necesita gestionar todo
- ➡️ Usa "Staff con Acceso" para estos

---

### Ficha del Empleado

**Click en cualquier miembro del staff para ver su perfil completo**

#### 📋 Tab 1: Perfil

**Información Profesional:**
- Especialidad (editable)
- Teléfono (editable)

**Información Financiera:**
- 💵 Salario Base
- 📊 % Comisión (0.10 = 10%)

**Botón:** "Guardar Perfil" para actualizar cambios

**Tip:** Los campos numéricos solo aceptan números

---

#### 🏢 Tab 2: Sucursales

**Sucursales Asignadas:**
- Lista de sedes donde trabaja
- Botón de eliminar (🗑️) por sucursal

**Asignar Nueva Sucursal:**
- Dropdown con todas tus sedes
- Selecciona y asigna instantáneamente

**Multi-Sede:**
- Un empleado puede trabajar en múltiples sucursales
- Útil para staff móvil o profesores con varias sedes

---

#### ⏰ Tab 3: Horario

**Solo para Staff Interno** (profesionales externos no usan horarios fijos)

**Configuración de Horario Semanal:**

1. **Selector de Sede:**
   - El horario es por sucursal
   - Cambia la sede para ver/editar horario específico

2. **Días de la Semana:**
   - Checkbox para activar/desactivar día
   - Si está activo:
     - Hora de inicio (input tipo time)
     - Hora de fin (input tipo time)

3. **Guardar Horario:**
   - Click "Guardar Horario"
   - Se sobrescribe el horario anterior
   - ✅ Confirmación con toast

**Ejemplo de Uso:**
```
Lunes:    ✅ 09:00 - 18:00
Martes:   ✅ 09:00 - 18:00
Miércoles: ✅ 09:00 - 13:00
Jueves:   ✅ 09:00 - 18:00
Viernes:  ✅ 09:00 - 18:00
Sábado:   ❌ (día libre)
Domingo:  ❌ (día libre)
```

---

#### 📅 Tab 4: Clases

**Próximas 5 Clases Programadas:**
- Nombre del servicio
- Fecha y hora completa
- Ordenadas cronológicamente

**Sin Clases:**
- "Agenda libre"
- Botón para programar nueva clase

**Botón:** "Programar Nueva" → Redirige a `/agenda`

---

#### 👥 Tab 5: Alumnos

**Grid de Alumnos:**
- Todos los estudiantes que han tenido clase con este profesor
- Muestra hasta 50 alumnos
- Avatar + Nombre completo

**Útil para:**
- Ver el alcance del profesor
- Identificar relación alumno-profesor

---

#### ⭐ Tab 6: Reviews

**Solo para Staff Interno**

**Evaluaciones del Profesor:**
- Rating con estrellas (1-5)
- Comentario del alumno
- Fecha de la evaluación

**Sin Evaluaciones:**
- "Sin evaluaciones registradas"

---

## 📅 Módulo: Calendario y Agenda

**Página:** `/calendar`

Gestiona todas las citas, clases y eventos de tu academia.

**Estado:** 🚧 En desarrollo

**Características Planeadas:**
- Vista de calendario mensual/semanal/diaria
- Crear citas asignando:
  - Cliente
  - Profesor
  - Servicio
  - Horario
  - Sala/Espacio
- Drag & drop para mover citas
- Códigos de color por tipo de servicio
- Filtros por profesor, sede, servicio
- Vista de disponibilidad

---

## 💰 Módulo: Finanzas y Tesorería

**Página:** `/finance`

Control total de ingresos, pagos y transacciones.

### Funcionalidades Principales

1. **Registro de Pagos:**
   - Seleccionar alumno
   - Seleccionar plan/servicio
   - Monto
   - Método de pago (efectivo, tarjeta, transferencia)
   - Concepto

2. **Venta de Membresías:**
   - Crear planes (nombre, duración, precio, clases incluidas)
   - Asignar plan a cliente
   - Activación automática

3. **Dashboard Financiero:**
   - Ingresos del mes
   - Gastos (nómina)
   - Balance neto
   - Gráficos de tendencias

4. **Historial de Transacciones:**
   - Todas las transacciones
   - Filtros por fecha, tipo, alumno
   - Exportación a Excel/PDF

5. **Reportes:**
   - Reporte de ingresos por servicio
   - Reporte de solvencia
   - Proyección de ingresos

**Estado:** 🚧 En desarrollo avanzado

---

## 🎓 Módulo: Servicios

**Página:** `/services`

Define y gestiona los servicios que ofrece tu academia.

### Tipos de Servicios

1. **Clases Grupales:**
   - Salsa, Bachata, Yoga, etc.
   - Cupo máximo de alumnos

2. **Clases Personales:**
   - 1 a 1
   - Profesor específico

3. **Talleres/Eventos:**
   - Eventos especiales
   - Fecha única

### Gestión de Servicios

**Crear Servicio:**
- Nombre
- Descripción
- Duración (minutos)
- Precio base
- Profesor(es) asignado(s)
- Sala/Espacio

**Editar/Eliminar:**
- Click en servicio → Editar
- Eliminar con confirmación

**Estado:** 🚧 En desarrollo

---

## ⚙️ Módulo: Configuración

**Página:** `/settings`

Configuración general de tu organización.

### Secciones

1. **Perfil de Organización:**
   - Nombre de la academia
   - Logo
   - Información de contacto
   - Redes sociales

2. **Sucursales:**
   - Crear/editar sedes
   - Dirección, teléfono, horarios
   - Responsable de sede

3. **Configuración de Facturación:**
   - Datos fiscales
   - Métodos de pago aceptados
   - Configuración de recibos

4. **Preferencias:**
   - Zona horaria
   - Moneda
   - Idioma

5. **Notificaciones:**
   - Email de recordatorios
   - WhatsApp Business (integración)

**Estado:** 🚧 En desarrollo

---

## 🏢 Panel de Super Admin

**Solo para Super Admins**

**Página:** `/admin/organizations`

### Dashboard Admin

**Métricas Globales:**
- Total de organizaciones
- Usuarios activos
- Suscripciones activas
- Ingresos totales

### Gestión de Organizaciones

**Lista de Todas las Academias:**
- Nombre de organización
- Owner
- Plan de suscripción
- Estado (activa/inactiva)
- Fecha de creación

**Acciones:**
- Ver detalles completos
- Editar organización
- Suspender/Activar cuenta

### Detalles de Organización

**Click en cualquier organización → Ver detalles**

- Información completa
- Historial de pagos de suscripción
- Número de usuarios
- Estadísticas de uso
- Logs de actividad

---

## 🎨 Características de la Interfaz

### Diseño Dark Mode

ALERIS usa una paleta oscura profesional:

- **Fondo principal:** Zinc-950 (negro profundo)
- **Cards:** Zinc-900 (negro suave)
- **Acentos:** Indigo-500 (azul violeta)
- **Éxito:** Emerald-500 (verde)
- **Error:** Red-500 (rojo)
- **Advertencia:** Amber-500 (amarillo)

### Animaciones y Transiciones

**Cards con Hover:**
- Efecto de elevación
- Cambio de borde
- Gradiente sutil
- Duración: 300ms

**Entrada de Elementos:**
- Fade in + slide from bottom
- Escalonado (cada item 50ms después)
- Suave y profesional

### Skeletons de Carga

Mientras cargan los datos, ALERIS muestra "skeletons" animados:
- Placeholder con forma del contenido final
- Efecto shimmer (brillo)
- Sin pantallas en blanco

### Toasts de Notificación

**Feedback Instantáneo:**
- 🟢 Éxito: Verde con check
- 🔴 Error: Rojo con alerta
- 🔵 Info: Azul con información
- Duración: 3 segundos
- Posición: Superior derecha
- Deslizables para cerrar

---

## 📱 Experiencia Móvil

### Navbar Móvil

**En pantallas pequeñas (<768px):**
- Barra de navegación inferior fija
- 5 iconos principales:
  - Dashboard
  - Clientes
  - Calendario
  - Finanzas
  - Menú (más opciones)

**Drawer Lateral:**
- Swipe desde la izquierda
- Menú completo con avatar
- Logout en la parte inferior

### Responsive Design

**Breakpoints:**
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

**Adaptaciones:**
- Cards en 1 columna (móvil)
- Cards en 2 columnas (tablet)
- Cards en 3-4 columnas (desktop)
- Formularios con inputs grandes
- Botones optimizados para touch

---

## 🔒 Seguridad y Privacidad

### Autenticación

- **Sistema:** Supabase Auth
- **Métodos:** Email + Password
- **Sesiones:** JWT con refresh token
- **Duración:** 7 días (renovable)
- **Logout:** Manual o automático

### Protección de Rutas

**Middleware de Protección:**
- Rutas públicas: `/login`, `/signup`
- Rutas privadas: Todo lo demás
- Redirección automática si no autenticado
- Verificación de rol en rutas sensibles

### Permisos por Rol

**Nivel de Base de Datos:**
- Row Level Security (RLS) activo
- Políticas por tabla
- Usuarios solo ven datos de su organización
- Staff solo ve datos de sus sedes

**Nivel de Aplicación:**
- Validación de rol en frontend
- Rutas condicionales según permiso
- Botones ocultos si no tienes acceso

### Privacidad de Datos

- **Encriptación:** HTTPS obligatorio
- **Passwords:** Hasheados con bcrypt
- **PII:** Protegida con RLS
- **Backups:** Automáticos diarios
- **Compliance:** GDPR ready

---

## ⚡ Performance y Optimización

### Velocidad de Carga

**Optimizaciones Implementadas:**
- ✅ Code-splitting por rutas
- ✅ Lazy loading de páginas
- ✅ Queries paralelizadas
- ✅ Caché inteligente con SWR
- ✅ Memoización de componentes
- ✅ Bundle size reducido -57%

**Resultados:**
- First Contentful Paint: ~0.8s
- Time to Interactive: ~1.5s
- Largest Contentful Paint: ~1.2s

### Caché y Offline

**Estrategia de Caché:**
- Datos de usuario: 30 segundos
- Listados: 5 segundos
- Configuración: 5 minutos
- Assets estáticos: Permanente

**Modo Offline:**
- Service Worker activo
- Assets críticos precacheados
- Fallback pages
- Sync cuando vuelva conexión

---

## 🔧 Solución de Problemas Comunes

### "No puedo iniciar sesión"

**Posibles causas:**
1. Email o contraseña incorrectos
   - ✅ Verifica mayúsculas/minúsculas
   - ✅ Usa "Olvidé contraseña" si es necesario

2. Cuenta no verificada
   - ✅ Revisa tu email (incluso spam)
   - ✅ Click en link de verificación

3. Cuenta suspendida
   - ✅ Contacta a soporte

### "No veo datos en el Dashboard"

**Posibles causas:**
1. Primera vez usando la app
   - ✅ Normal, agrega clientes primero
   - ✅ Dashboard se poblará con uso

2. Filtros activos
   - ✅ Verifica si hay filtro por sede
   - ✅ Remueve filtros

3. Problemas de conexión
   - ✅ Verifica internet
   - ✅ Recarga página

### "La app está lenta"

**Soluciones:**
1. Limpia caché del navegador
2. Cierra tabs innecesarias
3. Actualiza la app (si está instalada)
4. Verifica tu conexión a internet

### "No puedo crear clientes/staff"

**Posibles causas:**
1. No tienes permisos
   - ✅ Debes ser Owner o Admin
   - ✅ Staff no puede crear usuarios

2. Campos obligatorios vacíos
   - ✅ Nombre y apellido son requeridos
   - ✅ Revisa validaciones en rojo

3. Email duplicado
   - ✅ El email debe ser único
   - ✅ Usa otro email

---

## 📞 Soporte y Ayuda

### Recursos Disponibles

1. **Esta Guía**
   - Documento completo de referencia
   - Actualizado con cada versión

2. **Tooltips en la App**
   - Hover sobre iconos "?"
   - Mensajes de ayuda contextual

3. **Mensajes de Error Descriptivos**
   - La app te dice qué hacer
   - Instrucciones claras

### Contacto

**Email de Soporte:** soporte@aleris.ops  
**Horario:** Lunes a Viernes, 9am - 6pm  
**Respuesta:** Máximo 24 horas hábiles

---

## 🚀 Próximas Características

### En Desarrollo (Q1 2026)

1. **Calendario Completo**
   - Agenda visual
   - Drag & drop
   - Recordatorios automáticos

2. **Reportes Avanzados**
   - Exportación PDF/Excel
   - Gráficos personalizables
   - Dashboard personalizable

3. **Integraciones**
   - WhatsApp Business API
   - Pagos en línea (Stripe)
   - Facturación electrónica

### Planeado (Q2-Q3 2026)

4. **App Móvil Nativa**
   - iOS y Android
   - Push notifications
   - Mejor rendimiento

5. **Portal del Alumno**
   - Los clientes acceden a su perfil
   - Ven sus clases
   - Pagan en línea

6. **Marketing Automation**
   - Emails automáticos
   - Campañas de reactivación
   - SMS masivos

---

## 📊 Glosario de Términos

- **PWA:** Progressive Web App - Aplicación web que funciona como nativa
- **Owner:** Propietario o gerente de la academia
- **Staff:** Personal administrativo
- **Teacher:** Profesor o instructor
- **Membresía:** Plan activo de un alumno
- **Solvente:** Alumno con plan vigente
- **Moroso:** Alumno con plan vencido
- **RLS:** Row Level Security - Seguridad a nivel de fila en base de datos
- **JWT:** JSON Web Token - Token de autenticación
- **SWR:** Stale-While-Revalidate - Librería de caché
- **Toast:** Notificación temporal en pantalla
- **Skeleton:** Placeholder animado mientras carga contenido

---

## ✅ Checklist del Usuario Nuevo

### Primera Sesión (Owner)

- [ ] Registrar cuenta con email corporativo
- [ ] Completar perfil de organización en Configuración
- [ ] Crear al menos una sucursal
- [ ] Agregar 3-5 clientes de prueba
- [ ] Invitar tu primer staff member
- [ ] Crear 2-3 servicios básicos
- [ ] Explorar el dashboard
- [ ] Instalar app en tu dispositivo

### Primera Semana

- [ ] Migrar base de clientes existente
- [ ] Configurar staff completo
- [ ] Definir todos los servicios
- [ ] Configurar horarios de staff
- [ ] Realizar primeros registros de pago
- [ ] Familiarizarte con reportes

### Primer Mes

- [ ] Análisis de uso y adopción
- [ ] Identificar mejoras en workflows
- [ ] Capacitar a todo el equipo
- [ ] Explorar funciones avanzadas
- [ ] Feedback a equipo de ALERIS

---

## 🎓 Tips y Mejores Prácticas

### Para Owners

1. **Organización:**
   - Usa las notas privadas en perfiles de clientes
   - Mantén actualizado el estado de membresías
   - Revisa dashboard diariamente

2. **Finanzas:**
   - Registra pagos inmediatamente
   - Revisa solvencia semanalmente
   - Genera reportes al final de mes

3. **Staff:**
   - Define horarios claros desde el inicio
   - Asigna correctamente sucursales
   - Capacita en el uso de la plataforma

### Para Staff

1. **Clientes:**
   - Actualiza información de contacto
   - Agrega notas relevantes después de cada interacción
   - Usa acciones rápidas (WhatsApp, Email)

2. **Agenda:**
   - Verifica clases del día cada mañana
   - Confirma asistencias
   - Reporta ausencias

3. **Pagos:**
   - Emite recibo digital
   - Confirma datos antes de guardar
   - Reporta cualquier inconsistencia

---

## 📈 Métricas de Éxito

### KPIs Recomendados

**Financieros:**
- Tasa de solvencia > 80%
- Crecimiento mensual de ingresos
- Ticket promedio por alumno

**Operativos:**
- Ocupación de clases > 70%
- Tasa de retención de alumnos
- Productividad por profesor

**Crecimiento:**
- Nuevos alumnos por mes
- Tasa de conversión (prospectos → clientes)
- NPS (Net Promoter Score)

**Usa el Dashboard para Monitorear:**
- Visualización diaria
- Tendencias mensuales
- Comparativas año/año

---

**Versión de la Guía:** 1.0  
**Fecha:** 5 de febrero de 2026  
**Última actualización:** Compatible con ALERIS.ops v1.3

---

¿Tienes dudas? Escríbenos a **soporte@aleris.ops** 💜

**¡Bienvenido a ALERIS.ops!** 🚀

