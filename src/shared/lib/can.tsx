import type { ReactNode } from 'react'
import { useCan } from './permissoes'

interface Props {
  permissao: string
  children: ReactNode
  fallback?: ReactNode
}

export function Can({ permissao, children, fallback = null }: Props) {
  const pode = useCan(permissao)
  return pode ? <>{children}</> : <>{fallback}</>
}
