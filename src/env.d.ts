/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_MOCK?: 'true' | 'false'
  /** Áreas ligadas ao backend SIS real, separadas por vírgulas, ou `todas` (shared/config/ligacao) */
  readonly VITE_API_REAL?: string
  /** Caminho do backend SIS na mesma origem (por omissão /sis, servido por proxy ou reescrita) */
  readonly VITE_SIS_BASE?: string
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
