import { PlaceholderPage } from '../components/PlaceholderPage'
import { ChartIcon, ChecklistIcon } from '../components/icons'

// Páginas provisionales; cada una se sustituye por la real en su fase.

export const PlanPage = () => (
  <PlaceholderPage
    icon={ChecklistIcon}
    title="Plan de estudio"
    description="Genera automáticamente un plan día a día, o créalo tú arrastrando temas al calendario."
    fase={4}
  />
)

export const ProgresoPage = () => (
  <PlaceholderPage
    icon={ChartIcon}
    title="Tu progreso"
    description="Horas estudiadas, temas completados y estadísticas por asignatura."
    fase={6}
  />
)
