// Aplica el tema guardado antes de pintar la página (así no hay un destello
// claro al abrir la app en modo oscuro). Es un archivo aparte porque la CSP no
// permite scripts en línea. La app lo gestiona después desde src/lib/tema.ts.
;(function () {
  var preferencia = 'sistema'
  try {
    preferencia = localStorage.getItem('tema') || 'sistema'
  } catch {
    // Sin almacenamiento (modo privado): se sigue al sistema.
  }
  var oscuro =
    preferencia === 'oscuro' ||
    (preferencia === 'sistema' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.tema = oscuro ? 'oscuro' : 'claro'
  var meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', oscuro ? '#0b1120' : '#0f766e')
})()
