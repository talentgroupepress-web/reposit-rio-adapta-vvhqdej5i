// pocketbase/hooks/diag_pipeline.js
// Diagnóstico passo 2: checagem de collection + logger (sem regras)

onRecordValidate((e) => {
  const record = e.record
  const collection = record.collection().name

  if (collection !== 'demandas') {
    e.next()
    return
  }

  $app.logger().info('diag_pipeline_validate', {
    id: record.getId() || 'novo',
    estado: record.getString('estado'),
  })

  e.next()
}, 'demandas')
