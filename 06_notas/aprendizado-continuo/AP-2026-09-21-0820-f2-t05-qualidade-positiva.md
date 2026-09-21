# AP-2026-09-21-0820 — Validar evidência por presença positiva, não por menção de ausência

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: F2-T05 / SPEC F2-003 (RN-F2-008, RN-F2-009)
- Sinal: o detector de "clique isolado" bloqueava o GREEN porque tratava a menção `0 oportunidades` como ausência de qualidade, mesmo existindo `1 lead qualificado sintético` no mesmo registro; o TDD visível caiu para 4/6 na revalidação de fechamento.
- Evidência: TDD 4/6 na v0.0.77 antes da correção e 6/6 na v0.0.78 depois; registros backend `DEC-F2-004` (registrada/ajustar) e prints do Champion; debug em `06_notas/debug/debug-2026-09-18-f2-t05-detector-red-green.md`.
- Regra reutilizável: em validadores de evidência, decidir por PRESENÇA de evidência positiva explícita (lead qualificado, oportunidade, proposta, conversão, cliente) — nunca por menções de ausência contidas no texto; replicar a mesma regra no frontend e no hook de servidor.
- Quando aplicar: validações RED/GREEN de decisão, qualidade e sucesso em qualquer módulo de governança.
- Quando não aplicar: quando a regra de negócio exigir contagem mínima explícita de um tipo de evidência (aí o contador é o critério, não a menção).
- Confiança: alta — causa demonstrada por reprodução e corrigida com QA/TDD verificados.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
