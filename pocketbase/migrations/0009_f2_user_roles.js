migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          values: ['operador', 'champion', 'delegado_f2'],
          maxSelect: 1,
        }),
      )
      app.save(users)
    }
    const assignments = [
      ['humano-sintetico-dono-01@f2.invalid', 'operador'],
      ['humano-sintetico-briefing-01@f2.invalid', 'operador'],
      ['humano-sintetico-aprovador-01@f2.invalid', 'champion'],
      ['humano-sintetico-dono-02@f2.invalid', 'operador'],
      ['humano-sintetico-briefing-02@f2.invalid', 'operador'],
      ['humano-sintetico-aprovador-02@f2.invalid', 'delegado_f2'],
    ]
    assignments.forEach(([email, role]) => {
      try {
        const user = app.findAuthRecordByEmail('_pb_users_auth_', email)
        user.set('role', role)
        app.save(user)
      } catch (_) {}
    })
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (users.fields.getByName('role')) {
      users.fields.removeByName('role')
      app.save(users)
    }
  },
)
