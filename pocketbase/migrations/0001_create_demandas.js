// pocketbase/migrations/0001_create_demandas.js
// SPEC-F1-001 — Dicionário de demanda e baseline reproduzível
// 16 campos da SPEC + created/updated (obrigatório no PocketBase)

migrate(
  (app) => {
    const collection = new Collection({
      name: 'demandas',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        // --- Identificação ---
        {
          name: 'record_id',
          type: 'text',
          required: true,
          presentable: true,
        },
        {
          name: 'empresa',
          type: 'text',
          required: true,
          presentable: true,
        },
        {
          name: 'contato_ref',
          type: 'text',
          required: false,
        },

        // --- Origem e canal ---
        {
          name: 'tipo_origem',
          type: 'select',
          required: true,
          values: ['inbound', 'outbound', 'desconhecido'],
          maxSelect: 1,
        },
        {
          name: 'canal',
          type: 'text',
          required: false,
        },
        {
          name: 'campanha',
          type: 'text',
          required: false,
        },

        // --- Serviço e segmento ---
        {
          name: 'oferta_servico',
          type: 'text',
          required: false,
        },
        {
          name: 'segmento',
          type: 'text',
          required: false,
        },

        // --- Temporal ---
        {
          name: 'data',
          type: 'date',
          required: false,
        },

        // --- Responsabilidade ---
        {
          name: 'responsavel',
          type: 'text',
          required: false,
        },

        // --- Pipeline ---
        {
          name: 'estado',
          type: 'select',
          required: true,
          values: [
            'suspect',
            'prospect',
            'lead_qualificado',
            'oportunidade',
            'proposta',
            'vaga_aberta',
            'ganho',
            'perdido',
            'sem_timing',
            'desqualificado',
          ],
          maxSelect: 1,
        },
        {
          name: 'proxima_acao',
          type: 'text',
          required: false,
        },
        {
          name: 'prazo',
          type: 'date',
          required: false,
        },
        {
          name: 'resultado',
          type: 'text',
          required: false,
        },
        {
          name: 'evidencia',
          type: 'text',
          required: false,
        },

        // --- Qualidade ---
        {
          name: 'qualidade',
          type: 'select',
          required: true,
          values: ['ok', 'pendente', 'desconhecido', 'restrito'],
          maxSelect: 1,
        },

        // --- Autodate (obrigatório no PocketBase) ---
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
    })
    app.save(collection)
    console.log('Collection demandas criada com 16 campos + autodate')
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('demandas')
    app.delete(collection)
    console.log('Collection demandas removida')
  },
)
