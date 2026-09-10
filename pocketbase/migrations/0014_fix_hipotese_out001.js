migrate(
  (app) => {
    try {
      const briefing = app.findFirstRecordByData(
        'experimentos_f2',
        'experiment_id',
        'EXP-F2-OUT-001',
      )
      const hipotese = JSON.stringify({
        se: 'a oferta sintética de terceirização de mão de obra for apresentada ao gestor sintético de TI',
        para: 'gestor sintético de TI de empresa sintética dentro do ICP',
        entao: 'o briefing registra interesse sintético e avança para revisão humana',
        porque: 'testa o encadeamento do briefing versionado da F2-T01',
        mediremos_por: ['completude do briefing', 'avanço de estado registrado'],
      })
      briefing.set('hypothesis', hipotese)
      app.save(briefing)
    } catch (_) {}
  },
  (app) => {},
)
