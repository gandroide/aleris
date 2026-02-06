# 📅 Guía: Clases Recurrentes Automáticas

## 🎯 ¿Qué problema resuelve?

Antes, si un cliente compraba una membresía de 1 mes con clases de tambor los **martes y miércoles**, tenías que crear manualmente cada cita en el calendario (8 clases en total para un mes).

Ahora, **el sistema genera automáticamente todas las clases** cuando activas la membresía.

---

## 📋 Cómo Configurar un Plan con Clases Recurrentes

### Paso 1: Ve a Catálogo de Servicios

1. Navega a **"Catálogo de Servicios"** desde el menú lateral
2. Cambia a la pestaña **"Planes y Membresías"**
3. Haz clic en **"Nuevo Plan"** o edita un plan existente

### Paso 2: Completa la Información Básica

- **Nombre**: ej. "Plan Mensual Tambor"
- **Precio**: $500
- **Servicio que cubre**: Selecciona el servicio (ej. "Tambor")
- **Duración**: 30 días

### Paso 3: Activa las Clases Recurrentes

1. Activa el switch **"Clases Recurrentes Automáticas"**
2. Selecciona los **días de la semana**:
   - **L** = Lunes
   - **M** = Martes
   - **X** = Miércoles
   - **J** = Jueves
   - **V** = Viernes
   - **S** = Sábado
   - **D** = Domingo
   
   Por ejemplo: Si seleccionas **Martes y Jueves**, las clases se crearán automáticamente esos días.

3. **Hora de la clase**: Selecciona la hora por defecto (ej. 16:00)

4. **Profesor asignado (opcional)**: 
   - Puedes asignar un profesor por defecto
   - Si lo dejas vacío, tendrás que asignar el profesor manualmente después

5. Guarda el plan

---

## 💰 Cómo Vender una Membresía y Generar las Clases

### Paso 1: Registrar la Venta

1. Ve a **"Tesorería & Nómina"**
2. Haz clic en **"Registrar Ingreso"**
3. Selecciona **"Vender Membresía"** en lugar de "Cobro Simple"
4. Elige el **alumno**
5. Selecciona el **plan** que configuraste con clases recurrentes
6. El sistema automáticamente:
   - Rellenará el monto
   - Mostrará el concepto

7. Haz clic en **"ACTIVAR MEMBRESÍA & COBRAR"**

### Paso 2: El Sistema Genera las Clases Automáticamente

Después de confirmar:
- ✅ Se registra el pago
- ✅ Se activa la membresía
- 🎉 **Se crean automáticamente todas las clases en el calendario**

Verás un mensaje como:
> "Membresía activada con 8 clases programadas automáticamente 🎉"

---

## 📅 Ver las Clases Generadas

1. Ve a **"Agenda & Calendario"**
2. Navega por los días del mes
3. Verás todas las clases programadas en los días configurados (martes y miércoles en el ejemplo)
4. Cada clase:
   - Ya está vinculada al alumno
   - Ya tiene el servicio asignado
   - Ya tiene el profesor (si lo configuraste)
   - Tiene precio $0 (porque está cubierta por la membresía)

---

## 🔄 Ejemplo Completo

### Escenario:
María compra una membresía mensual de clases de Tambor. Las clases son los **martes y jueves a las 18:00** con el profesor Carlos.

### Configuración del Plan:
```
Nombre: Plan Mensual Tambor
Precio: $500
Duración: 30 días
Servicio: Tambor
Clases Recurrentes: ✅ Activado
  - Días: Martes, Jueves
  - Hora: 18:00
  - Profesor: Carlos (Interno)
```

### Resultado:
Al vender la membresía el **6 de Febrero 2026**, el sistema crea automáticamente:
- 10 de Feb (martes) 18:00 - María - Tambor - Carlos
- 13 de Feb (jueves) 18:00 - María - Tambor - Carlos
- 17 de Feb (martes) 18:00 - María - Tambor - Carlos
- 20 de Feb (jueves) 18:00 - María - Tambor - Carlos
- 24 de Feb (martes) 18:00 - María - Tambor - Carlos
- 27 de Feb (jueves) 18:00 - María - Tambor - Carlos
- 3 de Mar (martes) 18:00 - María - Tambor - Carlos
- 6 de Mar (jueves) 18:00 - María - Tambor - Carlos

**Total: 8 clases creadas automáticamente** para el período de 30 días.

---

## ❓ Preguntas Frecuentes

### ¿Qué pasa si no activo las clases recurrentes en un plan?
El plan funcionará como antes: el cliente tendrá acceso ilimitado al servicio pero las clases NO se crearán automáticamente. Tendrás que agendarlas manualmente.

### ¿Puedo editar o eliminar las clases generadas?
Sí, puedes editar cualquier clase desde el calendario (cambiar hora, profesor, etc.) o eliminarla si es necesario.

### ¿Se cobran las clases generadas automáticamente?
No. Todas las clases generadas desde una membresía tienen precio $0 porque ya están pagadas con la membresía.

### ¿Puedo tener planes sin recurrencia?
Sí. Puedes tener planes tradicionales (sin recurrencia) y planes con clases recurrentes al mismo tiempo.

### ¿Qué pasa si el cliente cancela la membresía?
Tendrás que eliminar manualmente las clases futuras desde el calendario. En una futura actualización se puede agregar un botón para cancelar todas las clases asociadas a una membresía.

---

## 🚀 Migración SQL Necesaria

Antes de usar esta funcionalidad, debes ejecutar el archivo SQL en Supabase:

**Archivo**: `supabase-recurring-classes.sql`

**Pasos**:
1. Abre Supabase Dashboard
2. Ve a **SQL Editor**
3. Copia y pega todo el contenido de `supabase-recurring-classes.sql`
4. Ejecuta el script
5. Verifica que se muestre: "Migración de clases recurrentes completada exitosamente"

---

## 📊 Vista Técnica

### Nuevos Campos en `plans`
- `recurring_enabled`: Si el plan tiene clases recurrentes
- `recurring_days`: Array de días [0=Domingo, 1=Lunes, ..., 6=Sábado]
- `recurring_time`: Hora de las clases
- `default_teacher_type`: 'system' o 'professional'
- `default_teacher_id`: ID del profesor asignado

### Función SQL
`generate_recurring_appointments(p_membership_id uuid)`
- Genera todas las citas recurrentes para una membresía
- Verifica que no existan duplicados
- Asigna precio $0 (cubierto por membresía)
- Marca las citas como `created_from_membership = true`

---

## 🎉 ¡Listo!

Ahora puedes crear planes con clases recurrentes y ahorrar tiempo al activar membresías. El sistema se encarga de generar todas las clases automáticamente.

¿Tienes dudas o sugerencias? ¡Házmelo saber!

