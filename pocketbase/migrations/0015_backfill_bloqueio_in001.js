migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('bloqueios_f2')
    try {
      app.findFirstRecordByData('bloqueios_f2', 'experiment_id', 'EXP-F2-IN-001')
    } catch (_) {
      const record = new Record(col)
      record.set('experiment_id', 'EXP-F2-IN-001')
      record.set('briefing_version', 'v1')
      record.set('reason', 'teste humano — validação de bloqueio')
      record.set('affected_rule', 'Decisão 15 — bloqueios estruturados')
      record.set('identified_by', 'HUMANO-SINTETICO-BRIEFING-01')
      record.set('correction_needed', 'A definir pelo responsável do briefing.')
      record.set('status', 'aberto')
      app.save(record)
    }
  },
  (app) => {
    try {
      app
        .db()
        .newQuery(
          "DELETE FROM bloqueios_f2 WHERE experiment_id = 'EXP-F2-IN-001' AND reason = 'teste humano — validação de bloqueio'",
        )
        .execute()
    } catch (_) {}
  },
)
