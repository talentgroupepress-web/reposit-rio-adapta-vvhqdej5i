# Debug F2-T05 — detector RED/GREEN e qualidade positiva

- **Data:** 2026-09-18
- **Task:** F2-T05
- **Sintoma:** na revalidação de fechamento, a página `/decisoes-f2` exibiu TDD 4/6; o GREEN e o teste derivado de AJUSTAR falharam embora a entrada tivesse `1 lead qualificado sintético`.
- **Reprodução:** `simulateT05Checks()` com volume `12 cliques; 3 capturas sintéticas` e qualidade `1 lead qualificado sintético; 0 oportunidades`; a regra anterior marcava a entrada como clique isolado.
- **Causa raiz:** o detector usava `0 oportunidades`/ausência de oportunidade como bloqueio mesmo quando existia evidência positiva de qualidade (`lead qualificado`). O critério correto é distinguir evidência positiva de qualidade de oportunidades ainda ausentes.
- **Correção:** frontend e hook exclusivo passaram a bloquear apenas atividade sem evidência positiva de lead qualificado, oportunidade, proposta, conversão ou cliente. O RED segue bloqueado; o GREEN com lead qualificado passa.
- **Verificação:** Skip v0.0.78/2a06902; QA setup, análise estática, build, integrações e testes passaram; TDD visível 6/6; backend com 6 decisões e cadeia DEC-F2-004→DEC-F2-002 preservada; regressões painel 10×10/diferença 0, experimentos IN/OUT/RED e T04 protegidas.
- **Gate:** aguardando novo teste humano somente do GREEN; não concluir durante este debug.
