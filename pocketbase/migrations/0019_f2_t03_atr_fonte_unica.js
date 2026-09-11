// pocketbase/migrations/0019_f2_t03_atr_fonte_unica.js
// F2-T03 — Contrato de atribuição de fonte única e fixtures de qualidade
// Escopo: dados sintéticos apenas; sem schema, collection, hook ou integração externa.

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('demandas')
    const fixtures = [
      {
        record_id: 'ATR-F2-IN-001',
        empresa: 'Empresa Atlas (fixture ATR inbound)',
        contato_ref: 'contato-atlas@fixture.test',
        tipo_origem: 'inbound',
        canal: 'site',
        campanha: 'F2-ATR-FONTE-UNICA-IN',
        oferta_servico: 'R&S',
        segmento: 'Tecnologia',
        data: '2026-09-11',
        responsavel: 'Responsável ATR inbound (sintético)',
        estado: 'suspect',
        proxima_acao: 'Validar atribuição da fonte declarada',
        prazo: '2026-09-18',
        resultado: '',
        evidencia:
          'F2-T03 — fixture sintética inbound; fonte declarada: collection demandas; chave: record_id',
        qualidade: 'ok',
      },
      {
        record_id: 'ATR-F2-OUT-001',
        empresa: 'Empresa Boreal (fixture ATR outbound)',
        contato_ref: 'contato-boreal@fixture.test',
        tipo_origem: 'outbound',
        canal: 'linkedin',
        campanha: 'F2-ATR-FONTE-UNICA-OUT',
        oferta_servico: 'Terceirização',
        segmento: 'Serviços financeiros',
        data: '2026-09-11',
        responsavel: 'Responsável ATR outbound (sintético)',
        estado: 'suspect',
        proxima_acao: 'Validar atribuição da fonte declarada',
        prazo: '2026-09-18',
        resultado: '',
        evidencia:
          'F2-T03 — fixture sintética outbound; fonte declarada: collection demandas; chave: record_id',
        qualidade: 'ok',
      },
      {
        record_id: 'ATR-F2-UNK-001',
        empresa: 'Empresa Cedro (fixture ATR desconhecida)',
        contato_ref: '',
        tipo_origem: 'desconhecido',
        canal: '',
        campanha: '',
        oferta_servico: '',
        segmento: '',
        data: '',
        responsavel: '',
        estado: 'suspect',
        proxima_acao: 'Identificar a origem sem inferência automática',
        prazo: '2026-09-18',
        resultado: '',
        evidencia:
          'F2-T03 — fixture sintética sem origem; fonte declarada: collection demandas; chave: record_id',
        qualidade: 'desconhecido',
      },
    ]

    fixtures.forEach((fixture) => {
      try {
        app.findFirstRecordByData('demandas', 'record_id', fixture.record_id)
        console.log(`Fixture ${fixture.record_id} já existe — preservada`)
      } catch (_) {
        const record = new Record(col, fixture)
        app.save(record)
        console.log(`Fixture ${fixture.record_id} inserida com sucesso`)
      }
    })
  },
  (app) => {
    const records = app.findRecordsByFilter(
      'demandas',
      'record_id = "ATR-F2-IN-001" || record_id = "ATR-F2-OUT-001" || record_id = "ATR-F2-UNK-001"',
      '',
      10,
      0,
    )
    records.forEach((record) => app.delete(record))
    console.log(`${records.length} fixtures F2-T03 removidas`)
  },
)
