// pocketbase/hooks/pipeline_transicoes_create.js
// F1-T04 — Validacao de CRIACAO no pipeline 'demandas' (request hook, sem $app)
onRecordCreateRequest((e) => {
  const body = e.requestInfo().body || {}
  const estado = body.estado || 'suspect'
  const responsavel = body.responsavel || ''
  const proximaAcao = body.proxima_acao || ''
  const prazo = body.prazo || ''
  const evidencia = body.evidencia || ''
  const contatoRef = body.contato_ref || ''
  const ofertaServico = body.oferta_servico || ''

  const NAO_TERMINAIS_ACAO = [
    'prospect',
    'lead_qualificado',
    'oportunidade',
    'proposta',
    'vaga_aberta',
  ]

  if (NAO_TERMINAIS_ACAO.includes(estado)) {
    const faltando = []
    if (!responsavel || responsavel.trim() === '') faltando.push('responsavel')
    if (!proximaAcao || proximaAcao.trim() === '') faltando.push('proxima_acao')
    if (!prazo || prazo.trim() === '') faltando.push('prazo')
    if (faltando.length > 0) {
      throw new Error(
        'criacao em ' +
          estado +
          ' exige responsavel, proxima_acao e prazo (CA-1-07/emenda E1): faltando ' +
          faltando.join(','),
      )
    }
  }

  if (estado === 'lead_qualificado') {
    const temEvidencia = evidencia && evidencia.trim() !== ''
    const temContato = contatoRef && contatoRef.trim() !== ''
    const temServico =
      ofertaServico && ofertaServico.trim() !== '' && ofertaServico !== 'a identificar'
    if (!temEvidencia || !temContato || !temServico) {
      throw new Error(
        'lead_qualificado exige evidencia de necessidade real, contato valido e servico definido (ICP sem campo tecnico nesta fase)',
      )
    }
  }

  if (estado === 'proposta') {
    if (!evidencia || evidencia.trim() === '') {
      throw new Error('proposta exige evidencia de proposta registrada')
    }
  }

  e.next()
}, 'demandas')
