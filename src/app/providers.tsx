import { I18nProvider } from '@lingui/react'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { i18n } from '@/shared/i18n'
import { FornecedorDicas } from '@/shared/ui'

/** Fornecedores globais, partilhados pela aplicação, pelos testes e pelo Storybook. */
export function Providers({
  queryClient,
  children,
}: {
  queryClient: QueryClient
  children: ReactNode
}) {
  return (
    <I18nProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <FornecedorDicas>{children}</FornecedorDicas>
      </QueryClientProvider>
    </I18nProvider>
  )
}
