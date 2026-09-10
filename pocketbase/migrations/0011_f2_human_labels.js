migrate(
  (app) => {
    const addField = (collectionName, field) => {
      const col = app.findCollectionByNameOrId(collectionName)
      if (!col.fields.getByName(field.name)) {
        col.fields.add(field)
        app.save(col)
      }
    }

    addField('experimentos_f2', new TextField({ name: 'owner_label' }))
    addField('experimentos_f2', new TextField({ name: 'responsible_label' }))
    addField('experimentos_f2', new TextField({ name: 'approver_label' }))
    addField('experimento_versoes_f2', new TextField({ name: 'actor_label' }))
    addField('criativos_f2', new TextField({ name: 'actor_label' }))
    addField('aprovacoes_f2', new TextField({ name: 'approver_label' }))
  },
  (app) => {
    const removeField = (collectionName, fieldName) => {
      const col = app.findCollectionByNameOrId(collectionName)
      if (col.fields.getByName(fieldName)) {
        col.fields.removeByName(fieldName)
        app.save(col)
      }
    }

    removeField('experimentos_f2', 'owner_label')
    removeField('experimentos_f2', 'responsible_label')
    removeField('experimentos_f2', 'approver_label')
    removeField('experimento_versoes_f2', 'actor_label')
    removeField('criativos_f2', 'actor_label')
    removeField('aprovacoes_f2', 'approver_label')
  },
)
