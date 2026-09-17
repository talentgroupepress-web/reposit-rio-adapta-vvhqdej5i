// F2-T05 — registro humano de decisão e fila da próxima ação.
// Escopo: uma collection nova, massa sintética, sem relação com demandas.

migrate(
  (app) => {
    const authenticated = "@request.auth.id != ''"
    const decisionMaker =
      "@request.auth.id != '' && (@request.auth.role = 'champion' || @request.auth.role = 'delegado_f2')"
    const decisions = new Collection({
      name: 'decisoes_f2',
      type: 'base',
      listRule: authenticated,
      viewRule: authenticated,
      createRule: `${authenticated} && @request.body.status = 'pendente'`,
      updateRule: decisionMaker,
      deleteRule: '',
      fields: [
        { name: 'decision_id', type: 'text', required: true },
        { name: 'experiment_id', type: 'text', required: true },
        { name: 'briefing_version', type: 'text', required: true },
        { name: 'analysis_period', type: 'text', required: true },
        { name: 'criterion_snapshot', type: 'json', required: true },
        { name: 'evidence_ref', type: 'text', required: true },
        {
          name: 'evidence_mode',
          type: 'select',
          required: true,
          values: ['sintetico_manual', 'manual', 'reconciliado'],
          maxSelect: 1,
        },
        { name: 'evidence_snapshot', type: 'json', required: true },
        { name: 'volume_evidence', type: 'text', required: true },
        { name: 'quality_evidence', type: 'text', required: true },
        { name: 'divergences', type: 'text', required: false },
        { name: 'responsible_reading', type: 'text', required: true },
        {
          name: 'decision',
          type: 'select',
          required: false,
          values: ['continuar', 'ajustar', 'interromper'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pendente', 'registrada', 'revogada'],
          maxSelect: 1,
        },
        { name: 'decision_reason', type: 'text', required: false },
        { name: 'decider_label', type: 'text', required: true },
        {
          name: 'decided_by',
          type: 'relation',
          required: false,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'decided_at', type: 'date', required: false },
        { name: 'owner_label', type: 'text', required: true },
        { name: 'next_action', type: 'text', required: true },
        { name: 'next_action_owner', type: 'text', required: true },
        { name: 'next_action_due', type: 'date', required: false },
        {
          name: 'next_action_status',
          type: 'select',
          required: true,
          values: ['pendente', 'em_andamento', 'concluida'],
          maxSelect: 1,
        },
        { name: 'next_action_evidence', type: 'text', required: false },
        { name: 'previous_decision_id', type: 'text', required: false },
        { name: 'revocation_reason', type: 'text', required: false },
        {
          name: 'revoked_by',
          type: 'relation',
          required: false,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'revoked_at', type: 'date', required: false },
        { name: 'synthetic_only', type: 'bool', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_decisoes_f2_decision_id ON decisoes_f2 (decision_id)',
        'CREATE INDEX idx_decisoes_f2_experiment_status ON decisoes_f2 (experiment_id, status)',
        'CREATE INDEX idx_decisoes_f2_action_due ON decisoes_f2 (next_action_status, next_action_due)',
      ],
    })
    app.save(decisions)

    const champion = (() => {
      try {
        return app.findAuthRecordByEmail(
          '_pb_users_auth_',
          'humano-sintetico-aprovador-01@f2.invalid',
        )
      } catch (_) {
        return null
      }
    })()

    const col = app.findCollectionByNameOrId('decisoes_f2')
    const base = {
      analysis_period: '2026-10-08 a 2026-10-15 (período sintético)',
      criterion_snapshot: JSON.stringify({
        continuar: 'briefing completo e aprovado para preparação',
        ajustar: 'correção/variação antes de nova revisão',
        interromper: 'risco de governança identificado por humano',
        inconclusivo: 'evidência insuficiente — permanece pendente',
      }),
      evidence_mode: 'sintetico_manual',
      evidence_snapshot: JSON.stringify({
        fonte: 'F2-T04-SOURCE-001',
        modo: 'snapshot sintético/manual',
        observacao: 'não representa atribuição real entre campanha e demanda',
      }),
      divergences:
        'Associação ao relatório/lote T04 é sintética/manual; sem vínculo estrutural com demandas.',
      synthetic_only: true,
      next_action_status: 'pendente',
    }

    const fixtures = [
      {
        decision_id: 'DEC-F2-RED-001',
        experiment_id: 'EXP-F2-RED-001',
        briefing_version: 'v4',
        evidence_ref: 'F2-T04-SOURCE-001 / RED sintético',
        volume_evidence: '12 cliques; 0 leads qualificados; 0 oportunidades.',
        quality_evidence: 'Somente clique/atividade; qualidade comercial ausente.',
        responsible_reading:
          'Amostra insuficiente. Clique isolado não prova qualidade nem sucesso.',
        decision: '',
        status: 'pendente',
        decision_reason: '',
        decider_label: 'João Paulo (Champion/direção)',
        owner_label: 'João Paulo (Champion/direção)',
        next_action: 'Definir critério real e coletar evidência de qualidade na próxima janela.',
        next_action_owner: 'João Paulo (Champion/direção)',
        next_action_due: '2026-10-16 00:00:00.000Z',
      },
      {
        decision_id: 'DEC-F2-001',
        experiment_id: 'EXP-F2-IN-001',
        briefing_version: 'v3',
        evidence_ref: 'F2-T04-SOURCE-001 / GREEN sintético',
        volume_evidence: '12 cliques; 3 capturas sintéticas.',
        quality_evidence: '1 lead qualificado sintético; 0 oportunidades sintéticas.',
        responsible_reading:
          'Há sinal inicial, mas a qualidade ainda não sustenta continuar sem ajuste.',
        decision: 'ajustar',
        status: 'registrada',
        decision_reason:
          'Ajustar a mensagem e abrir nova versão do briefing; não publicar nem alterar orçamento.',
        decider_label: 'João Paulo (Champion/direção)',
        owner_label: 'João Paulo (Champion/direção)',
        next_action: 'Criar nova versão do briefing para ajustar a mensagem e repetir a janela.',
        next_action_owner: 'Marketing/gestor do experimento',
        next_action_due: '2026-10-20 00:00:00.000Z',
        next_action_status: 'pendente',
      },
      {
        decision_id: 'DEC-F2-ROLLBACK-001',
        experiment_id: 'EXP-F2-OUT-001',
        briefing_version: 'v3',
        evidence_ref: 'F2-T04-SOURCE-001 / rollback sintético',
        volume_evidence: '8 cliques; 2 capturas sintéticas.',
        quality_evidence: '1 lead qualificado sintético; evidência suficiente para revisão humana.',
        responsible_reading: 'Decisão sintética registrada para provar preservação e revogação.',
        decision: 'continuar',
        status: 'registrada',
        decision_reason: 'Fixture de rollback; não publica nem altera orçamento.',
        decider_label: 'João Paulo (Champion/direção)',
        owner_label: 'João Paulo (Champion/direção)',
        next_action: 'Revisar a evidência da próxima janela antes de qualquer nova decisão.',
        next_action_owner: 'João Paulo (Champion/direção)',
        next_action_due: '2026-10-22 00:00:00.000Z',
        next_action_status: 'pendente',
      },
    ]

    fixtures.forEach((fixture) => {
      try {
        app.findFirstRecordByData('decisoes_f2', 'decision_id', fixture.decision_id)
      } catch (_) {
        const record = new Record(col, { ...base, ...fixture })
        if (champion && fixture.status === 'registrada') {
          record.set('decided_by', champion.id)
          record.set('decided_at', '2026-10-15 00:00:00.000Z')
        }
        app.save(record)
      }
    })
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('decisoes_f2'))
  },
)
