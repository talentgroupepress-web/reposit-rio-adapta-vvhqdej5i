// pocketbase/hooks/diag_pipeline.js
// Diagnóstico temporário: verifica se onRecordValidate funciona em demandas com acesso a oldRecord

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
    has_oldRecord: typeof e.oldRecord !== 'undefined',
  })

  e.next()
}, 'demandas')
