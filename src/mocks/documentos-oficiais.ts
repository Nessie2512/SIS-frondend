import { http, HttpResponse } from 'msw'
import { auditar } from './administracao'
import { API, idempotente, problema, protegido, utilizadorDo, type S } from './apoio'
import { anosLectivos, classePorId, db, novoId, turmaPorId, type DocumentoOficial } from './db'

/**
 * Documentos oficiais (guia 2.1, 2.3): declarações, guia de transferência e certificado, com
 * número e código de verificação. Emitir não se desfaz; um documento só se anula, com motivo,
 * e continua visível.
 */

const TITULO: Record<S['TipoDocumentoOficial'], string> = {
  DECLARACAO_MATRICULA: 'Declaração de matrícula',
  DECLARACAO_FREQUENCIA: 'Declaração de frequência',
  GUIA_TRANSFERENCIA: 'Guia de transferência',
  CERTIFICADO_HABILITACOES: 'Certificado de habilitações',
}
const SIGLA: Record<S['TipoDocumentoOficial'], string> = {
  DECLARACAO_MATRICULA: 'DM',
  DECLARACAO_FREQUENCIA: 'DF',
  GUIA_TRANSFERENCIA: 'GT',
  CERTIFICADO_HABILITACOES: 'CH',
}
const TURNO: Record<string, string> = { MANHA: 'manhã', TARDE: 'tarde', NOITE: 'noite' }

const dataPorExtenso = (iso: string) =>
  new Intl.DateTimeFormat('pt-AO', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(`${iso.slice(0, 10)}T12:00:00`),
  )

function contexto(estudanteId: string) {
  const e = db.estudantes.find((x) => x.id === estudanteId)!
  const ano = anosLectivos.find((a) => a.estado === 'EM_CURSO')
  const matricula = db.matriculas.find(
    (m) => m.estudanteId === e.id && m.anoLectivoId === ano?.id && m.estado === 'CONFIRMADA',
  )
  const concluidas = db.percurso
    .filter(
      (p) =>
        p.estudanteId === e.id &&
        p.tipo === 'RESULTADO' &&
        (p.descricao.startsWith('Aprovado') || p.descricao.startsWith('Concluiu')),
    )
    .map((p) => p.descricao)
  const saida = db.percurso.find(
    (p) =>
      p.estudanteId === e.id &&
      p.tipo === 'TRANSFERENCIA' &&
      p.descricao.startsWith('Transferido para'),
  )
  return { e, ano, matricula, concluidas, saida }
}

function tiposDisponiveis(estudanteId: string): S['TipoDisponivelDto'][] {
  const { e, matricula, concluidas } = contexto(estudanteId)
  const linha = (tipo: S['TipoDocumentoOficial'], razao: string | null) => ({
    tipo,
    titulo: TITULO[tipo],
    disponivel: razao === null,
    razao,
  })
  return [
    linha(
      'DECLARACAO_MATRICULA',
      matricula ? null : 'Só com matrícula confirmada no ano em curso.',
    ),
    linha(
      'DECLARACAO_FREQUENCIA',
      matricula?.turmaId ? null : 'Só para quem frequenta uma turma no ano em curso.',
    ),
    linha(
      'GUIA_TRANSFERENCIA',
      e.estado === 'TRANSFERIDO' ? null : 'Só depois de registar a transferência de saída.',
    ),
    linha(
      'CERTIFICADO_HABILITACOES',
      concluidas.length ? null : 'Ainda não há classes concluídas no percurso.',
    ),
  ]
}

/** Texto do documento, gerado no servidor como o PDF (o cliente só o mostra). */
function conteudoDe(
  estudanteId: string,
  tipo: S['TipoDocumentoOficial'],
  finalidade: string,
): S['ConteudoDocumentoDto'] {
  const { e, ano, matricula, concluidas, saida } = contexto(estudanteId)
  const feminino = e.sexo === 'F'
  const o = feminino ? 'a' : 'o'
  const identificacao = e.documentoIdentificacao
    ? `portador${feminino ? 'a' : ''} do bilhete de identidade n.º ${e.documentoIdentificacao}`
    : `com o processo individual n.º ${e.numeroProcesso}`
  const efeitos = finalidade.trim()
    ? `para efeitos de ${finalidade.trim()}`
    : 'para os devidos efeitos'
  const nascido = `nascid${o} a ${dataPorExtenso(e.dataNascimento)}`
  const turma = turmaPorId(matricula?.turmaId ?? null)
  const classe = matricula ? classePorId(matricula.classeId).designacao : ''
  const paragrafos: string[] = []
  switch (tipo) {
    case 'DECLARACAO_MATRICULA':
      paragrafos.push(
        `Declara-se, ${efeitos}, que ${e.nome}, ${nascido}, ${identificacao}, está matriculad${o} nesta escola na ${classe}, no ano lectivo ${ano?.designacao ?? ''}.`,
      )
      break
    case 'DECLARACAO_FREQUENCIA':
      paragrafos.push(
        `Declara-se, ${efeitos}, que ${e.nome}, ${nascido}, ${identificacao}, frequenta nesta escola a ${classe}, turma ${turma?.designacao ?? ''}, turno da ${TURNO[turma?.turno ?? 'MANHA']}, no ano lectivo ${ano?.designacao ?? ''}.`,
      )
      break
    case 'GUIA_TRANSFERENCIA':
      paragrafos.push(
        `Para os devidos efeitos se declara que ${e.nome}, ${nascido}, ${identificacao}, foi ${saida?.descricao.toLowerCase() ?? 'transferid' + o} em ${dataPorExtenso(saida?.data ?? new Date().toISOString())}.`,
        concluidas.length
          ? `Concluiu nesta escola: ${concluidas.join('; ')}.`
          : 'Não concluiu nenhuma classe nesta escola.',
        'Segue o processo individual, com os documentos entregues na matrícula.',
      )
      break
    case 'CERTIFICADO_HABILITACOES':
      paragrafos.push(
        `Certifica-se, ${efeitos}, que ${e.nome}, ${nascido}, ${identificacao}, tem o seguinte percurso concluído com aproveitamento:`,
        ...concluidas.map((c) => `— ${c}.`),
      )
      break
  }
  return { titulo: TITULO[tipo], paragrafos }
}

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const codigoNovo = () =>
  Array.from(
    { length: 8 },
    (_, i) => (i === 4 ? '-' : '') + ALFABETO[Math.floor(Math.random() * ALFABETO.length)],
  ).join('')

function paraDto(d: DocumentoOficial): S['DocumentoOficialDto'] {
  return {
    id: d.id,
    tipo: d.tipo,
    titulo: TITULO[d.tipo],
    numero: d.numero,
    codigoVerificacao: d.codigo,
    emitidoEm: d.emitidoEm,
    emitidoPor: d.emitidoPor,
    finalidade: d.finalidade,
    estado: d.estado,
    motivoAnulacao: d.motivoAnulacao,
    pdfUrl: `${API}/documentos-oficiais/${d.id}/pdf`,
  }
}

// ---------------------------------------------------------------------------
// PDF mínimo (uma página A4, Helvetica, WinAnsi): chega para descarregar e imprimir
// ---------------------------------------------------------------------------
function gerarPdf(linhas: string[]): Uint8Array {
  const escapar = (texto: string) =>
    [...texto.replace(/[—–]/g, '-')]
      .map((ch) => {
        const c = ch.charCodeAt(0)
        if (ch === '(' || ch === ')' || ch === '\\') return `\\${ch}`
        if (c > 126 && c < 256) return `\\${c.toString(8).padStart(3, '0')}`
        return c >= 256 ? '?' : ch
      })
      .join('')
  const partir = (texto: string, largura = 88) => {
    const saida: string[] = []
    let actual = ''
    for (const palavra of texto.split(' ')) {
      if ((actual + ' ' + palavra).trim().length > largura) {
        saida.push(actual)
        actual = palavra
      } else actual = (actual + ' ' + palavra).trim()
    }
    if (actual || !saida.length) saida.push(actual)
    return saida
  }
  const fluxo = [
    'BT /F1 11 Tf 15 TL 60 780 Td',
    ...linhas.flatMap(partir).map((l) => `(${escapar(l)}) Tj T*`),
    'ET',
  ].join('\n')
  const objectos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    `<< /Length ${fluxo.length} >>\nstream\n${fluxo}\nendstream`,
  ]
  let pdf = '%PDF-1.4\n'
  const posicoes: number[] = []
  objectos.forEach((o, i) => {
    posicoes.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objectos.length + 1}\n0000000000 65535 f \n`
  pdf += posicoes.map((p) => `${String(p).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${objectos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Uint8Array.from(pdf, (c) => c.charCodeAt(0))
}

export const handlersDocumentosOficiais = [
  http.get(
    `${API}/estudantes/:id/documentos-oficiais`,
    protegido('estudantes:ler', ({ params }) => {
      const e = db.estudantes.find((x) => x.id === params.id)
      if (!e) return problema(404, 'Estudante não encontrado')
      return HttpResponse.json({
        tipos: tiposDisponiveis(e.id),
        emitidos: db.documentosOficiais
          .filter((d) => d.estudanteId === e.id)
          .sort((a, b) => b.emitidoEm.localeCompare(a.emitidoEm))
          .map(paraDto),
      } satisfies S['DocumentosOficiaisDto'])
    }),
  ),

  http.post(
    `${API}/estudantes/:id/documentos-oficiais/pre-visualizar`,
    protegido('documentos:emitir', async ({ request, params }) => {
      const e = db.estudantes.find((x) => x.id === params.id)
      if (!e) return problema(404, 'Estudante não encontrado')
      const { tipo, finalidade } = (await request.json()) as S['PedidoDocumentoOficialDto']
      const disponivel = tiposDisponiveis(e.id).find((t) => t.tipo === tipo)
      if (!disponivel?.disponivel) {
        return problema(422, 'Indisponível', {
          errors: [{ campo: 'tipo', mensagem: disponivel?.razao ?? 'Tipo desconhecido.' }],
        })
      }
      return HttpResponse.json(conteudoDe(e.id, tipo, finalidade ?? ''))
    }),
  ),

  http.post(
    `${API}/estudantes/:id/documentos-oficiais`,
    protegido('documentos:emitir', async ({ request, params }) => {
      const e = db.estudantes.find((x) => x.id === params.id)
      if (!e) return problema(404, 'Estudante não encontrado')
      const { tipo, finalidade } = (await request.json()) as S['PedidoDocumentoOficialDto']
      return idempotente(request, () => {
        const disponivel = tiposDisponiveis(e.id).find((t) => t.tipo === tipo)
        if (!disponivel?.disponivel) {
          return problema(422, 'Indisponível', {
            errors: [{ campo: 'tipo', mensagem: disponivel?.razao ?? 'Tipo desconhecido.' }],
          })
        }
        const ano = new Date().getFullYear()
        const doTipo = db.documentosOficiais.filter((d) => d.tipo === tipo).length + 1
        const quem = utilizadorDo(request)!.nome
        const documento: DocumentoOficial = {
          id: novoId('doc'),
          estudanteId: e.id,
          tipo,
          numero: `${SIGLA[tipo]}-${ano}/${String(doTipo).padStart(5, '0')}`,
          codigo: codigoNovo(),
          emitidoEm: new Date().toISOString(),
          emitidoPor: quem,
          finalidade: finalidade?.trim() || null,
          estado: 'VALIDO',
          motivoAnulacao: null,
          conteudo: conteudoDe(e.id, tipo, finalidade ?? ''),
        }
        db.documentosOficiais.push(documento)
        auditar(
          quem,
          'CRIAR',
          'Documento oficial',
          `${TITULO[tipo]} ${documento.numero}: ${e.nome}`,
        )
        return HttpResponse.json(paraDto(documento), { status: 201 })
      })
    }),
  ),

  http.post(
    `${API}/documentos-oficiais/:id/anular`,
    protegido('documentos:emitir', async ({ request, params }) => {
      const d = db.documentosOficiais.find((x) => x.id === params.id)
      if (!d) return problema(404, 'Documento não encontrado')
      if (d.estado === 'ANULADO')
        return problema(409, 'Já anulado', { detail: 'Este documento já está anulado.' })
      const { motivo } = (await request.json()) as S['AnularDocumentoDto']
      if ((motivo?.trim().length ?? 0) < 10) {
        return problema(422, 'Dados inválidos', {
          errors: [
            { campo: 'motivo', mensagem: 'Explique porque anula (pelo menos 10 caracteres).' },
          ],
        })
      }
      d.estado = 'ANULADO'
      d.motivoAnulacao = motivo.trim()
      auditar(
        utilizadorDo(request)!.nome,
        'ALTERAR',
        'Documento oficial',
        `${d.numero}: anulado (${d.motivoAnulacao})`,
      )
      return HttpResponse.json(paraDto(d))
    }),
  ),

  http.get(`${API}/documentos-oficiais/:id/pdf`, ({ params }) => {
    const d = db.documentosOficiais.find((x) => x.id === params.id)
    if (!d) return problema(404, 'Documento não encontrado')
    const linhas = [
      'Secretaria escolar',
      '',
      d.conteudo.titulo.toUpperCase(),
      `N.º ${d.numero}`,
      '',
      ...d.conteudo.paragrafos.flatMap((p) => [p, '']),
      `Emitido a ${dataPorExtenso(d.emitidoEm)}, por ${d.emitidoPor}.`,
      `Código de verificação: ${d.codigo}`,
      ...(d.estado === 'ANULADO' ? ['', `ANULADO: ${d.motivoAnulacao}`] : []),
    ]
    return new HttpResponse(gerarPdf(linhas), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${d.numero.replace('/', '-')}.pdf"`,
      },
    })
  }),
]
