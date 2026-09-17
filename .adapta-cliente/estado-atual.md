# Estado atual — Adapta Cliente

- task_id: F2-T05
- champion: João Paulo
- spec: 04-fase-atual/specs/spec-f2-003-decisao-do-experimento.md
- etapa: em_correcao
- autorizacao_implementacao: confirmada — Champion autorizou a implementação da F2-T05 conforme a SPEC F2-003 regularizada e o plano apresentado
- teste_humano: pendente — obrigatório ao fim da T05, antes de qualquer avanço para F2-T06
- verificacao_automatica: falhou parcialmente — primeiro apply v0.0.70 falhou somente no build por import incorreto; segundo apply v0.0.71 passou QA completo, mas a migration 0020 não foi aplicada ao backend porque já havia sido persistida no apply anterior; frontend/TDD determinístico carregam, collection ainda ausente
- aprendizado: pendente
- ultima_acao: causa diagnosticada; migration 0020 mantida como única migration da T05; será reenviada após correção mínima no próprio arquivo
- proxima_acao: reaplicar a migration 0020 sem alterar escopo, depois verificar collection/fixtures/permissões e repetir QA/regressão
- atualizado_em: 2026-09-17T20:15:00-03:00
