migrate(
  (app) => {
    const authenticated = "@request.auth.id != ''"
    const fields = [
      { name: 'experiment_id', type: 'text', required: true },
      { name: 'title', type: 'text', required: true },
      {
        name: 'service',
        type: 'select',
        required: true,
        values: ['R&S', 'TMO', 'R&S + TMO'],
        maxSelect: 1,
      },
      { name: 'offer', type: 'json', required: true },
      { name: 'hypothesis', type: 'json', required: true },
      { name: 'audience', type: 'json', required: true },
      {
        name: 'origin',
        type: 'select',
        required: true,
        values: ['inbound', 'outbound', 'não identificado'],
        maxSelect: 1,
      },
      { name: 'channel', type: 'text', required: true },
      { name: 'briefing_version', type: 'text', required: true },
      {
        name: 'state',
        type: 'select',
        required: true,
        values: [
          'Rascunho',
          'Em revisão',
          'Aprovado para preparação',
          'Bloqueado',
          'Rejeitado',
          'Arquivado',
        ],
        maxSelect: 1,
      },
      { name: 'execution_window', type: 'json', required: true },
      { name: 'analysis_period', type: 'text', required: true },
      { name: 'budget', type: 'json', required: true },
      { name: 'criteria', type: 'json', required: true },
      {
        name: 'owner_user',
        type: 'relation',
        required: true,
        collectionId: '_pb_users_auth_',
        maxSelect: 1,
      },
      {
        name: 'briefing_responsible',
        type: 'relation',
        required: true,
        collectionId: '_pb_users_auth_',
        maxSelect: 1,
      },
      {
        name: 'approver_user',
        type: 'relation',
        required: false,
        collectionId: '_pb_users_auth_',
        maxSelect: 1,
      },
      { name: 'synthetic_only', type: 'bool', required: true },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ]
    const experiments = new Collection({
      name: 'experimentos_f2',
      type: 'base',
      listRule: authenticated,
      viewRule: authenticated,
      createRule: authenticated,
      updateRule: authenticated,
      deleteRule: authenticated,
      fields,
      indexes: [
        'CREATE UNIQUE INDEX idx_experimentos_f2_experiment_id ON experimentos_f2 (experiment_id)',
        'CREATE INDEX idx_experimentos_f2_state ON experimentos_f2 (state)',
      ],
    })
    app.save(experiments)

    const versions = new Collection({
      name: 'experimento_versoes_f2',
      type: 'base',
      listRule: authenticated,
      viewRule: authenticated,
      createRule: authenticated,
      updateRule: authenticated,
      deleteRule: authenticated,
      fields: [
        { name: 'experiment_id', type: 'text', required: true },
        { name: 'version', type: 'text', required: true },
        { name: 'previous_version', type: 'text', required: false },
        { name: 'change_summary', type: 'text', required: false },
        { name: 'reason', type: 'text', required: true },
        { name: 'snapshot', type: 'json', required: true },
        {
          name: 'approval_status',
          type: 'select',
          required: true,
          values: ['não aprovada', 'válida', 'revogada', 'substituída'],
          maxSelect: 1,
        },
        {
          name: 'actor',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_experimento_versoes_f2_experiment ON experimento_versoes_f2 (experiment_id, version)',
      ],
    })
    app.save(versions)

    const creatives = new Collection({
      name: 'criativos_f2',
      type: 'base',
      listRule: authenticated,
      viewRule: authenticated,
      createRule: authenticated,
      updateRule: authenticated,
      deleteRule: authenticated,
      fields: [
        { name: 'experiment_id', type: 'text', required: true },
        { name: 'creative_id', type: 'text', required: false },
        { name: 'version', type: 'text', required: true },
        { name: 'creative_type', type: 'text', required: false },
        { name: 'content', type: 'json', required: true },
        { name: 'previous_version', type: 'text', required: false },
        { name: 'change_summary', type: 'text', required: false },
        { name: 'reason', type: 'text', required: true },
        {
          name: 'actor',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'synthetic_only', type: 'bool', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_criativos_f2_experiment ON criativos_f2 (experiment_id, version)',
      ],
    })
    app.save(creatives)

    const approvals = new Collection({
      name: 'aprovacoes_f2',
      type: 'base',
      listRule: authenticated,
      viewRule: authenticated,
      createRule: authenticated,
      updateRule: authenticated,
      deleteRule: authenticated,
      fields: [
        { name: 'experiment_id', type: 'text', required: true },
        { name: 'briefing_version', type: 'text', required: true },
        { name: 'creative_version', type: 'text', required: false },
        {
          name: 'approver',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'role', type: 'text', required: true },
        { name: 'scope', type: 'text', required: true },
        { name: 'remarks', type: 'text', required: false },
        { name: 'evidence', type: 'text', required: false },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['válida', 'revogada', 'substituída'],
          maxSelect: 1,
        },
        { name: 'decision_reason', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_aprovacoes_f2_experiment ON aprovacoes_f2 (experiment_id, briefing_version)',
      ],
    })
    app.save(approvals)

    const blockers = new Collection({
      name: 'bloqueios_f2',
      type: 'base',
      listRule: authenticated,
      viewRule: authenticated,
      createRule: authenticated,
      updateRule: authenticated,
      deleteRule: authenticated,
      fields: [
        { name: 'experiment_id', type: 'text', required: true },
        { name: 'briefing_version', type: 'text', required: true },
        { name: 'reason', type: 'text', required: true },
        { name: 'affected_rule', type: 'text', required: true },
        { name: 'identified_by', type: 'text', required: true },
        { name: 'correction_needed', type: 'text', required: true },
        { name: 'evidence', type: 'text', required: false },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['aberto', 'resolvido', 'mantido', 'decisão humana'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_bloqueios_f2_experiment ON bloqueios_f2 (experiment_id, status)'],
    })
    app.save(blockers)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('bloqueios_f2'))
    app.delete(app.findCollectionByNameOrId('aprovacoes_f2'))
    app.delete(app.findCollectionByNameOrId('criativos_f2'))
    app.delete(app.findCollectionByNameOrId('experimento_versoes_f2'))
    app.delete(app.findCollectionByNameOrId('experimentos_f2'))
  },
)
