migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('experimentos_f2')
    const owner = app.findAuthRecordByEmail(
      '_pb_users_auth_',
      'humano-sintetico-dono-01@f2.invalid',
    )
    const responsible = app.findAuthRecordByEmail(
      '_pb_users_auth_',
      'humano-sintetico-briefing-01@f2.invalid',
    )
    try {
      app.findFirstRecordByData('experimentos_f2', 'experiment_id', 'EXP-F2-RED-001')
    } catch (_) {
      const record = new Record(col)
      record.set('experiment_id', 'EXP-F2-RED-001')
      record.set('title', 'Teste negativo — briefing incompleto')
      record.set('service', 'R&S')
      record.set('origin', 'inbound')
      record.set('channel', 'site/formulário sintético')
      record.set('briefing_version', 'v1')
      record.set('state', 'Rascunho')
      record.set('offer', JSON.stringify({ descricao: '' }))
      record.set('hypothesis', JSON.stringify({ se: '', para: '', entao: '' }))
      record.set('audience', JSON.stringify({ papel: '', empresa: '' }))
      record.set('execution_window', JSON.stringify({ inicio: '', fim: '' }))
      record.set('analysis_period', '')
      record.set('budget', JSON.stringify({ valor: null, moeda: 'BRL' }))
      record.set('criteria', JSON.stringify({}))
      record.set('owner_user', owner.id)
      record.set('briefing_responsible', responsible.id)
      record.set('synthetic_only', true)
      record.set('publication_status', 'não solicitado')
      record.set('spend_status', 'não solicitado')
      app.save(record)
    }
  },
  (app) => {
    try {
      app
        .db()
        .newQuery("DELETE FROM experimentos_f2 WHERE experiment_id = 'EXP-F2-RED-001'")
        .execute()
    } catch (_) {}
  },
)
