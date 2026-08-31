// pocketbase/hooks/diag_pipeline.js
// Diagnóstico temporário: hook mínimo que NÃO faz query DB, só log.

onRecordValidate((e) => {
  const record = e.record
  const collection = record.collection().name

  if (collection !== 'demandas') {
    e.next()
    return
  }

  $app.logger().info('diag_ok', {
    id: record.getId() || 'novo',
    estado: record.getString('estado'),
  })

  e.next()
}, 'demandas')
