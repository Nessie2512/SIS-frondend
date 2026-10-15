import type { Meta, StoryObj } from '@storybook/react-vite'
import { Avatar } from './avatar'
import { Aviso } from './aviso'
import { Button } from './button'
import { Dica } from './dica'
import { EstadoVazio } from './estado-vazio'
import { EtiquetaEstado } from './etiqueta-estado'
import { notificar, notificarComDesfazer } from './notificacoes'
import { BarraProgresso, IndicadorPontual } from './progresso'

const meta = { title: 'Sistema de desenho/Estado e retorno' } satisfies Meta
export default meta
type Historia = StoryObj<typeof meta>

export const Etiquetas: Historia = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <EtiquetaEstado tom="neutra">Planeado</EtiquetaEstado>
      <EtiquetaEstado tom="accao">A confirmar</EtiquetaEstado>
      <EtiquetaEstado tom="sucesso">Confirmada</EtiquetaEstado>
      <EtiquetaEstado tom="aviso">Documentos em falta</EtiquetaEstado>
      <EtiquetaEstado tom="perigo">Anulada</EtiquetaEstado>
    </div>
  ),
}

export const AvisosEFaixas: Historia = {
  render: () => (
    <div className="flex max-w-2xl flex-col gap-3">
      <Aviso tom="informacao" titulo="Renovação disponível">
        Há 312 matrículas prontas para renovar.
      </Aviso>
      <Aviso tom="aviso" accao={<Button tamanho="compacto">Rever</Button>} aoDispensar={() => {}}>
        Faltam 3 documentos obrigatórios.
      </Aviso>
      <Aviso tom="erro">Não foi possível carregar o calendário.</Aviso>
      <Aviso
        tom="leitura"
        forma="faixa"
        accao={
          <Button tamanho="compacto" variante="discreto">
            Reabrir
          </Button>
        }
      >
        O ano lectivo 2025/2026 está encerrado. Só é possível consultar.
      </Aviso>
    </div>
  ),
}

export const Notificacoes: Historia = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => notificar.sucesso('Documento emitido.')}>Sucesso</Button>
      <Button
        onClick={() =>
          notificar.erro('Não foi possível guardar. A sua alteração continua aqui.', () => {})
        }
      >
        Erro com Tentar de novo
      </Button>
      <Button
        onClick={() =>
          notificarComDesfazer('Maria Santos movida para 7.ª B.', () =>
            notificar.info('Movida de volta para 7.ª A.'),
          )
        }
      >
        Com Desfazer
      </Button>
    </div>
  ),
}

export const Progresso: Historia = {
  render: () => (
    <div className="flex max-w-md flex-col gap-4">
      <BarraProgresso rotulo="Renovação de matrículas" estado="indeterminado" />
      <BarraProgresso rotulo="Renovação de matrículas" valor={42} />
      <BarraProgresso rotulo="Renovação de matrículas" estado="concluido" />
      <BarraProgresso rotulo="Renovação de matrículas" valor={70} estado="falhado" />
      <IndicadorPontual />
    </div>
  ),
}

export const Avatares: Historia = {
  render: () => (
    <div className="flex items-center gap-3">
      <Avatar nome="Maria Santos" tamanho="pequeno" />
      <Avatar nome="Maria Santos" />
      <Avatar nome="João Mateus" tamanho="grande" />
      <Avatar nome="Ana Domingos" fotografia="/fonts/sem-imagem.jpg" />
    </div>
  ),
}

export const Dicas: Historia = {
  render: () => (
    <Dica texto="Complete os documentos obrigatórios para confirmar.">
      <Button variante="primario" aria-disabled>
        Confirmar matrícula
      </Button>
    </Dica>
  ),
}

export const EstadosVazios: Historia = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      <EstadoVazio
        titulo="Ainda não há turmas neste ano."
        descricao="Crie a primeira ou duplique as do ano anterior."
        accao={<Button variante="primario">Duplicar do ano anterior</Button>}
      />
      <EstadoVazio
        variante="sem-resultados"
        titulo="Nenhum resultado."
        descricao="Retire um filtro para ver mais."
      />
    </div>
  ),
}
