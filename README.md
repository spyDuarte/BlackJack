# BlackJack Premium

Jogo de BlackJack (21) para navegador com interface rica, efeitos visuais/sonoros, persistência local e testes E2E.

## Tecnologias
- Front-end: HTML, CSS, JavaScript (ES Modules)
- Qualidade: ESLint + Prettier
- Testes E2E: Pytest + Playwright

## Pré-requisitos
- Node.js 18+
- Python 3.10+
- pip

## Instalação
```bash
npm install
python -m pip install -r requirements.txt
python -m playwright install --with-deps chromium
```

## Executar localmente
```bash
npm run dev
```
Depois, abra a URL exibida pelo `serve` (por padrão `http://localhost:3000`).

## Scripts principais
```bash
npm run dev         # sobe servidor local estático
npm run lint        # valida JS com ESLint
npm run lint:fix    # corrige problemas automáticos do ESLint
npm run format      # aplica Prettier
npm run format:check
npm run test:e2e    # roda suíte E2E (pytest)
```

## Estrutura do projeto
```text
src/
  core/   # regras/orquestração de jogo
  ui/     # interação com DOM/renderização
  utils/  # utilitários (som, storage, debounce, mão)
tests/    # suíte E2E com Playwright/Pytest
```

## Troubleshooting

### Falha ao rodar testes com erro de browser Playwright
Se aparecer erro como `Executable doesn't exist ... chrome-headless-shell`:
```bash
python -m playwright install --with-deps chromium
```

### Lint falhando no CI
Rode localmente antes do push:
```bash
npm run lint
```

## Contribuição
Consulte [`CONTRIBUTING.md`](./CONTRIBUTING.md) para fluxo de branch/PR e checklist de qualidade.
