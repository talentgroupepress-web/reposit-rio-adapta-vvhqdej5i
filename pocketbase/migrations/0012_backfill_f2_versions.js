migrate(
  (app) => {
    const briefingCol = app.findCollectionByNameOrId('experimentos_f2')
    const versionCol = app.findCollectionByNameOrId('experimento_versoes_f2')

    const usuario = (email) => app.findAuthRecordByEmail('_pb_users_auth_', email)
    const dono1 = usuario('humano-sintetico-dono-01@f2.invalid')
    const resp1 = usuario('humano-sintetico-briefing-01@f2.invalid')
    const dono2 = usuario('humano-sintetico-dono-02@f2.invalid')
    const resp2 = usuario('humano-sintetico-briefing-02@f2.invalid')

    const rotulos = [
      ['EXP-F2-IN-001', dono1.get('name'), resp1.get('name')],
      ['EXP-F2-OUT-001', dono2.get('name'), resp2.get('name')],
    ]

    rotulos.forEach((linha) => {
      const [experimentId, donoLabel, respLabel] = linha
      try {
        const briefing = app.findFirstRecordByData('experimentos_f2', 'experiment_id', experimentId)
        briefing.set('owner_label', donoLabel)
        briefing.set('responsible_label', respLabel)
        app.save(briefing)
      } catch (_) {}
    })

    const versoes = [
      {
        id: 'f2v1expin000001',
        experimentId: 'EXP-F2-IN-001',
        actor: resp1,
        actorLabel: resp1.get('name'),
        resumo: 'Criação do briefing sintético inbound de R&S.',
      },
      {
        id: 'f2v1expout00001',
        experimentId: 'EXP-F2-OUT-001',
        actor: resp2,
        actorLabel: resp2.get('name'),
        resumo: 'Criação do briefing sintético outbound de TMO.',
      },
    ]

    versoes.forEach((item) => {
      try {
        app.findFirstRecordByData('experimento_versoes_f2', 'id', item.id)
      } catch (_) {
        const briefing = app.findFirstRecordByData(
          'experimentos_f2',
          'experiment_id',
          item.experimentId,
        )
        const record = new Record(versionCol)
        record.set('id', item.id)
        record.set('experiment_id', item.experimentId)
        record.set('version', briefing.get('briefing_version'))
        record.set('change_summary', item.resumo)
        record.set('reason', 'Criação inicial do briefing (massa sintética F2-T01).')
        record.set('snapshot', JSON.stringify(briefing))
        record.set('approval_status', 'não aprovada')
        record.set('actor', item.actor.id)
        record.set('actor_label', item.actorLabel)
        app.save(record)
      }
    })
  },
  (app) => {
    try {
      app
        .db()
        .newQuery(
          "DELETE FROM experimento_versoes_f2 WHERE id IN ('f2v1expin000001','f2v1expout00001')",
        )
        .execute()
    } catch (_) {}
  },
)
