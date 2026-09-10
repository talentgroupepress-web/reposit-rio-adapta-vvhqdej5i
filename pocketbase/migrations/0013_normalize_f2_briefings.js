migrate(
  (app) => {
    const briefingCol = app.findCollectionByNameOrId('experimentos_f2')

    const hipotese = JSON.stringify({
      se: 'a oferta de diagnóstico sintético for apresentada ao gestor sintético de RH',
      para: 'gestor sintético de RH de empresa sintética dentro do ICP',
      entao: 'o briefing registra interesse sintético e avança para revisão humana',
      porque: 'testa o encadeamento do briefing versionado da F2-T01',
      mediremos_por: ['completude do briefing', 'avanço de estado registrado'],
    })

    const publicoRs = JSON.stringify({
      papel: 'gestor de RH (sintético)',
      empresa: 'empresa sintética sem identidade real',
      icp: 'referência ao ICP aprovado, sem inferência automática',
      separacao: 'público experimental separado do ICP oficial',
    })

    const publicoTmo = JSON.stringify({
      papel: 'gestor de TI (sintético)',
      empresa: 'empresa sintética sem identidade real',
      icp: 'referência ao ICP aprovado, sem inferência automática',
      separacao: 'público experimental separado do ICP oficial',
    })

    const dados = [
      {
        experimentId: 'EXP-F2-IN-001',
        canal: 'site/formulário sintético',
        hipotese,
        publico: publicoRs,
        oferta: JSON.stringify({
          descricao: 'oferta sintética de diagnóstico de R&S, sem preço, margem ou desconto',
          resultado_rs: 'resultado de R&S observável apenas de forma sintética',
          resultado_tmo: 'não se aplica nesta massa',
        }),
        janela: JSON.stringify({
          inicio: '2026-10-01',
          fim: '2026-10-07',
          natureza: 'janela de execução prevista (sintética)',
        }),
        periodo: '2026-10-08 a 2026-10-15 (período de análise previsto, sintético)',
        orcamento: JSON.stringify({
          valor: 1000,
          moeda: 'BRL',
          periodo: 'semana sintética',
          origem: 'previsto, sem aprovação financeira',
          premissa: 'valor de teste, não representa campanha real',
        }),
        criterios: JSON.stringify({
          CONTINUAR: 'briefing completo e aprovado para preparação',
          AJUSTAR: 'correção de campo obrigatório antes de nova revisão',
          INTERROMPER: 'risco de governança identificado por humano',
          INCONCLUSIVO: 'evidência insuficiente na janela prevista',
        }),
      },
      {
        experimentId: 'EXP-F2-OUT-001',
        canal: 'prospecção manual sintética',
        hipotese,
        publico: publicoTmo,
        oferta: JSON.stringify({
          descricao:
            'oferta sintética de terceirização de mão de obra, sem preço, margem ou desconto',
          resultado_rs: 'não se aplica nesta massa',
          resultado_tmo: 'resultado de TMO observável apenas de forma sintética',
        }),
        janela: JSON.stringify({
          inicio: '2026-10-05',
          fim: '2026-10-12',
          natureza: 'janela de execução prevista (sintética)',
        }),
        periodo: '2026-10-13 a 2026-10-20 (período de análise previsto, sintético)',
        orcamento: JSON.stringify({
          valor: 500,
          moeda: 'BRL',
          periodo: 'semana sintética',
          origem: 'previsto, sem aprovação financeira',
          premissa: 'valor de teste, não representa campanha real',
        }),
        criterios: JSON.stringify({
          CONTINUAR: 'briefing completo e aprovado para preparação',
          AJUSTAR: 'correção de campo obrigatório antes de nova revisão',
          INTERROMPER: 'risco de governança identificado por humano',
          INCONCLUSIVO: 'evidência insuficiente na janela prevista',
        }),
      },
    ]

    dados.forEach((item) => {
      try {
        const briefing = app.findFirstRecordByData(briefingCol, 'experiment_id', item.experimentId)
        briefing.set('channel', item.canal)
        briefing.set('hypothesis', item.hipotese)
        briefing.set('audience', item.publico)
        briefing.set('offer', item.oferta)
        briefing.set('execution_window', item.janela)
        briefing.set('analysis_period', item.periodo)
        briefing.set('budget', item.orcamento)
        briefing.set('criteria', item.criterios)
        app.save(briefing)
      } catch (_) {}
    })
  },
  (app) => {},
)
