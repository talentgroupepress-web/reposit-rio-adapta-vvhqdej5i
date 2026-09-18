// F2-T05 — invariantes de decisão humana; exclusivo da collection decisoes_f2.
// Não toca demandas, experimentos_f2 ou a T04.

onRecordUpdate((e) => {
  const record = e.record
  let previous = null
  try {
    previous = record.original()
  } catch (_) {
    previous = null
  }
  const old = (field) => {
    try {
      return previous ? previous.getString(field) || '' : ''
    } catch (_) {
      return ''
    }
  }
  const status = record.getString('status')
  const oldStatus = old('status')
  const decision = record.getString('decision')
  const decisionReason = record.getString('decision_reason')
  const nextAction = record.getString('next_action')
  const nextOwner = record.getString('next_action_owner')
  const nextDue = record.getString('next_action_due')
  const evidenceRef = record.getString('evidence_ref')
  const volume = record.getString('volume_evidence').toLowerCase()
  const quality = record.getString('quality_evidence').toLowerCase()
  const criterion = record.getString('criterion_snapshot')
  const nextActionHasNewVersion = /nova versão|nova versao/.test(nextAction.toLowerCase())

  const reject = (message) => {
    if (typeof BadRequestError !== 'undefined') throw new BadRequestError(message)
    throw new Error(message)
  }

  if (status === 'pendente') {
    if (decision) reject('Decisão pendente não pode conter continuar, ajustar ou interromper.')
    if (oldStatus && oldStatus !== 'pendente')
      reject('Somente uma decisão pendente pode retornar a pendente.')
    if (!criterion || !evidenceRef)
      reject('Decisão pendente exige critério e referência da evidência.')
  }

  if (status === 'registrada') {
    if (!['continuar', 'ajustar', 'interromper'].includes(decision)) {
      reject('Decisão registrada deve ser continuar, ajustar ou interromper.')
    }
    if (!criterion || !evidenceRef || !decisionReason || !nextAction || !nextOwner || !nextDue) {
      reject(
        'Decisão registrada exige critério, evidência, justificativa, dono, próxima ação e prazo.',
      )
    }
    const activityOnly = /(clique|impress|abandono)/.test(`${volume} ${quality}`)
    const qualityEvidence = /(lead qual|oportun|propost|convers|cliente)/.test(
      `${volume} ${quality}`,
    )
    if (activityOnly && !qualityEvidence)
      reject('Clique, impressão ou abandono isolado não permite registrar sucesso/qualidade.')
    if (decision === 'ajustar' && !nextActionHasNewVersion)
      reject('AJUSTAR exige próxima ação apontando nova versão do briefing.')
    if (oldStatus === 'revogada')
      reject('Decisão revogada não pode ser reaberta; crie uma nova decisão pendente.')
  }

  if (status === 'revogada') {
    if (oldStatus !== 'registrada') reject('Somente uma decisão registrada pode ser revogada.')
    if (!record.getString('revocation_reason')) reject('Revogação exige motivo.')
  }
  e.next()
}, 'decisoes_f2')
