// pocketbase/hooks/pipeline_transicoes_update.js
// F1-T04 — Validacao de transicoes no pipeline 'demandas' (model hook onRecordUpdate)
// Usa e.oldRecord para o estado anterior (sem $app dentro de model hook).
// Rejeicao via throw new Error -> HTTP 400 e nao persiste.

onRecordUpdate((e) => {
  const record = e.record
  const old = e.oldRecord || null

  const estadoAtual = record.getString('estado')
  const estadoAnterior = old ? old.getString('estado') : ''

  const responsavel = record.getString('responsavel')
  const proximaAcao = record.getString('proxima_acao')
  const prazo = record.getString('prazo')
  const evidencia = record.getString('evidencia')
  const resultado = record.getString('resultado')
  const statusProposta = record.getString('status_proposta')
  const dataConquista = record.getString('data_conquista')
  const tipoConquista = record.getString('tipo_conquista')
  const contatoRef = record.getString('contato_ref')
  const ofertaServico = record.getString('oferta_servico')

  const TERMINAIS = ['ganho', 'perdido', 'sem_timing', 'desqualificado']
  const NAO_TERMINAIS = ['prospect', 'lead_qualificado', 'oportunidade', 'proposta', 'vaga_aberta']

  // 1. A partir de prospect, campos obrigatorios (emenda E1 / CA-1-07)
  if (NAO_TERMINAIS.includes(estadoAtual)) {
    const faltando = []
    if (!responsavel || responsavel.trim() === '') faltando.push('responsavel')
    if (!proximaAcao || proximaAcao.trim() === '') faltando.push('proxima_acao')
    if (!prazo || prazo.trim() === '') faltando.push('prazo')
    if (faltando.length > 0) {
      throw new Error(
        'registro em ' +
          estadoAtual +
          ' exige responsavel, proxima_acao e prazo (emenda E1): faltando ' +
          faltando.join(','),
      )
    }
  }

  // 2. lead_qualificado exige criterios
  if (estadoAtual === 'lead_qualificado') {
    const temEvidencia = evidencia && evidencia.trim() !== ''
    const temContato = contatoRef && contatoRef.trim() !== ''
    const temServico =
      ofertaServico && ofertaServico.trim() !== '' && ofertaServico !== 'a identificar'
    if (!temEvidencia || !temContato || !temServico) {
      throw new Error(
        'lead_qualificado exige evidencia de necessidade real, contato valido e servico definido',
      )
    }
  }

  // 3. proposta -> vaga_aberta exige proposta aceita
  if (estadoAnterior === 'proposta' && estadoAtual === 'vaga_aberta') {
    if (statusProposta !== 'aceita') {
      throw new Error('proposta -> vaga_aberta exige status_proposta = aceita')
    }
  }

  // 4. vaga_aberta -> ganho exige evidencia de fechamento (CA-1-10)
  if (estadoAnterior === 'vaga_aberta' && estadoAtual === 'ganho') {
    if (!evidencia || evidencia.trim() === '') {
      throw new Error('vaga_aberta -> ganho exige evidencia de fechamento (CA-1-10)')
    }
  }

  // 5. Terminais exigem motivo; ganho exige evidencia
  if (TERMINAIS.includes(estadoAtual)) {
    if (!resultado || resultado.trim() === '') {
      throw new Error('estado terminal exige motivo (resultado) preenchido (RN-F1-009)')
    }
    if (estadoAtual === 'ganho' && (!evidencia || evidencia.trim() === '')) {
      throw new Error('ganho exige evidencia de fechamento')
    }
  }

  // 6. Nao retroceder de terminal
  if (
    estadoAnterior &&
    TERMINAIS.includes(estadoAnterior) &&
    estadoAtual &&
    !TERMINAIS.includes(estadoAtual)
  ) {
    throw new Error('nao e permitido retroceder de estado terminal')
  }

  // 7. data_conquista so em vaga_aberta/ganho; 1a demanda exige data_conquista
  if (
    dataConquista &&
    dataConquista.trim() !== '' &&
    !['vaga_aberta', 'ganho'].includes(estadoAtual)
  ) {
    throw new Error('data_conquista so pode ser preenchida nos estados vaga_aberta ou ganho')
  }
  if (
    estadoAtual === 'vaga_aberta' &&
    evidencia &&
    evidencia.trim() !== '' &&
    (!dataConquista || dataConquista.trim() === '')
  ) {
    throw new Error('primeira vaga/demanda valida exige data_conquista preenchida')
  }

  // 8. tipo_conquista nao inventado sem evidencia
  if (tipoConquista && tipoConquista.trim() !== '' && (!evidencia || evidencia.trim() === '')) {
    throw new Error('tipo_conquista nao pode ser preenchido sem evidencia de historico')
  }

  e.next()
}, 'demandas')
