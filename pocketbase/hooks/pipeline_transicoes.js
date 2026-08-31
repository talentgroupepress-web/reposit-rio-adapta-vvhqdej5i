// pocketbase/hooks/pipeline_transicoes.js
// F1-T04 — Hook de validação das transições do pipeline 'demandas'
// Regras aprovadas pelo Champion (31/08/2026) + emenda E1 da SPEC-F1-002.
// Rejeição via throw new Error -> PocketBase trata como 400 (Failed to ...)
// Log via $app.logger().

onRecordValidate((e) => {
  const record = e.record
  const collection = record.collection().name

  if (collection !== 'demandas') {
    e.next()
    return
  }

  // Registro anterior (null se for create)
  let old = null
  const recordId = record.getId()
  if (recordId && recordId !== '') {
    try {
      old = $app.findRecordById('demandas', recordId)
    } catch (_) {
      old = null
    }
  }

  const estadoAtual = record.getString('estado')
  const estadoAnterior = old ? old.getString('estado') : null

  const responsavel = record.getString('responsavel')
  const proximaAcao = record.getString('proxima_acao')
  const prazo = record.getString('prazo')
  const evidencia = record.getString('evidencia')
  const resultado = record.getString('resultado')
  const statusProposta = record.getString('status_proposta')
  const dataConversao = record.getString('data_conversao_comercial')
  const dataConquista = record.getString('data_conquista')
  const tipoConquista = record.getString('tipo_conquista')
  const ofertaServico = record.getString('oferta_servico')
  const contatoRef = record.getString('contato_ref')

  const TERMINAIS = ['ganho', 'perdido', 'sem_timing', 'desqualificado']
  const NAO_TERMINAIS_ACAO = [
    'prospect',
    'lead_qualificado',
    'oportunidade',
    'proposta',
    'vaga_aberta',
  ]

  // Recusa: loga e lança erro (400)
  const recusar = (motivo) => {
    $app.logger().warn('transicao_recusada', {
      record_id: record.getString('record_id'),
      estado_anterior: estadoAnterior || 'novo',
      estado_novo: estadoAtual,
      motivo,
    })
    throw new Error(motivo)
  }

  // ========== 1. Suspect pode existir sem responsável/próxima ação/prazo (emenda E1) ==========
  if (NAO_TERMINAIS_ACAO.includes(estadoAtual)) {
    const faltando = []
    if (!responsavel || responsavel.trim() === '') faltando.push('responsavel')
    if (!proximaAcao || proximaAcao.trim() === '') faltando.push('proxima_acao')
    if (!prazo || prazo.trim() === '') faltando.push('prazo')
    if (faltando.length > 0) {
      recusar(
        'registro nao terminal a partir de prospect exige responsavel, proxima_acao e prazo (CA-1-07 / emenda E1): faltando ' +
          faltando.join(','),
      )
    }
  }

  // ========== 2. suspect → prospect exige os 3 campos ==========
  if (estadoAnterior === 'suspect' && estadoAtual === 'prospect') {
    const faltando = []
    if (!responsavel || responsavel.trim() === '') faltando.push('responsavel')
    if (!proximaAcao || proximaAcao.trim() === '') faltando.push('proxima_acao')
    if (!prazo || prazo.trim() === '') faltando.push('prazo')
    if (faltando.length > 0) {
      recusar(
        'suspect -> prospect exige responsavel, proxima_acao e prazo (emenda E1): faltando ' +
          faltando.join(','),
      )
    }
  }

  // ========== 3. lead_qualificado exige os critérios ==========
  if (estadoAtual === 'lead_qualificado') {
    const temEvidencia = evidencia && evidencia.trim() !== ''
    const temContato = contatoRef && contatoRef.trim() !== ''
    const temServico =
      ofertaServico && ofertaServico.trim() !== '' && ofertaServico !== 'a identificar'
    if (!temEvidencia || !temContato || !temServico) {
      recusar(
        'lead_qualificado exige evidencia de necessidade real, contato valido e servico definido (criterio de ICP sem campo tecnico nesta fase)',
      )
    }
  }

  // ========== 4. oportunidade exige demanda concreta + avanço ==========
  if (estadoAtual === 'oportunidade' && estadoAnterior === 'lead_qualificado') {
    const temEvidencia = evidencia && evidencia.trim() !== ''
    const temResponsavel = responsavel && responsavel.trim() !== ''
    const temProximaAcao = proximaAcao && proximaAcao.trim() !== ''
    if (!temEvidencia || !temResponsavel || !temProximaAcao) {
      recusar('oportunidade exige demanda concreta em andamento, responsavel e proxima acao')
    }
  }

  // ========== 5. proposta exige evidência de proposta registrada ==========
  if (estadoAtual === 'proposta') {
    const temEvidencia = evidencia && evidencia.trim() !== ''
    if (!temEvidencia) {
      recusar('proposta exige evidencia de proposta registrada')
    }
  }

  // ========== 6. proposta → vaga_aberta exige proposta aceita ==========
  if (estadoAnterior === 'proposta' && estadoAtual === 'vaga_aberta') {
    if (statusProposta !== 'aceita') {
      recusar('proposta -> vaga_aberta exige status_proposta = aceita')
    }
    if (!dataConversao || dataConversao.trim() === '') {
      record.set('data_conversao_comercial', new Date().toISOString())
    }
  }

  // ========== 7. vaga_aberta → ganho exige evidência de fechamento (CA-1-10) ==========
  if (estadoAnterior === 'vaga_aberta' && estadoAtual === 'ganho') {
    const temEvidencia = evidencia && evidencia.trim() !== ''
    if (!temEvidencia) {
      recusar('vaga_aberta -> ganho exige evidencia de fechamento da vaga/demanda (CA-1-10)')
    }
  }

  // ========== 8. Estados terminais exigem motivo (e evidência p/ ganho) ==========
  if (TERMINAIS.includes(estadoAtual)) {
    const temMotivo = resultado && resultado.trim() !== ''
    if (!temMotivo) {
      recusar('estado terminal exige motivo (resultado) preenchido (RN-F1-009)')
    }
    if (estadoAtual === 'ganho') {
      const temEvidencia = evidencia && evidencia.trim() !== ''
      if (!temEvidencia) {
        recusar('ganho exige evidencia de fechamento')
      }
    }
  }

  // ========== 9. Não retroceder de estado terminal ==========
  if (estadoAnterior && TERMINAIS.includes(estadoAnterior) && !TERMINAIS.includes(estadoAtual)) {
    recusar('nao e permitido retroceder de estado terminal')
  }

  // ========== 10. Conquista: 1ª vaga/demanda válida → data_conquista ==========
  if (
    dataConquista &&
    dataConquista.trim() !== '' &&
    !['vaga_aberta', 'ganho'].includes(estadoAtual)
  ) {
    recusar('data_conquista so pode ser preenchida nos estados vaga_aberta ou ganho')
  }
  if (estadoAtual === 'vaga_aberta' && estadoAnterior !== 'vaga_aberta') {
    const temEvidencia = evidencia && evidencia.trim() !== ''
    if (temEvidencia && (!dataConquista || dataConquista.trim() === '')) {
      recusar('primeira vaga/demanda valida exige data_conquista preenchida (evento de conquista)')
    }
  }

  // ========== 11. tipo_conquista não pode ser inventado sem evidência ==========
  if (tipoConquista && tipoConquista.trim() !== '') {
    const temEvidencia = evidencia && evidencia.trim() !== ''
    if (!temEvidencia) {
      recusar(
        'tipo_conquista nao pode ser preenchido sem evidencia de historico (aquisicao_nova x reativacao)',
      )
    }
  }

  e.next()
}, 'demandas')
