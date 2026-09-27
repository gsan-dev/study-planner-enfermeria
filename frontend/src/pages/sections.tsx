import { PlaceholderPage } from '../components/PlaceholderPage'
import { BookIcon, CalendarIcon, ChartIcon, ChecklistIcon, SettingsIcon } from '../components/icons'

// Páginas provisionales; cada una se sustituye por la real en su fase.

export const AsignaturasPage = () => (
  <PlaceholderPage
    icon={BookIcon}
    title="Tus asignaturas"
    description="Aquí podrás crear asignaturas con su profesor, créditos, horario, color y temario."
    fase={2}
  />
)

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

export const AjustesPage = () => (
  <PlaceholderPage
    icon={SettingsIcon}
    title="Ajustes"
    description="Tu cuenta, horas de estudio diarias y preferencias de la app."
    fase={2}
  />
)
