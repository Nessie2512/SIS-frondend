import * as Sentry from '@sentry/react'
import { onCLS, onINP, onLCP, onTTFB, type Metric } from 'web-vitals'
import { definirRelatorDeErros } from '@/shared/lib/registo'

/**
 * Erros e desempenho em campo (guia 3.2): Sentry com mascaramento de dados pessoais
 * e Core Web Vitals medidos nos utilizadores reais. Carregado sob procura, só em produção.
 */

/** Campos que nunca saem do navegador. */
const SENSIVEIS =
  /nome|email|telefone|morada|nascimento|bi|documento|encarregado|palavra|senha|password|token/i

function mascarar<T>(valor: T): T {
  if (Array.isArray(valor)) return valor.map(mascarar) as T
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(
      Object.entries(valor).map(([chave, v]) => [
        chave,
        SENSIVEIS.test(chave) ? '[mascarado]' : mascarar(v),
      ]),
    ) as T
  }
  return valor
}

/** Caminhos com identificadores (ex.: /estudantes/123) ficam genéricos. */
const semIds = (url: string) => url.replace(/\/[0-9a-f-]{8,}|\/\d+/gi, '/:id').split('?')[0] ?? url

export function iniciarObservabilidade() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (dsn) {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_VERSAO,
      // Nenhum dado pessoal recolhido automaticamente (guia 3.2)
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
      },
      tracesSampleRate: 0.1,
      integrations: [Sentry.browserTracingIntegration()],
      beforeSend(evento) {
        delete evento.user
        if (evento.request) {
          evento.request = { url: evento.request.url ? semIds(evento.request.url) : undefined }
        }
        if (evento.extra) evento.extra = mascarar(evento.extra)
        if (evento.contexts) evento.contexts = mascarar(evento.contexts)
        return evento
      },
      beforeBreadcrumb(migalha) {
        // Texto escrito pelo utilizador e corpos de pedidos nunca entram nas migalhas
        if (migalha.category === 'ui.input') return null
        if (migalha.data?.url)
          migalha.data = { ...migalha.data, url: semIds(String(migalha.data.url)) }
        return migalha
      },
    })
    definirRelatorDeErros((erro, contexto) =>
      Sentry.captureException(erro, { extra: contexto && mascarar(contexto) }),
    )
  }

  const reportar = (metrica: Metric) => {
    if (dsn) {
      Sentry.setMeasurement(
        metrica.name,
        metrica.value,
        metrica.name === 'CLS' ? '' : 'millisecond',
      )
    }
    const destino = import.meta.env.VITE_VITAIS_URL
    if (destino) {
      navigator.sendBeacon(
        destino,
        JSON.stringify({
          nome: metrica.name,
          valor: metrica.value,
          classificacao: metrica.rating,
          rota: semIds(location.pathname),
        }),
      )
    }
  }
  onLCP(reportar)
  onINP(reportar)
  onCLS(reportar)
  onTTFB(reportar)
}
