# Contributing

## Fluxo recomendado
1. Crie branch a partir da branch principal.
2. Faça commits pequenos e objetivos.
3. Rode checks locais antes de abrir PR.
4. Abra PR com descrição clara do problema/solução.

## Checklist obrigatório de PR
- [ ] Código compila/roda localmente.
- [ ] `npm run lint` passou.
- [ ] Testes relevantes foram executados (`npm run test:e2e` ou subset focado).
- [ ] Documentação foi atualizada quando necessário.
- [ ] Mudança inclui contexto de risco/impacto.

## Convenções
- Prefira mudanças incrementais.
- Evite misturar refactor grande com correção funcional no mesmo PR.
- Ao alterar regras de jogo, atualize testes para cobrir o novo comportamento.

## Mensagem de commit (sugestão)
Use prefixos semânticos:
- `fix:` correção de bug
- `feat:` nova funcionalidade
- `docs:` documentação
- `refactor:` refatoração sem mudança funcional
- `test:` testes
