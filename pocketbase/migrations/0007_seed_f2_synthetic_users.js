migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const seeds = [
      { email: 'humano-sintetico-dono-01@f2.invalid', name: 'HUMANO-SINTETICO-DONO-01' },
      { email: 'humano-sintetico-briefing-01@f2.invalid', name: 'HUMANO-SINTETICO-BRIEFING-01' },
      { email: 'humano-sintetico-aprovador-01@f2.invalid', name: 'HUMANO-SINTETICO-APROVADOR-01' },
      { email: 'humano-sintetico-dono-02@f2.invalid', name: 'HUMANO-SINTETICO-DONO-02' },
      { email: 'humano-sintetico-briefing-02@f2.invalid', name: 'HUMANO-SINTETICO-BRIEFING-02' },
      { email: 'humano-sintetico-aprovador-02@f2.invalid', name: 'HUMANO-SINTETICO-APROVADOR-02' },
    ]
    seeds.forEach((seed) => {
      try {
        app.findAuthRecordByEmail('_pb_users_auth_', seed.email)
      } catch (_) {
        const record = new Record(users)
        record.setEmail(seed.email)
        record.setPassword('F2-Sintetico-2026!')
        record.setVerified(true)
        record.set('name', seed.name)
        app.save(record)
      }
    })
  },
  (app) => {
    const emails = [
      'humano-sintetico-dono-01@f2.invalid',
      'humano-sintetico-briefing-01@f2.invalid',
      'humano-sintetico-aprovador-01@f2.invalid',
      'humano-sintetico-dono-02@f2.invalid',
      'humano-sintetico-briefing-02@f2.invalid',
      'humano-sintetico-aprovador-02@f2.invalid',
    ]
    emails.forEach((email) => {
      try {
        app.delete(app.findAuthRecordByEmail('_pb_users_auth_', email))
      } catch (_) {}
    })
  },
)
