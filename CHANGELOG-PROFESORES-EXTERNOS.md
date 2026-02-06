# 🎓 Nueva Funcionalidad: Profesores Externos

**Fecha:** 5 de febrero de 2026  
**Versión:** 1.4  
**Módulo:** Staff / Equipo

---

## ✨ ¿Qué hay de nuevo?

Ahora puedes agregar **profesores externos** a tu equipo **sin necesidad de email** ni invitación. Perfecto para instructores freelance que solo das clases pero no necesitan acceder a la aplicación.

---

## 🎯 Problema Resuelto

**ANTES:**
- ❌ Para agregar un profesor necesitabas su email
- ❌ Debías enviar invitación y esperar a que se registraran
- ❌ No podías asignarlos a clases hasta que completaran registro
- ❌ Proceso lento y dependiente del profesor

**AHORA:**
- ✅ Agregas profesores con solo su nombre
- ✅ Email es opcional (solo para tu contacto)
- ✅ Los puedes asignar a clases inmediatamente
- ✅ Proceso instantáneo

---

## 📋 Cómo Usar

### Opción 1: Profesor Externo (NUEVO)

**Ideal para:** Instructores freelance, profesores por hora, colaboradores

1. Ve a **Staff** → Click "Nuevo Miembro"
2. Deja seleccionado **"Profesor Externo"** (viene por defecto)
3. Completa el formulario:

```
Nombre:          Juan
Apellido:        Pérez
Especialidad:    Salsa          (opcional)
Teléfono:        +57 300 123    (opcional)
Email:           juan@mail.com  (opcional)
```

4. Click **"✓ Agregar Profesor"**
5. ✅ **¡Listo!** Ya lo ves en tu lista de staff

**Características:**
- 🚫 NO tiene acceso a la app
- ✅ SÍ puedes asignarlo a clases
- ✅ SÍ aparece en horarios y reportes
- ✅ SÍ puedes editar su perfil (salario, comisiones)
- ✅ SÍ puedes asignarlo a sucursales

---

### Opción 2: Staff con Acceso (Ya existía)

**Ideal para:** Personal administrativo, coordinadores

1. Ve a **Staff** → Click "Nuevo Miembro"
2. Selecciona **"Staff con Acceso"**
3. Ingresa email y selecciona rol
4. Click **"📧 Enviar Invitación"**
5. ⏳ Espera a que la persona se registre

---

## 🎨 Interfaz Nueva

Al hacer click en "Nuevo Miembro", verás:

```
╔════════════════════════════════════════════════╗
║  AGREGAR AL EQUIPO                             ║
╠════════════════════════════════════════════════╣
║                                                ║
║  TIPO DE MIEMBRO:                             ║
║                                                ║
║  ┌─────────────────┐  ┌──────────────────┐   ║
║  │ 👤 Profesor     │  │ 📧 Staff con     │   ║
║  │    Externo      │  │    Acceso        │   ║
║  │ [SELECCIONADO]  │  │                  │   ║
║  │                 │  │                  │   ║
║  │ No usa la app   │  │ Usará la app     │   ║
║  │ Solo su nombre  │  │ Requiere email   │   ║
║  └─────────────────┘  └──────────────────┘   ║
║                                                ║
║  ┌──────────────────────────────────────┐    ║
║  │ Nombre *         [Juan________]      │    ║
║  │ Apellido *       [Pérez_______]      │    ║
║  │ Especialidad     [Salsa_______]      │    ║
║  │ Teléfono         [+57 300_____]      │    ║
║  │ Email            [opcional____]      │    ║
║  └──────────────────────────────────────┘    ║
║                                                ║
║  [ ✓ Agregar Profesor ]                       ║
║                                                ║
╚════════════════════════════════════════════════╝
```

---

## 🔄 Diferencias Técnicas

### Profesor Externo (type: 'professional')
- Se guarda en tabla `professionals`
- No tiene cuenta de usuario
- No puede iniciar sesión
- Aparece con badge "EXT" en la lista

### Staff con Acceso (type: 'system')
- Primero se crea invitación
- Después se crea cuenta de usuario
- Puede iniciar sesión
- Aparece sin badge especial

---

## 💡 Casos de Uso

### Academia de Danza

**Profesores Externos (10 personas):**
- Juan (Salsa)
- María (Bachata)
- Pedro (Merengue)
- Ana (Kizomba)
- etc...

➡️ **Tiempo de registro:** 2 minutos por todos  
➡️ **Sin esperar emails ni confirmaciones**

**Staff con Acceso (2 personas):**
- Recepcionista (ve pagos y agenda)
- Coordinador (gestiona todo)

---

### Gimnasio

**Profesores Externos:**
- 5 instructores de spinning
- 3 profesores de yoga
- 2 entrenadores personales

**Staff con Acceso:**
- Gerente
- Asistente administrativo

---

## 📊 Ventajas

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| **Tiempo de registro** | 5-10 min | 30 segundos |
| **Depende del profesor** | ✅ Sí | ❌ No |
| **Email obligatorio** | ✅ Sí | ❌ No (opcional) |
| **Espera confirmación** | ✅ Sí | ❌ No |
| **Asignable a clases** | ⏳ Después | ✅ Inmediato |
| **Control del owner** | 🟡 Parcial | ✅ Total |

---

## ⚙️ Funcionalidades Completas

Todo lo que puedes hacer con un Profesor Externo:

### ✅ Gestión Básica
- Ver en lista de staff
- Editar perfil (nombre, especialidad, teléfono)
- Asignar a una o múltiples sucursales
- Eliminar (con confirmación)

### ✅ Configuración Financiera
- Asignar salario base
- Configurar % de comisión
- Ver en reportes de nómina

### ✅ Programación
- Asignar a clases en calendario
- Ver sus próximas clases
- Ver lista de alumnos que ha tenido

### ✅ Reportes
- Aparece en estadísticas de staff
- Incluido en reportes de productividad
- Contabilizado en número total de personal

### ❌ Limitaciones (por diseño)
- No puede iniciar sesión en la app
- No ve su propia agenda
- No puede marcar asistencias
- No tiene tab de "Reviews" (solo staff interno)
- No tiene tab de "Horario" (solo staff interno)

---

## 🔍 Identificación Visual

En la lista de staff, los profesores externos tienen:

```
┌─────────────────────────────────────┐
│  [J] Juan Pérez              ⭐ 4.8 │
│      Salsa                    EXT   │  ← Badge morado
│                                     │
│      ⭐ 4.8    🏢 2 sedes          │
└─────────────────────────────────────┘
```

**Badge "EXT":**
- Color: Morado (`purple-500`)
- Texto: "EXT"
- Significado: Profesional externo

---

## 🚀 Migración desde Versión Anterior

Si ya tenías profesores creados con el método anterior:

**No necesitas hacer nada:**
- Los profesores invitados por email siguen funcionando igual
- Puedes crear nuevos profesores externos cuando quieras
- Ambos tipos conviven sin problema
- La lista los muestra a todos juntos

**Si quieres "convertir" un staff en externo:**
1. Elimina el staff actual
2. Créalo de nuevo como "Profesor Externo"
3. Reasigna a sus sucursales

---

## 📱 Experiencia del Usuario

### Para el Owner/Admin:

**Flujo Rápido:**
1. Click "Nuevo Miembro" (2 segundos)
2. Escribir nombre y apellido (10 segundos)
3. Click "Agregar Profesor" (1 segundo)
4. ✅ Confirmación con toast

**Total: ~15 segundos por profesor**

---

### Para el Profesor Externo:

**Sin cambios en su workflow:**
- NO necesita hacer nada
- NO recibe emails
- NO necesita registrarse
- Simplemente da sus clases como siempre

**Beneficio:** Cero fricción para el instructor

---

## 🔒 Seguridad

**Permisos:**
- Solo Owner y Super Admin pueden crear profesores externos
- Staff regular NO puede crear usuarios

**Privacidad:**
- Los datos del profesor son privados
- Solo visible dentro de la organización
- No se comparte entre organizaciones

**Base de Datos:**
- Row Level Security (RLS) activo
- Políticas de acceso por organización
- Audit trail de cambios

---

## 🐛 Solución de Problemas

### "No veo el botón de Profesor Externo"

**Causa:** No tienes permisos  
**Solución:** Debes ser Owner o Admin

---

### "Agregué un profesor pero no aparece"

**Causa:** Filtros activos o error de red  
**Solución:**
1. Refresca la página
2. Verifica conexión a internet
3. Revisa que hayas completado nombre y apellido

---

### "Quiero que el profesor use la app después"

**Solución:**
1. Elimina el profesor externo actual
2. Crea nueva invitación con "Staff con Acceso"
3. El profesor se registra con su email
4. Mantén los mismos datos (nombre, especialidad, etc.)

---

### "El profesor no aparece en el calendario"

**Causa:** No está asignado a ninguna sucursal  
**Solución:**
1. Abre la ficha del profesor
2. Tab "Sucursales"
3. Asigna al menos una sede

---

## 📞 Soporte

Si tienes dudas sobre esta funcionalidad:

**Email:** soporte@aleris.ops  
**Subject:** "Profesores Externos - [Tu duda]"

---

## 🎉 Feedback

¿Qué te parece esta funcionalidad?  
¿Hay algo más que necesites para gestionar profesores externos?

Cuéntanos en: feedback@aleris.ops

---

**Desarrollado con 💜 por el equipo de ALERIS.ops**  
**Versión:** 1.4 | **Fecha:** 5 de febrero de 2026

