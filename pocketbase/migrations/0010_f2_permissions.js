migrate(
  (app) => {
    const allowed =
      "@request.auth.id != '' && (@request.auth.role = 'champion' || @request.auth.role = 'delegado_f2')"
    ;['aprovacoes_f2', 'bloqueios_f2'].forEach((name) => {
      const col = app.findCollectionByNameOrId(name)
      col.createRule = allowed
      col.updateRule = allowed
      col.deleteRule = allowed
      app.save(col)
    })
  },
  (app) => {
    const authenticated = "@request.auth.id != ''"
    ;['aprovacoes_f2', 'bloqueios_f2'].forEach((name) => {
      const col = app.findCollectionByNameOrId(name)
      col.createRule = authenticated
      col.updateRule = authenticated
      col.deleteRule = authenticated
      app.save(col)
    })
  },
)
