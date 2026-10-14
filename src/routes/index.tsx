import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/shared/ui'

export const Route = createFileRoute('/')({
  component: Inicio,
})

function Inicio() {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-titulo-pagina">Início</h1>
      <p className="text-texto-2">O painel com indicadores e pendências do dia chega aqui.</p>
      <div className="mt-4">
        <Button variante="primario" asChild>
          <Link to="/turmas">Ver turmas</Link>
        </Button>
      </div>
    </section>
  )
}
