# Debug F2-T05 — decisão subsequente após revogação

- **Data:** 2026-09-18
- **Task:** F2-T05
- **Sintoma:** após revogar `DEC-F2-002`, o card exibiu `Revogada`, mas não ofereceu a ação específica para criar a decisão subsequente. O botão genérico `Criar pendência de decisão` permaneceu visível.
- **Reprodução:** preview `/experimentos/EXP-F2-IN-001`; `DEC-F2-002` revogada; texto do card não continha `Criar próxima decisão`.
- **Causa raiz:** `criarDecisaoSubsequente` existia em `src/services/decisoesF2.ts` e `createSuccessor` existia no componente, mas `DecisaoMarketingSection.tsx` não importava o serviço nem renderizava o bloco condicional para `status === 'revogada'`.
- **Correção:** importação da função e botão `Criar próxima decisão` condicionado ao estado revogada; sem alteração de collection, dados, demanda ou T04.
- **Verificação:** Skip v0.0.77/89a2614; QA setup, análise estática, build, integrações e testes passaram. Preview confirmou `DEC-F2-002 · Revogada` e botão específico visível.
- **Gate:** aguardando novo teste humano do rollback; não clicar no botão genérico.
