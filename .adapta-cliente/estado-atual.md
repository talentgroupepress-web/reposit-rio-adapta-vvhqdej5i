# Estado atual — Adapta Cliente

- fase: 2
- task_id: F2-T02
- champion: João Paulo
- spec: 04_fase-atual/specs/spec-f2-001-sistema-campanhas-experimentacao.md
- etapa: implementando
- autorizacao_implementacao: confirmada — Champion autorizou a implementação operacional da F2-T02; F2-T03 permanece bloqueada
- teste_humano: pendente — validação humana expressa da F2-T02 será exigida após QA, TDD, regressão e preview
- verificacao_automatica: passou — QA Skip v0.0.45 completo; collections F2 e migrations 0006–0015 aplicadas; build, análise estática, integrações e testes passaram; preview verificado; Fase 1 preservada
- aprendizado: registrado em 06_notas/f2-t01/fechamento-formal-2026-09-10.md e nos registros de debug; padrão confirmado: ações de UI devem refletir RLS e transições compostas devem persistir estado e evidência em conjunto
- ultima_acao: F2-T02 autorizada para implementação; baseline Fase 1/F2-T01 preservado; não iniciar F2-T03
- proxima_acao: criar migration própria F2-T02, fixture RED sintética e ampliar tela existente sem alterar Fase 1/F2-T01
- atualizado_em: 2026-09-11T11:31:00-03:00
