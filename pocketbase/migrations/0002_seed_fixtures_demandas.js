// pocketbase/migrations/0002_seed_fixtures_demandas.js
// SPEC-F1-001 — Fixtures de teste para validação do dicionário
// FIX-IN-001, FIX-OUT-001, FIX-UNK-001, FIX-DUP-001 + FIX-SEC-001 (sensível)

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('demandas')

    const fixtures = [
      // FIX-IN-001: Inbound, campanha F1-FIXTURE-IN
      {
        record_id: 'FIX-IN-001',
        empresa: 'Empresa Alpha (fixture)',
        contato_ref: 'contato-alpha@fixture.test',
        tipo_origem: 'inbound',
        canal: 'site',
        campanha: 'F1-FIXTURE-IN',
        oferta_servico: 'R&S',
        segmento: 'TI',
        data: '2026-08-19',
        responsavel: 'João Paulo (fixture)',
        estado: 'suspect',
        proxima_acao: 'Classificar origem e qualidade',
        prazo: '2026-08-25',
        resultado: '',
        evidencia: 'Fixture de teste — dado sintético para validação do dicionário',
        qualidade: 'ok',
      },
      // FIX-OUT-001: Outbound, campanha F1-FIXTURE-OUT
      {
        record_id: 'FIX-OUT-001',
        empresa: 'Empresa Beta (fixture)',
        contato_ref: 'contato-beta@fixture.test',
        tipo_origem: 'outbound',
        canal: 'linkedin',
        campanha: 'F1-FIXTURE-OUT',
        oferta_servico: 'Terceirização',
        segmento: 'Financeiro',
        data: '2026-08-19',
        responsavel: 'Consultor (fixture)',
        estado: 'prospect',
        proxima_acao: 'Enviar proposta comercial',
        prazo: '2026-08-26',
        resultado: '',
        evidencia: 'Fixture de teste — dado sintético para validação do dicionário',
        qualidade: 'ok',
      },
      // FIX-UNK-001: Origem desconhecida
      {
        record_id: 'FIX-UNK-001',
        empresa: 'Empresa Gamma (fixture)',
        contato_ref: '',
        tipo_origem: 'desconhecido',
        canal: '',
        campanha: '',
        oferta_servico: '',
        segmento: '',
        data: '',
        responsavel: '',
        estado: 'suspect',
        proxima_acao: 'Identificar origem',
        prazo: '2026-08-25',
        resultado: '',
        evidencia: 'Fixture de teste — registro sem origem para validar RN-F1-002',
        qualidade: 'desconhecido',
      },
      // FIX-DUP-001: Possível duplicidade (mesma empresa, sem id estável)
      {
        record_id: 'FIX-DUP-001',
        empresa: 'Empresa Alpha (fixture)',
        contato_ref: 'outro-contato@fixture.test',
        tipo_origem: 'inbound',
        canal: 'indicacao',
        campanha: '',
        oferta_servico: 'R&S',
        segmento: 'TI',
        data: '2026-08-18',
        responsavel: '',
        estado: 'suspect',
        proxima_acao: 'Verificar duplicidade com FIX-IN-001',
        prazo: '2026-08-25',
        resultado: '',
        evidencia: 'Fixture de teste — mesma empresa, sem id estável, para validar RN-F1-004',
        qualidade: 'pendente',
      },
      // FIX-SEC-001: Registro com sinal sensível do DHO (restrito)
      {
        record_id: 'FIX-SEC-001',
        empresa: 'Empresa Delta (fixture)',
        contato_ref: 'contato-delta@fixture.test',
        tipo_origem: 'outbound',
        canal: 'evento',
        campanha: 'F1-FIXTURE-OUT',
        oferta_servico: 'Testes Psicológicos',
        segmento: 'Saúde',
        data: '2026-08-19',
        responsavel: 'Consultor (fixture)',
        estado: 'suspect',
        proxima_acao: 'Avaliar se dado sensível entra no escopo',
        prazo: '2026-08-25',
        resultado: '',
        evidencia:
          'Fixture de teste — simula registro com sensibilidade para validação de privacidade',
        qualidade: 'restrito',
      },
    ]

    fixtures.forEach((f) => {
      try {
        // Skip if already exists (idempotent)
        app.findFirstRecordByData('demandas', 'record_id', f.record_id)
        console.log(`Fixture ${f.record_id} já existe — pulando`)
      } catch (_) {
        const record = new Record(col, f)
        app.save(record)
        console.log(`Fixture ${f.record_id} inserido com sucesso`)
      }
    })
  },
  (app) => {
    // Down: remove all fixtures
    try {
      const fixtures = app.findRecordsByFilter('demandas', 'record_id ~ "FIX-"', '', 100, 0)
      fixtures.forEach((r) => app.delete(r))
      console.log(`${fixtures.length} fixtures removidos`)
    } catch (_) {
      console.log('Nenhum fixture para remover')
    }
  },
)
