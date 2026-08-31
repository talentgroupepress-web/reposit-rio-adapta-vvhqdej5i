// pocketbase/migrations/0004_add_campos_pipeline.js
// F1-T04 — Adiciona os 4 campos aprovados à collection 'demandas'
// status_proposta, data_conversao_comercial, data_conquista, tipo_conquista
// SEM grupo_economico, SEM estados novos, SEM booleano conversao_comercial

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('demandas')

    // 1. status_proposta — select
    if (!col.fields.getByName('status_proposta')) {
      col.fields.add(
        new SelectField({
          name: 'status_proposta',
          values: ['em_negociacao', 'aceita', 'recusada', 'sem_retorno'],
          maxSelect: 1,
          required: false,
        }),
      )
      console.log('Campo status_proposta adicionado')
    }

    // 2. data_conversao_comercial — date
    if (!col.fields.getByName('data_conversao_comercial')) {
      col.fields.add(
        new DateField({
          name: 'data_conversao_comercial',
          required: false,
        }),
      )
      console.log('Campo data_conversao_comercial adicionado')
    }

    // 3. data_conquista — date
    if (!col.fields.getByName('data_conquista')) {
      col.fields.add(
        new DateField({
          name: 'data_conquista',
          required: false,
        }),
      )
      console.log('Campo data_conquista adicionado')
    }

    // 4. tipo_conquista — select
    if (!col.fields.getByName('tipo_conquista')) {
      col.fields.add(
        new SelectField({
          name: 'tipo_conquista',
          values: ['aquisicao_nova', 'reativacao'],
          maxSelect: 1,
          required: false,
        }),
      )
      console.log('Campo tipo_conquista adicionado')
    }

    app.save(col)
    console.log('Migration 0004 aplicada — 4 campos adicionados (sem grupo_economico)')
  },
  (app) => {
    const col = app.findCollectionByNameOrId('demandas')
    if (col.fields.getByName('status_proposta')) {
      col.fields.removeByName('status_proposta')
    }
    if (col.fields.getByName('data_conversao_comercial')) {
      col.fields.removeByName('data_conversao_comercial')
    }
    if (col.fields.getByName('data_conquista')) {
      col.fields.removeByName('data_conquista')
    }
    if (col.fields.getByName('tipo_conquista')) {
      col.fields.removeByName('tipo_conquista')
    }
    app.save(col)
    console.log('Rollback 0004 — 4 campos removidos')
  },
)
