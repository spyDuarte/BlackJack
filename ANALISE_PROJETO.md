# Análise do Projeto BlackJack (revisada)

> Objetivo: fornecer um diagnóstico mais acionável do estado atual do projeto e um plano de melhoria com foco em **entrega incremental**, **redução de risco técnico** e **melhor experiência de manutenção**.

---

## 1) Resumo executivo

O projeto já está funcional e com boa base de UX e recursos para um jogo browser (split, insurance, tema, som, persistência), porém possui gargalos clássicos de evolução:

1. **Baixa descobribilidade para contribuidores** (README vazio).
2. **Alta concentração de responsabilidades** em poucos arquivos (`GameManager` e `UIManager`).
3. **Qualidade automatizada incompleta** (sem CI no repositório; lint com erros pendentes).
4. **Estratégia de testes muito dependente de E2E** (rápido para validar fluxo, mais caro para manter e diagnosticar).

Se nada for feito, o custo por alteração tende a crescer (mais regressões, mais tempo de review, menor previsibilidade de entrega).

---

## 2) Diagnóstico objetivo (estado atual)

## 2.1 Estrutura e modularização

### Pontos positivos
- Separação básica por domínio (`src/core`, `src/ui`, `src/utils`).
- Uso de ES Modules e padrões consistentes de import/export.

### Gargalos
- `GameManager.js` está muito grande e mistura:
  - regras de negócio;
  - fluxo de rodada;
  - persistência;
  - side effects de UI/som;
  - timers.
- `UIManager.js` também concentra muitas responsabilidades de renderização + eventos + animações.

**Risco:** alterações simples em regra podem impactar UI e vice-versa.

---

## 2.2 Qualidade e testes

### Pontos positivos
- Suíte E2E relativamente ampla em `tests/` com Playwright/Pytest.
- Cobertura de fluxos importantes (login, lógica, split, debounce, etc.).

### Gargalos
- Falta suíte unitária JS para regras puras (pontuação de mão, validações de ação, cálculo de payout).
- Dependência de browser instalado para validar até mudanças pequenas de regra.
- Lint atual reporta erros reais de ambiente global e warnings de manutenção.

**Risco:** feedback lento e menor isolamento de falhas.

---

## 2.3 Operação e DX (Developer Experience)

### Gargalos
- `README.md` vazio.
- Sem pipeline de CI versionada para checks automáticos em PR.
- Falta documentação de arquitetura e contratos mínimos entre módulos.

**Risco:** onboarding lento e padrão de contribuição inconsistente.

---

## 2.4 Dados e persistência

### Pontos positivos
- Persistência simples e funcional via `localStorage`.

### Gargalos
- Sem versionamento explícito do schema salvo.
- Tratamento de erro limitado (apenas warning em parse/storage).
- Sem estratégia de migração de dados.

**Risco:** atualização futura pode quebrar estado salvo de usuários.

---

## 2.5 Front-end e acessibilidade

### Pontos positivos
- Interface rica, com feedback visual e recursos de configuração.
- Há atributos ARIA em partes relevantes.

### Gargalos
- CSS muito extenso e com alta chance de regressão visual por acoplamento de estilos.
- Necessidade de validação sistemática em telas pequenas e preferências de redução de movimento.

**Risco:** manutenção visual custosa e inconsistências entre dispositivos.

---

## 3) Priorização prática (impacto x esforço)

## P0 (alto impacto, baixo/médio esforço) — fazer primeiro

### P0.1 Completar README + guia de contribuição
**Entregáveis:**
- setup local (Node/Python);
- comandos padrão (`dev`, `lint`, `test:e2e`);
- troubleshooting do Playwright;
- fluxo de branch/PR.

### P0.2 Implantar CI mínima
**Entregáveis:**
- workflow para `npm run lint` e `pytest tests/`;
- status check obrigatório para merge.

### P0.3 Zerar erros críticos de lint
**Entregáveis:**
- declarar globais faltantes no ESLint (`Blob`, `URL`, `FileReader`);
- corrigir pontos triviais (`prefer-const`, variáveis não usadas).

### P0.4 Definir contrato de qualidade por PR
**Entregáveis:**
- checklist objetiva: lint, testes, atualização de docs, impacto de risco.

---

## P1 (alto impacto, médio esforço) — após estabilizar P0

### P1.1 Extrair motor de regras (`BlackjackEngine`)
**Proposta de fronteira:**
- Engine: estado + regras puras + transições.
- GameManager: orquestração (UI/som/persistência/tempo).

### P1.2 Criar testes unitários JS para regras
**Cobertura mínima sugerida:**
- cálculo de mão com ases;
- regras de split/double/insurance;
- payout e estatísticas.

### P1.3 Versionar estado persistido
**Entregáveis:**
- campo `version` no snapshot salvo;
- função de migração por versão;
- fallback seguro para dados inválidos.

---

## P2 (médio impacto, médio/alto esforço) — evolução contínua

### P2.1 Avaliar Vite/esbuild para build de produção
- foco em bundle menor, cache busting e padronização de build.

### P2.2 Hardening de acessibilidade e responsividade
- auditoria de teclado/leitor de tela;
- política explícita para `prefers-reduced-motion`;
- cenários extremos de viewport/cartas.

### P2.3 Observabilidade de cliente
- captura estruturada de erros críticos;
- eventos mínimos de sessão para diagnóstico.

---

## 4) Roadmap sugerido (6 semanas)

### Semana 1
- README completo.
- CI mínima publicada.
- Correções de lint para baseline verde.

### Semana 2-3
- Primeira extração de regras para `BlackjackEngine` (MVP).
- Testes unitários cobrindo regras essenciais.

### Semana 4
- Versionamento + migração de persistência.
- Refino de contratos entre camadas.

### Semana 5-6
- Melhorias de acessibilidade/responsividade.
- Avaliação de build tool (PoC com Vite).

---

## 5) Indicadores de sucesso

1. **Tempo de onboarding:** projeto rodando local em até 15 min.
2. **Saúde de PR:** 100% dos PRs com lint/CI obrigatórios.
3. **Confiabilidade:** redução de regressões em regras de jogo.
4. **Produtividade:** menor tempo médio entre abrir PR e merge.

---

## 6) Próximos passos recomendados (ação imediata)

1. Abrir PR de documentação (`README` + `CONTRIBUTING`).
2. Abrir PR de baseline técnico (corrigir lint e adicionar CI).
3. Abrir PR de arquitetura (introdução do `BlackjackEngine` com migração parcial).

Essa sequência reduz risco rapidamente e cria base sólida para evoluções maiores sem travar a entrega de funcionalidades.
