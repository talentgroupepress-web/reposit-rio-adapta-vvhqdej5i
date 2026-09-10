# Estado atual — Adapta Cliente

- fase: 2
- task_id: F2-T02
- champion: João Paulo
- spec: 04_fase-atual/specs/spec-f2-001-sistema-campanhas-experimentacao.md
- etapa: aguardando_teste_humano
- autorizacao_implementacao: confirmada — Champion autorizou a implementação operacional da F2-T02; F2-T03 permanece bloqueada
- teste_humano: pendente — implementação técnica concluída; Champion deve validar a F2-T02 no preview, sem concluir a task ainda
- verificacao_automatica: passou — QA Skip v0.0.55 completo; migrations 0017–0018 aplicadas; status explícitos no schema; build, análise estática, integrações e testes passaram; Fase 1 e F2-T01 preservadas; produção não publicada
- aprendizado: registrado em 06_notas/f2-t01/fechamento-formal-2026-09-10.md e nos registros de debug; padrão confirmado: ações de UI devem refletir RLS e transições compostas devem persistir estado e evidência em conjunto
- ultima_acao: F2-T02 implementada tecnicamente no Skip (v0.0.55): fixture RED sintética, validação/duplicidade, status publicação/gasto, solicitações e aprovações separadas, histórico e controles sem execução externa; aguardando teste humano
- proxima_acao: Champion validar o fluxo F2-T02 no preview; não concluir F2-T02 nem iniciar F2-T03 antes do aceite expresso
- atualizado_em: 2026-09-11T11:31:00-03:00
