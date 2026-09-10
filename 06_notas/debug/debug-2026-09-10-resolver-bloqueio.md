# Debug Summary — 2026-09-10

- **Task e problema:** F2-T01; ao clicar em “Marcar como resolvido”, nada mudava.
- **Reprodução:** reproduzido no preview com `EXP-F2-IN-001` em Bloqueado e usuário sintético operador.
- **Causa raiz:** a API restringe update de `bloqueios_f2` a `champion`/`delegado_f2`, mas a interface exibia a ação para operador e não apresentava o erro.
- **Correção:** operador não vê mais o botão; vê explicação de permissão. Champion/Delegado vê o botão e recebe tratamento de erro.
- **Escopo:** nenhuma alteração em `demandas`, Fase 1, `.skip.config.json`, produção ou F2-T02.
- **Próximo gate:** repetir validação humana com o usuário operador; o teste de resolução exige depois usuário sintético Champion/Delegado.
