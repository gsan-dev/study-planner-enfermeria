/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base del API. Por defecto "/api" (mismo dominio, vía proxy). */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
