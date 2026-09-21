# AP-2026-09-21-0821 — Apply Skip com build falho pode persistir migration sem aplicá-la

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: F2-T05 / migration `0020_f2_t05_decisoes`
- Sinal: o primeiro apply da T05 (v0.0.70) falhou no build, mas persistiu a migration no working tree; o apply seguinte (v0.0.71) passou no QA porém NÃO reenviou a migration ao backend — a collection não existia e a fila exibia "Missing collection context".
- Evidência: `skip_cloud_list_migrations` sem `0020` após v0.0.71 e com `0020` aplicada após v0.0.72; `skip_cloud_get_collections` sem `decisoes_f2` no intervalo.
- Regra reutilizável: após qualquer apply Skip que contenha migration nova e falhe em qualquer estágio do QA, conferir `skip_cloud_list_migrations` e `skip_cloud_get_collections` antes de considerar o backend aplicado; para forçar o reenvio, editar o PRÓPRIO arquivo da migration (mesmo um comentário) e reaplicar — nunca criar migration duplicada nem usar rollback.
- Quando aplicar: qualquer apply com migration nova; rotina de verificação pós-QA.
- Quando não aplicar: rollback real de migration (usar a ferramenta oficial de rollback).
- Confiança: alta — comportamento observado e solução validada na mesma task.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
