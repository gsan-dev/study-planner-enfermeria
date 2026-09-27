import { PlaceholderPage } from '../components/PlaceholderPage'
import { CalendarIcon, ChartIcon, ChecklistIcon } from '../components/icons'

// Páginas provisionales; cada una se sustituye por la real en su fase.

export const ExamenesPage = () => (
  <PlaceholderPage
    icon={CalendarIcon}
    title="Tus exámenes"
    description="Calendario y lista de exámenes, con los temas que entran en cada uno."
    fase={3}
  />
)

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
