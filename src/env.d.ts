/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_MOCK?: 'true' | 'false'
  /** Sentry: sem DSN, nada é enviado */
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_VERSAO?: string
  /** Opcional: endpoint que recebe as Core Web Vitals (sendBeacon) */
  readonly VITE_VITAIS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.po' {
  import type { Messages } from '@lingui/core'
  export const messages: Messages
}
