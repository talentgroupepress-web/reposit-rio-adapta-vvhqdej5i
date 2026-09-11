# Fechamento formal — F2-T02

**Data:** 2026-09-11
**Task:** F2-T02 — provar validações de briefing incompleto, duplicação e aprovação de publicação/gasto
**Champion:** João Paulo
**Resultado:** CONCLUÍDA — validação humana aprovada; fechamento formal autorizado

## Testes finais

1. **RED incompleto — aprovado no reteste.** A primeira tentativa avançou indevidamente para Em revisão; a causa foi a validação existente não conectada à transição. Correção autorizada na v0.0.60, somente em `src/services/experimentosF2.ts`; QA completo passou. O reteste bloqueou a transição, exibiu os campos obrigatórios e manteve o RED em Rascunho.
2. **Duplicidade — aprovado no reteste.** A primeira tentativa bloqueou a duplicidade, mas não exibiu mensagem. Correção autorizada na v0.0.61, somente em `src/pages/ExperimentosF2.tsx`; QA completo passou. O reteste exibiu a mensagem de bloqueio e confirmou que nenhum novo experimento foi criado.
3. **Versionamento e histórico — aprovado.** RED v1→v4 e IN v1→v3 permaneceram consultáveis; motivos, atores, datas, transições, falhas e aprovações foram preservados.
4. **Preparação separada de publicação/gasto — aprovado.** IN tinha preparação aprovada, enquanto publicação e gasto permaneciam não solicitados.
5. **Publicação sintética — aprovado.** IN v3 teve solicitação e aprovação específicas de publicação; gasto permaneceu separado.
6. **Gasto sintético — aprovado.** IN v3 teve solicitação e aprovação específicas de gasto; publicação permaneceu aprovada.
7. **Operador — comprovado pela evidência definida.** RLS de `aprovacoes_f2`, condição da interface e debug anterior restringem aprovação a Champion/Delegado; não houve novo login de Operador.

## Estado final dos registros

- `EXP-F2-IN-001`: v3, Aprovado para preparação; publicação `aprovado` e gasto `aprovado`, exclusivamente como controles sintéticos.
- `EXP-F2-OUT-001`: v3, Aprovado para preparação; publicação e gasto `não solicitado`. O estado foi corrigido após clique acidental, sem nova versão e sem apagar histórico.
- `EXP-F2-RED-001`: v4, Rascunho; publicação e gasto `não solicitado`; briefing incompleto preservado como massa negativa.

## Escopo e ressalvas

- Publicação e gasto foram validados somente como controles documentais/sintéticos. Nenhuma publicação, campanha, gasto, contato ou integração externa foi executado.
- As falhas iniciais do RED e da mensagem de duplicidade permanecem registradas no histórico desta validação, com correções, QA e retestes aprovados.
- CA-2-02 e CA-2-03, em seu sentido amplo de captura de leads e relatório de métricas de alcance/conversão, **não são declarados como entregues pela F2-T02**. A validação fechou apenas o recorte operacional da linha F2-T02 e as decisões posteriores aprovadas pelo Champion.
- Revogação operacional e sincronização do campo técnico `approval_status` não foram declaradas como novas entregas neste fechamento.
- Fase 1, F2-T01, banco, collections, migrations, permissões e código não foram alterados durante o fechamento.
- F2-T03 não foi iniciada.

## Evidências

- Preview: https://repositorio-adapta-cc556--preview.goskip.app/experimentos
- Skip v0.0.61, hash `cf6c660`.
- QA v0.0.60 e v0.0.61: setup, análise estática, build, integrações e testes passaram.
- Evidências humanas: prints e registros da validação do Champion no chat; estados e aprovações conferidos no preview e por leitura somente leitura do banco.

## Próximo passo

F2-T03 depende de nova análise e autorização expressa separada. Este fechamento não inicia a próxima task.
