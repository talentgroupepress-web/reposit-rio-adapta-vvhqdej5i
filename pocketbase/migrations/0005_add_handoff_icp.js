// pocketbase/migrations/0005_add_handoff_icp.js
// F1-T05 — Adiciona somente os campos aprovados de handoff e ICP.

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('demandas')

    if (!col.fields.getByName('handoff_status')) {
      col.fields.add(
        new SelectField({
          name: 'handoff_status',
          values: ['pendente', 'aceito', 'recusado'],
          maxSelect: 1,
          required: false,
        }),
      )
    }

    if (!col.fields.getByName('icp_validado')) {
      col.fields.add(
        new SelectField({
          name: 'icp_validado',
          values: ['sim', 'nao'],
          maxSelect: 1,
          required: false,
        }),
      )
    }

    app.save(col)
    console.log('Migration 0005 aplicada — handoff_status e icp_validado adicionados')
  },
  (app) => {
    const col = app.findCollectionByNameOrId('demandas')
    if (col.fields.getByName('handoff_status')) col.fields.removeByName('handoff_status')
    if (col.fields.getByName('icp_validado')) col.fields.removeByName('icp_validado')
    app.save(col)
    console.log('Rollback 0005 — campos de handoff e ICP removidos')
  },
)
