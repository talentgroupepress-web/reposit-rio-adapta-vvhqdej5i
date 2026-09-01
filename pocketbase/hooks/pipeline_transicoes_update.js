// pocketbase/hooks/pipeline_transicoes_update.js
// F1-T04 — Validacao de transicoes no pipeline 'demandas' (model hook onRecordUpdate)
// Estado anterior via record.original() (API oficial do runtime).
// CORRECAO 31/08 (autorizacao Champion):
//   1) autopreenchimento de data_conversao_comercial no aceite (status_proposta -> aceita)
//   2) preservacao da data original (nao sobrescreve em edicoes posteriores)
//   3) motivo especifico de recusa observavel: BadRequestError com mensagem + log
//   4) vaga_aberta -> ganho exige NOVA evidencia de fechamento nesta atualizacao (orig != novo)

onRecordUpdate((e) => {
  const record = e.record

  let original = null
  try {
    original = record.original()
  } catch (_) {
    original = null
  }
  const oldVal = (field) => {
    try {
      if (!original) return ''
      const v = original.getString ? original.getString(field) : ''
      return v || ''
    } catch (_) {
      return ''
    }
  }

  const estadoAtual = record.getString('estado')
  const estadoAnterior = oldVal('estado')

  const responsavel = record.getString('responsavel')
  const proximaAcao = record.getString('proxima_acao')
  const prazo = record.getString('prazo')
  const evidencia = record.getString('evidencia')
  const evidenciaAnterior = oldVal('evidencia')
  const resultado = record.getString('resultado')
  const statusProposta = record.getString('status_proposta')
  const dataConquista = record.getString('data_conquista')
  const tipoConquista = record.getString('tipo_conquista')
  const contatoRef = record.getString('contato_ref')
  const ofertaServico = record.getString('oferta_servico')
  const qualidade = record.getString('qualidade')
  const handoffStatus = record.getString('handoff_status')
  const handoffStatusAnterior = oldVal('handoff_status')
  const icpValidado = record.getString('icp_validado')

  const statusAnterior = oldVal('status_proposta')
  const dataConversao = record.getString('data_conversao_comercial')
  const dataConversaoAnterior = oldVal('data_conversao_comercial')

  const TERMINAIS = ['ganho', 'perdido', 'sem_timing', 'desqualificado']
  const NAO_TERMINAIS = ['prospect', 'lead_qualificado', 'oportunidade', 'proposta', 'vaga_aberta']

  // ---------------------------------------------------------------
  // CORRECAO 1 + 2: data_conversao_comercial
  // ---------------------------------------------------------------
  // 2. Preservar data original: nunca sobrescrever data ja existente
  if (
    dataConversaoAnterior &&
    dataConversaoAnterior.trim() !== '' &&
    dataConversao !== dataConversaoAnterior
  ) {
    record.set('data_conversao_comercial', dataConversaoAnterior)
  }

  // 1. Autopreenchimento: no primeiro momento em que status_proposta = aceita
  if (
    statusProposta === 'aceita' &&
    statusAnterior !== 'aceita' &&
    (!dataConversao || dataConversao.trim() === '')
  ) {
    record.set('data_conversao_comercial', new Date().toISOString())
  }

  // ---------------------------------------------------------------
  // Helper de recusa: motivo especifico identificavel
  // BadRequestError (documentado) -> expoe a mensagem na resposta HTTP 400
  // com fallback para Error e log via $app.logger() (protegido)
  // ---------------------------------------------------------------
  const recusar = (motivo) => {
    try {
      $app.logger().warn('transicao_recusada', {
        collection: 'demandas',
        record_id: record.getString('record_id'),
        estado_anterior: estadoAnterior || 'novo',
        estado_novo: estadoAtual,
        motivo: motivo,
      })
    } catch (_) {
      try {
        console.log('transicao_recusada|' + record.getString('record_id') + '|' + motivo)
      } catch (_2) {}
    }
    if (typeof BadRequestError !== 'undefined') {
      throw new BadRequestError(motivo)
    }
    throw new Error(motivo)
  }

  // F1-T05 — protecao do aceite que permitiu a entrada em Prospect
  if (handoffStatusAnterior === 'aceito' && handoffStatus !== 'aceito') {
    recusar('Nao e possivel alterar handoff_status=aceito apos o aceite do handoff.')
  }

  // F1-T05 — handoff enquanto o registro permanece Suspect
  if (estadoAtual === 'suspect' && handoffStatus === 'pendente') {
    if (!evidencia || evidencia.trim() === '') {
      recusar('Handoff pendente exige evidencia da tentativa de distribuicao.')
    }
  }
  if (estadoAtual === 'suspect' && handoffStatus === 'recusado') {
    const faltandoHandoff = []
    if (!resultado || resultado.trim() === '') faltandoHandoff.push('resultado')
    if (!evidencia || evidencia.trim() === '') faltandoHandoff.push('evidencia')
    if (!responsavel || responsavel.trim() === '') faltandoHandoff.push('responsavel')
    if (qualidade !== 'pendente') faltandoHandoff.push('qualidade=pendente')
    if (faltandoHandoff.length > 0) {
      recusar(
        'Handoff recusado exige resultado, evidencia, responsavel e qualidade=pendente. (faltando: ' +
          faltandoHandoff.join(', ') +
          ')',
      )
    }
  }

  // F1-T05 — retry exclusivamente manual e somente com nova evidencia
  if (
    estadoAnterior === 'suspect' &&
    handoffStatusAnterior === 'recusado' &&
    handoffStatus === 'pendente'
  ) {
    if (!evidencia || evidencia.trim() === '' || evidencia === evidenciaAnterior) {
      recusar('Retry de handoff exige nova evidencia da nova tentativa.')
    }
  }

  // F1-T05 — Suspect -> Prospect só após aceite do handoff
  if (estadoAnterior === 'suspect' && estadoAtual === 'prospect' && handoffStatus !== 'aceito') {
    recusar('Nao e possivel avancar para Prospect: handoff_status=aceito e obrigatorio.')
  }

  // 1. A partir de prospect, campos obrigatorios (emenda E1 / CA-1-07)
  if (NAO_TERMINAIS.includes(estadoAtual)) {
    const faltando = []
    if (!responsavel || responsavel.trim() === '') faltando.push('responsavel')
    if (!proximaAcao || proximaAcao.trim() === '') faltando.push('proxima_acao')
    if (!prazo || prazo.trim() === '') faltando.push('prazo')
    if (faltando.length > 0) {
      recusar(
        'Nao e possivel avancar para ' +
          estadoAtual +
          ': responsavel, proxima_acao e prazo sao obrigatorios. (faltando: ' +
          faltando.join(', ') +
          ')',
      )
    }
  }

  // F1-T05 — ICP é decisão humana obrigatória no Prospect -> Lead Qualificado
  if (estadoAnterior === 'prospect' && estadoAtual === 'lead_qualificado') {
    if (icpValidado === '') {
      recusar('ICP ainda não validado.')
    }
    if (icpValidado === 'nao') {
      recusar('Empresa validada como fora do ICP.')
    }
  }

  // 2. lead_qualificado exige criterios
  if (estadoAtual === 'lead_qualificado') {
    const temEvidencia = evidencia && evidencia.trim() !== ''
    const temContato = contatoRef && contatoRef.trim() !== ''
    const temServico =
      ofertaServico && ofertaServico.trim() !== '' && ofertaServico !== 'a identificar'
    if (!temEvidencia || !temContato || !temServico) {
      recusar(
        'Nao e possivel avancar para Lead Qualificado: os criterios obrigatorios de qualificacao nao foram atendidos.',
      )
    }
  }

  // 3. proposta -> vaga_aberta exige proposta aceita
  if (estadoAnterior === 'proposta' && estadoAtual === 'vaga_aberta') {
    if (statusProposta !== 'aceita') {
      recusar('Nao e possivel avancar para Vaga Aberta: a proposta precisa estar aceita.')
    }
  }

  // 4. vaga_aberta -> ganho exige NOVA evidencia de fechamento nesta atualizacao
  if (estadoAnterior === 'vaga_aberta' && estadoAtual === 'ganho') {
    const temNovaEvidencia = evidencia && evidencia.trim() !== '' && evidencia !== evidenciaAnterior
    if (!temNovaEvidencia) {
      recusar(
        'Nao e possivel marcar como Ganho: falta evidencia de fechamento da vaga/demanda (CA-1-10).',
      )
    }
  }

  // 5. Terminais exigem motivo; ganho exige evidencia
  if (TERMINAIS.includes(estadoAtual)) {
    if (!resultado || resultado.trim() === '') {
      recusar(
        'Nao e possivel marcar como ' + estadoAtual + ': exige motivo (resultado) preenchido.',
      )
    }
    if (estadoAtual === 'ganho' && (!evidencia || evidencia.trim() === '')) {
      recusar('Nao e possivel marcar como Ganho: falta evidencia de fechamento.')
    }
  }

  // 6. Nao retroceder de terminal
  if (
    estadoAnterior &&
    TERMINAIS.includes(estadoAnterior) &&
    estadoAtual &&
    !TERMINAIS.includes(estadoAtual)
  ) {
    recusar('Nao e possivel retroceder de um estado terminal.')
  }

  // 7. data_conquista so em vaga_aberta/ganho; 1a demanda exige data_conquista
  if (
    dataConquista &&
    dataConquista.trim() !== '' &&
    !['vaga_aberta', 'ganho'].includes(estadoAtual)
  ) {
    recusar('data_conquista so pode ser preenchida nos estados vaga_aberta ou ganho.')
  }
  if (
    estadoAtual === 'vaga_aberta' &&
    evidencia &&
    evidencia.trim() !== '' &&
    (!dataConquista || dataConquista.trim() === '')
  ) {
    recusar('Primeira vaga/demanda valida exige data_conquista preenchida (evento de conquista).')
  }

  // 8. tipo_conquista nao inventado sem evidencia
  if (tipoConquista && tipoConquista.trim() !== '' && (!evidencia || evidencia.trim() === '')) {
    recusar(
      'tipo_conquista nao pode ser preenchido sem evidencia de historico (aquisicao_nova x reativacao).',
    )
  }

  e.next()
}, 'demandas')
