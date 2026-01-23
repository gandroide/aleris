# 04. Especificaciones PWA (Progressive Web App)

## 🤖 Instrucción para el Agente IA
Este proyecto DEBE comportarse como una aplicación nativa. No es solo una web responsive. Debes configurar `vite-plugin-pwa` y asegurarte de que la experiencia táctil sea perfecta.

## 📱 Configuración Técnica (Vite)
1.  **Instalación:** Usar `vite-plugin-pwa` para generar el Service Worker y el Manifiesto automáticamente.
2.  **Estrategia de Actualización:** `registerType: 'autoUpdate'` (Queremos que el usuario siempre tenga la última versión sin recargar manualmente).
3.  **Capacidades Offline:** Cachear assets estáticos (CSS, JS, Logos) para que la app cargue instantáneamente incluso con mala conexión.

## 🎨 Manifest.json (Identidad)
El agente debe generar un `manifest.json` con:
* `name`: "aleris.ops"
* `short_name`: "aleris"
* `start_url`: "/"
* `display`: "standalone" (Ocultar barra de navegador).
* `background_color`: "#000000" (Para modo oscuro).
* `theme_color`: "#000000" (Para que la barra de estado del móvil se fusione).
* `orientation`: "portrait" (Bloquear rotación en móviles si es necesario).

## 👆 UX Mobile-First (Reglas de Estilo)
1.  **No Hovers:** No usar efectos `:hover` para lógica crítica (no existen en pantallas táctiles). Usar `:active` para feedback visual al tocar.
2.  **Touch Targets:** Ningún botón debe medir menos de **44px de altura**.
3.  **Inputs:** Usar `inputmode` correcto:
    * Teléfono: `inputmode="tel"`
    * Precio: `inputmode="decimal"`
    * Email: `inputmode="email"`
4.  **Safe Areas:** Respetar el "Notch" del iPhone usando `padding-top: env(safe-area-inset-top)` y `padding-bottom: env(safe-area-inset-bottom)`.

## 📦 Iconos Requeridos
Generar placeholders en `/public` para:
* `pwa-192x192.png`
* `pwa-512x512.png`
* `apple-touch-icon.png`