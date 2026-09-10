# F1-T06 — Painel mínimo, reconciliação e reprocessamento controlado

**Data:** 2026-09-03 · **Task:** F1-T06 · **Status:** CONCLUÍDA — VALIDADA HUMANAMENTE PELO CHAMPION

## Implementado

- Tela real somente leitura em `src/pages/Index.tsx`, na rota `/`.
- Consulta integral da collection `demandas` e filtros locais por período, `tipo_origem`, canal, campanha, `oferta_servico`, responsável e estado.
- Reconciliação real: a tela executa consulta equivalente na fonte, compara IDs técnicos retornados e mostra painel, fonte, diferença e status.
- Categoria `desconhecido` preservada separadamente.
- Sem UNIQUE, sem namespace técnico, sem campo, sem migration, sem hook e sem endpoint novo.

## Reconciliação painel x fonte

Consulta de leitura da fonte encontrou 7 registros, 7 `record_id` preenchidos, 7 distintos e nenhuma duplicidade.

Casos reconciliados por quantidade e lista de IDs:

- sem filtro: 7 = 7, diferença 0;
- `tipo_origem=inbound`: 4 = 4;
- `tipo_origem=outbound`: 2 = 2;
- `tipo_origem=desconhecido`: 1 = 1 (`FIX-UNK-001`);
- canal `site`: 3 = 3;
- campanha `F1-FIXTURE-IN`: 2 = 2;
- serviço `R&S`: 4 = 4;
- responsável `João Paulo (fixture)`: 1 = 1;
- estado `prospect`: 1 = 1 (`FIX-OUT-001`);
- combinação inbound/site/F1-FIXTURE-IN/R&S: 2 = 2 (`FIX-GREEN-002`, `FIX-IN-001`);
- período 18/08/2026: 1 = 1;
- período 19/08/2026: 3 = 3.

A tela exibiu: `painel 7 registro(s) · fonte 7 · diferença 0 · PASSOU — IDs coincidem`.

## Testes de record_id e reprocessamento

- U1 registro novo: PASSOU.
- U2 reprocessamento idempotente controlado: PASSOU; antes 1, depois 1, sem cópia.
- U3 atualização controlada do mesmo registro: PASSOU; `record_id` preservado.
- U4 transição inválida: PASSOU; HTTP 400 e estado anterior preservado.
- U5 IDs diferentes: PASSOU.
- U6 detecção controlada de duplicidade: PASSOU; duas ocorrências foram detectadas em dados de teste, sem alterar fixtures oficiais.
- U7 simulação segura de concorrência: PASSOU; duas leituras simultâneas encontraram o mesmo registro; nenhum teste destrutivo foi executado.

## Regressão F1-T01 a F1-T05

- Suspect→Prospect sem handoff aceito: HTTP 400; estado preservado.
- Handoff aceito: HTTP 200.
- Prospect→Lead Qualificado sem ICP: HTTP 400 `ICP ainda não validado.`.
- ICP sim com critérios: HTTP 200.
- A validação de `vaga_aberta`/`ganho`, terminais e demais regras permaneceu no hook existente; nenhum hook foi alterado nesta task.
- Fixtures oficiais `FIX-IN-001`, `FIX-OUT-001`, `FIX-UNK-001`, `FIX-DUP-001` e `FIX-SEC-001`: uma ocorrência cada, preservados.

## Rollback e limpeza

- Rollback limitado à visão/tela e dados fictícios da F1-T06.
- Não foram removidos ou revertidos migration 0005, campos aprovados, hooks, regras anteriores ou fixtures oficiais.
- Registros temporários `F1T06-*`: zero restantes.
- Fonte final: 7 registros; `record_id` distintos: 7; duplicidades: zero.
- O texto de reconciliação deixou de ser estático e passou a comparar IDs retornados por consulta equivalente na fonte.

## Limitações

- A unicidade física do banco permanece pendente até definição do namespace técnico para múltiplas fontes.
- A aplicação evita cópia no reprocessamento controlado, mas não afirma garantia global contra concorrência sem UNIQUE.
- RD Station, 1CRM e integrações externas não foram tocados.

## Evidência técnica

- Skip v0.0.31, hash `1293baa`.
- QA da versão: setup, análise estática, build, integrações e testes passaram.
- Correção intermediária de data: v0.0.30, hash `1ad9af5`.
- F1-T06 permanece aguardando validação humana; não deve ser marcada concluída antes do aceite do Champion.
