# Análise do Projeto BlackJack

Este documento traz uma análise prática do estado atual do projeto e um plano de melhorias priorizado para evolução técnica sem perder velocidade de entrega.

## Diagnóstico rápido

### Pontos fortes
- Estrutura de código organizada por responsabilidade (`core`, `ui`, `utils`).
- Uso de módulos ES e lint configurado.
- Boa cobertura E2E com Playwright + Pytest para fluxos críticos.
- Regras avançadas de Blackjack já implementadas (split, double, insurance, estatísticas, persistência).

### Principais riscos atuais
1. **Documentação insuficiente para onboarding**
   - O `README.md` está praticamente vazio, o que dificulta setup e contribuição.
2. **Acoplamento elevado entre regra de negócio e interface**
   - `GameManager` concentra muitas responsabilidades, aumentando custo de manutenção.
3. **Estratégia de testes pouco equilibrada**
   - Projeto JS com forte dependência de E2E em Python; há espaço para mais testes unitários de regra.
4. **Falta de pipeline de qualidade automatizada**
   - Não há CI versionada no repositório para rodar lint/testes em PR automaticamente.

---

## Melhorias recomendadas (ordem de prioridade)

## P0 — Executar em até 1 semana

### 1) Melhorar README para onboarding e operação
**Objetivo:** reduzir atrito de uso e contribuição.

**Ações:**
- Incluir pré-requisitos (Node/Python), instalação, comandos de dev/lint/teste.
- Descrever arquitetura em alto nível.
- Explicar como rodar os testes E2E localmente.

**Impacto esperado:** menor tempo de entrada de novos contribuidores e menos dúvidas operacionais.

### 2) Criar CI mínima (lint + testes)
**Objetivo:** aumentar confiabilidade de merge.

**Ações:**
- Adicionar workflow de CI para:
  - `npm run lint`
  - `pytest tests/`
- Falhar PR quando checks quebrarem.

**Impacto esperado:** regressões detectadas antes de chegar à branch principal.

### 3) Padronizar critérios de qualidade por PR
**Objetivo:** consistência técnica.

**Ações:**
- Definir checklist de PR (lint OK, testes OK, cobertura de caso alterado, documentação atualizada).
- Exigir atualização de testes ao mudar regras de jogo.

**Impacto esperado:** previsibilidade de review e redução de débito técnico.

---

## P1 — Executar em 2 a 4 semanas

### 4) Extrair engine de regras do `GameManager`
**Objetivo:** desacoplar regra de negócio da orquestração de UI/som.

**Ações:**
- Criar `BlackjackEngine` (estado + regras puras).
- Manter `GameManager` como coordenador de UI, persistência e timers.
- Cobrir `BlackjackEngine` com testes unitários JS.

**Impacto esperado:** manutenção mais simples, maior testabilidade e menor risco ao evoluir regras.

### 5) Fortalecer testes unitários de lógica
**Objetivo:** reduzir custo e tempo de validação.

**Ações:**
- Adicionar suíte unitária para cenários de regras:
  - split/re-split
  - insurance
  - blackjack natural x 21 após split
  - cálculo de saldo e estatísticas
- Manter E2E para fluxos de ponta a ponta.

**Impacto esperado:** feedback mais rápido que E2E e melhor isolamento de bugs de regra.

### 6) Versionar dados persistidos
**Objetivo:** evitar quebra ao evoluir schema salvo no navegador.

**Ações:**
- Incluir `version` no payload salvo.
- Implementar rotina de migração ao carregar dados antigos.

**Impacto esperado:** atualizações futuras sem perda de progresso do usuário.

---

## P2 — Executar em 1 a 2 meses

### 7) Evoluir build e distribuição
**Objetivo:** performance e experiência de desenvolvimento.

**Ações:**
- Avaliar Vite para build de produção (minificação, cache-busting).
- Medir bundle final e tempo de carregamento.

### 8) Melhorias de acessibilidade e UX
**Objetivo:** ampliar usabilidade.

**Ações:**
- Cobrir estados dinâmicos com mais feedback para leitor de tela.
- Suporte robusto a `prefers-reduced-motion`.
- Validar layout em telas pequenas extremas.

### 9) Observabilidade básica
**Objetivo:** facilitar diagnóstico em produção.

**Ações:**
- Estruturar logs de erro com contexto.
- Registrar métricas simples de sessão (início/fim, erro crítico).

---

## Métricas de sucesso sugeridas

- **Confiabilidade:** taxa de falha em PR < 10% após 4 semanas.
- **Velocidade:** tempo médio de review reduzido em 20% com checklist + CI.
- **Qualidade:** aumento de cobertura de regras críticas com testes unitários.
- **Operação:** onboarding local completo em até 15 minutos apenas com README.

---

## Plano de execução enxuto

1. Semana 1: README + CI + checklist de PR.
2. Semanas 2-3: extração inicial do `BlackjackEngine` e primeiros testes unitários.
3. Semana 4: versionamento de persistência e migrações.
4. Mês 2: Vite (se aprovado), acessibilidade avançada e observabilidade.

Esse caminho preserva o que já funciona no jogo e reduz risco técnico progressivamente, sem “big bang refactor”.
