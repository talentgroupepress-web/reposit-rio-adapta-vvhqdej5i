migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('experimentos_f2')
    const owner1 = app.findAuthRecordByEmail(
      '_pb_users_auth_',
      'humano-sintetico-dono-01@f2.invalid',
    )
    const briefing1 = app.findAuthRecordByEmail(
      '_pb_users_auth_',
      'humano-sintetico-briefing-01@f2.invalid',
    )
    const owner2 = app.findAuthRecordByEmail(
      '_pb_users_auth_',
      'humano-sintetico-dono-02@f2.invalid',
    )
    const briefing2 = app.findAuthRecordByEmail(
      '_pb_users_auth_',
      'humano-sintetico-briefing-02@f2.invalid',
    )
    const rows = [
      {
        id: 'EXP-F2-IN-001',
        title: 'Teste sintético inbound R&S',
        service: 'R&S',
        origin: 'inbound',
        channel: 'site/formulário sintético',
        owner: owner1,
        briefing: briefing1,
        budget: 1000,
      },
      {
        id: 'EXP-F2-OUT-001',
        title: 'Teste sintético outbound TMO',
        service: 'TMO',
        origin: 'outbound',
        channel: 'prospecção manual sintética',
        owner: owner2,
        briefing: briefing2,
        budget: 500,
      },
    ]
    rows.forEach((row) => {
      try {
        app.findFirstRecordByData('experimentos_f2', 'experiment_id', row.id)
      } catch (_) {
        const record = new Record(col)
        record.set('experiment_id', row.id)
        record.set('title', row.title)
        record.set('service', row.service)
        record.set('origin', row.origin)
        record.set('channel', row.channel)
        record.set('briefing_version', 'v1')
        record.set('state', 'Rascunho')
        record.set(
          'offer',
          JSON.stringify({
            message: 'oferta sintética',
            problem: 'problema sintético',
            expected_result: 'resultado sintético',
          }),
        )
        record.set(
          'hypothesis',
          JSON.stringify({
            se: 'teste sintético',
            para: 'público sintético',
            entao: 'resultado observável',
            porque: 'massa de teste',
            mediremos_por: ['completude'],
          }),
        )
        record.set(
          'audience',
          JSON.stringify({
            role: row.service === 'R&S' ? 'gestor de RH sintético' : 'gestor de TI sintético',
            company: 'empresa sintética sem identidade real',
            icp: 'referência sem inferência',
          }),
        )
        record.set(
          'execution_window',
          JSON.stringify({
            type: 'sintética/teste',
            start: '2026-10-01',
            end: '2026-10-07',
            timezone: 'America/Sao_Paulo',
          }),
        )
        record.set('analysis_period', '2026-10-08 a 2026-10-15 (sintético/teste)')
        record.set(
          'budget',
          JSON.stringify({
            amount: row.budget,
            currency: 'BRL',
            origin: 'sintético/teste',
            approval: 'não solicitada',
          }),
        )
        record.set(
          'criteria',
          JSON.stringify({
            continue: 'registro completo',
            adjust: 'correção',
            interrupt: 'governança',
            inconclusive: 'evidência insuficiente',
          }),
        )
        record.set('owner_user', row.owner.id)
        record.set('briefing_responsible', row.briefing.id)
        record.set('synthetic_only', true)
        app.save(record)
      }
    })
  },
  (app) => {
    try {
      app
        .db()
        .newQuery(
          "DELETE FROM experimentos_f2 WHERE experiment_id IN ('EXP-F2-IN-001','EXP-F2-OUT-001')",
        )
        .execute()
    } catch (_) {}
  },
)
