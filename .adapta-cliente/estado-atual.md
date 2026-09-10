# Estado atual — Adapta Cliente

- fase: 2
- task_id: F2-T02
- champion: João Paulo
- spec: 04_fase-atual/specs/spec-f2-001-sistema-campanhas-experimentacao.md
- etapa: concluida
- autorizacao_implementacao: confirmada — Champion autorizou a implementação operacional da F2-T02; F2-T03 permanece bloqueada
- teste_humano: aprovado — Champion já realizou a validação humana da F2-T02 no Skip; evidências operacionais existentes preservadas; não repetir homologação
- verificacao_automatica: passou — QA Skip v0.0.55 completo; migrations 0017–0018 aplicadas; status explícitos no schema; build, análise estática, integrações e testes passaram; Fase 1 e F2-T01 preservadas; produção não publicada; testes técnicos da F2-T02 já executados
- aprendizado: registrado em 06_notas/f2-t01/fechamento-formal-2026-09-10.md e nos registros de debug; padrão confirmado: ações de UI devem refletir RLS e transições compostas devem persistir estado e evidência em conjunto
- ultima_acao: restauração seletiva da governança executada: F2-T01 permanece concluída e validada; F2-T02 implementada, testada tecnicamente e validada humanamente; código, migrations, collections, dados, permissões, frontend e evidências preservados
- proxima_acao: aguardar decisão separada sobre o diagnóstico técnico de registrarAprovacao(); não iniciar F2-T03
- atualizado_em: 2026-09-11T18:51:00-03:00
