import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals'

// ✅ Web Vitals Tracking según Vercel Best Practices
export function reportWebVitals(onPerfEntry?: (metric: any) => void) {
  if (onPerfEntry && typeof onPerfEntry === 'function') {
    onCLS(onPerfEntry)
    onFCP(onPerfEntry)
    onINP(onPerfEntry)
    onLCP(onPerfEntry)
    onTTFB(onPerfEntry)
  }
}

// ✅ Helper para enviar métricas a consola (en desarrollo)
export function logWebVitals() {
  reportWebVitals((metric) => {
    console.log('📊 Web Vital:', {
      name: metric.name,
      value: Math.round(metric.value),
      rating: metric.rating,
      delta: Math.round(metric.delta),
    })
  })
}

// ✅ Helper para enviar a analytics (producción)
export function sendToAnalytics(metric: any) {
  // Aquí puedes integrar con Google Analytics, Vercel Analytics, etc.
  const body = JSON.stringify({
    name: metric.name,
    value: Math.round(metric.value),
    rating: metric.rating,
    delta: Math.round(metric.delta),
    id: metric.id,
  })

  // Ejemplo: Enviar a tu propio endpoint
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics', body)
  } else {
    // Fallback para navegadores sin sendBeacon
    fetch('/api/analytics', {
      body,
      method: 'POST',
      keepalive: true,
    })
  }
}

// ✅ Configuración según ambiente
export function setupWebVitals() {
  if (import.meta.env.DEV) {
    // En desarrollo: Log a consola
    logWebVitals()
  } else {
    // En producción: Enviar a analytics
    reportWebVitals(sendToAnalytics)
  }
}

