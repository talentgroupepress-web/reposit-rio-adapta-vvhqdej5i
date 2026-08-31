// pocketbase/hooks/pipeline_transicoes_update.js
// F1-T04 — Validacao de UPDATE/transicoes no pipeline 'demandas' (request hook)
// Mescla body com o registro atual para suportar PATCH parcial.

onRecordUpdateRequest((e) => {
  let current = null
  try {
    current = $app.findRecordById('demandas', e.request.pathValue('id'))
  } catch (_) {
    current = null
  }

  const body = e.requestInfo().body || {}
  const get = (field, cur) => {
    if (typeof body[field] !== 'undefined') return body[field] || ''
    return cur ? cur.getString(field) : ''
  }

  const estadoAtual = get('estado', current)
  const estadoAnterior = current ? current.getString('estado') : ''
  const responsavel = get('responsavel', current)
  const proximaAcao = get('proxima_acao', current)
  const prazo = get('prazo', current)
  const evidencia = get('evidencia', current)
  const resultado = get('resultado', current)
  const statusProposta = get('status_proposta', current)
  const dataConquista = get('data_conquista', current)
  const tipoConquista = get('tipo_conquista', current)
  const contatoRef = get('contato_ref', current)
  const ofertaServico = get('oferta_servico', current)

  const TERMINAIS = ['ganho', 'perdido', 'sem_timing', 'desqualificado']
  const NAO_TERMINAIS_ACAO = [
    'prospect',
    'lead_qualificado',
    'oportunidade',
    'proposta',
    'vaga_aberta',
  ]

  // 1. Campos obrigatorios a partir de prospect / suspect->prospect
  if (estadoAtual === 'prospect' || NAO_TERMINAIS_ACAO.includes(estadoAtual)) {
    const faltando = []
    if (!responsavel || responsavel.trim() === '') faltando.push('responsavel')
    if (!proximaAcao || proximaAcao.trim() === '') faltando.push('proxima_acao')
    if (!prazo || prazo.trim() === '') faltando.push('prazo')
    if (faltando.length > 0) {
      throw new Error(
        'registro em ' +
          estadoAtual +
          ' exige responsavel, proxima_acao e prazo (CA-1-07/emenda E1): faltando ' +
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
        'lead_qualificado exige evidencia de necessidade real, contato valido e servico definido (ICP sem campo tecnico nesta fase)',
      )
    }
  }

  // 3. proposta -> vaga_aberta exige proposta aceita
  if (estadoAnterior === 'proposta' && estadoAtual === 'vaga_aberta') {
    if (statusProposta !== 'aceita') {
      throw new Error('proposta -> vaga_aberta exige status_proposta = aceita')
    }
  }

  // 4. vaga_aberta -> ganho exige evidencia de fechamento
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

  // 7. Conquista: data_conquista so em vaga_aberta/ganho; vaga_aberta com evidencia exige data_conquista
  if (
    dataConquista &&
    dataConquista.trim() !== '' &&
    !['vaga_aberta', 'ganho'].includes(estadoAtual)
  ) {
    throw new Error('data_conquista so pode ser preenchida nos estados vaga_aberta ou ganho')
  }
  if (
    estadoAtual === 'vaga_aberta' &&
    estadoAnterior !== 'vaga_aberta' &&
    evidencia &&
    evidencia.trim() !== '' &&
    (!dataConquista || dataConquista.trim() === '')
  ) {
    throw new Error(
      'primeira vaga/demanda valida exige data_conquista preenchida (evento de conquista)',
    )
  }

  // 8. tipo_conquista nao inventado sem evidencia
  if (tipoConquista && tipoConquista.trim() !== '' && (!evidencia || evidencia.trim() === '')) {
    throw new Error(
      'tipo_conquista nao pode ser preenchido sem evidencia de historico (aquisicao_nova x reativacao)',
    )
  }

  e.next()
}, 'demandas')
