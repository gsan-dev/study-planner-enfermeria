export const config = {
  apiUrl: (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, ''),
  appName: 'Study Planner',
} as const
