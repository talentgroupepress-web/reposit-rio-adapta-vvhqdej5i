migrate(
  (app) => {
    const experiments = app.findCollectionByNameOrId('experimentos_f2')
    const creatives = app.findCollectionByNameOrId('criativos_f2')
    const values = ['não solicitado', 'aguardando aprovação', 'aprovado', 'bloqueado', 'revogado']

    if (!experiments.fields.getByName('publication_status')) {
      experiments.fields.add(new SelectField({ name: 'publication_status', values, maxSelect: 1 }))
    }
    if (!experiments.fields.getByName('spend_status')) {
      experiments.fields.add(new SelectField({ name: 'spend_status', values, maxSelect: 1 }))
    }
    app.save(experiments)

    if (!creatives.fields.getByName('publication_status')) {
      creatives.fields.add(new SelectField({ name: 'publication_status', values, maxSelect: 1 }))
    }
    app.save(creatives)

    const records = app.findRecordsByFilter('experimentos_f2', '', '', 200, 0)
    records.forEach((record) => {
      if (!record.getString('publication_status'))
        record.set('publication_status', 'não solicitado')
      if (!record.getString('spend_status')) record.set('spend_status', 'não solicitado')
      app.save(record)
    })

    const creativeRecords = app.findRecordsByFilter('criativos_f2', '', '', 200, 0)
    creativeRecords.forEach((record) => {
      if (!record.getString('publication_status'))
        record.set('publication_status', 'não solicitado')
      app.save(record)
    })
  },
  (app) => {
    const experiments = app.findCollectionByNameOrId('experimentos_f2')
    const creatives = app.findCollectionByNameOrId('criativos_f2')
    if (experiments.fields.getByName('publication_status'))
      experiments.fields.removeByName('publication_status')
    if (experiments.fields.getByName('spend_status'))
      experiments.fields.removeByName('spend_status')
    if (creatives.fields.getByName('publication_status'))
      creatives.fields.removeByName('publication_status')
    app.save(experiments)
    app.save(creatives)
  },
)
