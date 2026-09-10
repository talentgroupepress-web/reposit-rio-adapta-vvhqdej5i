migrate(
  (app) => {
    const experiments = app.findCollectionByNameOrId('experimentos_f2')
    const creative = app.findCollectionByNameOrId('criativos_f2')

    if (!experiments.fields.getByName('publication_status')) {
      experiments.fields.add(
        new SelectField({
          name: 'publication_status',
          values: ['não solicitado', 'aguardando aprovação', 'aprovado', 'bloqueado', 'revogado'],
          maxSelect: 1,
        }),
      )
      app.save(experiments)
    }

    if (!experiments.fields.getByName('spend_status')) {
      experiments.fields.add(
        new SelectField({
          name: 'spend_status',
          values: ['não solicitado', 'aguardando aprovação', 'aprovado', 'bloqueado', 'revogado'],
          maxSelect: 1,
        }),
      )
      app.save(experiments)
    }

    if (!creative.fields.getByName('publication_status')) {
      creative.fields.add(
        new SelectField({
          name: 'publication_status',
          values: ['não solicitado', 'aguardando aprovação', 'aprovado', 'bloqueado', 'revogado'],
          maxSelect: 1,
        }),
      )
      app.save(creative)
    }

    const rows = app.findRecordsByFilter(
      'experimentos_f2',
      'publication_status = "" || publication_status = null',
      '',
      200,
      0,
    )
    rows.forEach((record) => {
      record.set('publication_status', 'não solicitado')
      record.set('spend_status', 'não solicitado')
      app.save(record)
    })

    const creatives = app.findRecordsByFilter(
      'criativos_f2',
      'publication_status = "" || publication_status = null',
      '',
      200,
      0,
    )
    creatives.forEach((record) => {
      record.set('publication_status', 'não solicitado')
      app.save(record)
    })
  },
  (app) => {
    const experiments = app.findCollectionByNameOrId('experimentos_f2')
    const creative = app.findCollectionByNameOrId('criativos_f2')
    if (experiments.fields.getByName('publication_status'))
      experiments.fields.removeByName('publication_status')
    if (experiments.fields.getByName('spend_status'))
      experiments.fields.removeByName('spend_status')
    if (creative.fields.getByName('publication_status'))
      creative.fields.removeByName('publication_status')
    app.save(experiments)
    app.save(creative)
  },
)
