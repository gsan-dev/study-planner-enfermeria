import { PlaceholderPage } from '../components/PlaceholderPage'
import { ChartIcon } from '../components/icons'

// Páginas provisionales; cada una se sustituye por la real en su fase.

export const ProgresoPage = () => (
  <PlaceholderPage
    icon={ChartIcon}
    title="Tu progreso"
    description="Horas estudiadas, temas completados y estadísticas por asignatura."
    fase={6}
  />
)
