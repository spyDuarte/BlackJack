# MELHORIAS - Blackjack Premium

Documento com sugestoes detalhadas para melhorar o projeto como um todo, organizadas por categoria.

---

## Indice

1. [Arquitetura e Estrutura de Codigo](#1-arquitetura-e-estrutura-de-codigo)
2. [Logica de Jogo (GameManager)](#2-logica-de-jogo-gamemanager)
3. [Interface do Usuario (UIManager)](#3-interface-do-usuario-uimanager)
4. [Sistema de Som (SoundManager)](#4-sistema-de-som-soundmanager)
5. [Persistencia de Dados (StorageManager)](#5-persistencia-de-dados-storagemanager)
6. [Baralho e Cartas (Deck)](#6-baralho-e-cartas-deck)
7. [CSS e Design Visual](#7-css-e-design-visual)
8. [HTML e Acessibilidade](#8-html-e-acessibilidade)
9. [Testes](#9-testes)
10. [CI/CD e DevOps](#10-cicd-e-devops)
11. [Seguranca](#11-seguranca)
12. [Performance](#12-performance)
13. [Novas Funcionalidades](#13-novas-funcionalidades)
14. [Documentacao](#14-documentacao)

---

## 1. Arquitetura e Estrutura de Codigo

### 1.1 Adotar TypeScript
- **Problema**: Todo o projeto usa JavaScript puro, sem tipagem estatica. Isso dificulta refatoracoes, aumenta a chance de bugs em tempo de execucao e reduz a capacidade do editor de fornecer autocomplete preciso.
- **Sugestao**: Migrar progressivamente para TypeScript. Comecar pelos modulos utilitarios (`HandUtils.ts`, `StorageManager.ts`, `debounce.ts`) e depois migrar os modulos maiores (`GameManager.ts`, `UIManager.ts`).
- **Beneficio**: Deteccao de erros em tempo de compilacao, melhor documentacao implecita, refatoracao mais segura.
- **Arquivos afetados**: Todos os arquivos `.js` em `src/`.

### 1.2 Introduzir um Bundler (Vite ou esbuild)
- **Problema**: O projeto usa ES Modules nativos sem bundler. Isso funciona, mas impede otimizacoes como tree-shaking, minificacao, code-splitting e Hot Module Replacement (HMR) durante o desenvolvimento.
- **Sugestao**: Adotar o **Vite** como ferramenta de build. Ele suporta ES Modules nativamente, tem HMR rapido, e produz bundles otimizados para producao.
- **Beneficio**: Build de producao menor, desenvolvimento mais rapido, suporte a importacao de CSS como modulos, variaaveis de ambiente.

### 1.3 Separar Logica de Negocio da Orquestracao
- **Problema**: O `GameManager.js` (581 linhas) mistura logica de jogo pura (calculos, regras) com orquestracao (timers, chamadas de UI, sons). Isso torna o codigo dificil de testar unitariamente.
- **Sugestao**: Extrair a logica pura de Blackjack para uma classe `BlackjackEngine` que nao depende de UI ou som. O `GameManager` passa a ser apenas um orquestrador que conecta o engine, a UI e o som.
  ```
  src/
  ├── core/
  │   ├── BlackjackEngine.js   // Logica pura: regras, avaliacao de maos, estado
  │   ├── GameManager.js       // Orquestracao: conecta engine + UI + som
  │   ├── Deck.js
  │   └── Constants.js
  ```
- **Beneficio**: A logica de jogo pode ser testada sem Playwright/browser. Facilita adicionar modos de jogo alternativos.

### 1.4 Implementar um Sistema de Eventos (Event Emitter)
- **Problema**: A comunicacao entre `GameManager` e `UIManager` e feita via chamadas diretas (`this.ui.showMessage()`, `this.ui.toggleGameControls()`). Isso cria acoplamento forte.
- **Sugestao**: Implementar um `EventEmitter` simples. O `GameManager` emite eventos (`game:started`, `hand:bust`, `dealer:turn`, `game:over`) e o `UIManager` escuta esses eventos.
- **Beneficio**: Desacoplamento entre modulos, facilidade para adicionar novos "ouvintes" (logs, analytics, multiplayer futuro).

### 1.5 Adotar um State Manager Mais Robusto
- **Problema**: O estado do jogo esta espalhado em propriedades de instancia do `GameManager`. O metodo `getState()` cria um snapshot, mas nao ha controle sobre mutacoes.
- **Sugestao**: Usar um padrao de state management inspirado em Redux/Zustand: acoes disparam mudancas no estado, o estado e imutavel, e a UI re-renderiza em funcao do novo estado.
- **Beneficio**: Previsibilidade, facilidade para implementar undo/redo, debugging mais facil.

---

## 2. Logica de Jogo (GameManager)

### 2.1 Corrigir o Calculo de `totalWinnings`
- **Problema**: Em `endGame()` (linha 481), `totalWinnings` acumula o valor bruto ganho (`totalWin`), que inclui a aposta original devolvida. Isso infla a estatistica de "Ganhos Totais". Por exemplo, uma aposta de $50 que vence retorna $100, mas o lucro real e $50.
- **Sugestao**: Calcular `totalWinnings` como lucro liquido: `totalWinnings += (totalWin - totalBetOnHands)`.
- **Arquivo**: `src/core/GameManager.js`, metodo `endGame()`.

### 2.2 Tratar Caso de Deck Vazio
- **Problema**: O metodo `draw()` em `Deck.js` retorna `undefined` se o baralho estiver vazio (`cards.pop()` em array vazio). O `GameManager` nao verifica isso antes de usar a carta.
- **Sugestao**: Adicionar verificacao em `draw()` para reshufflar automaticamente ou lancar erro. No `GameManager`, verificar se a carta e valida apos cada `draw()`.
- **Arquivo**: `src/core/Deck.js` linha 38, `src/core/GameManager.js` em todos os usos de `this.deck.draw()`.

### 2.3 Permitir Re-split de Maos
- **Problema**: O jogador pode fazer split uma vez, mas o codigo nao limita explicitamente nem permite re-split quando a nova mao tambem tem par.
- **Sugestao**: Definir uma constante `MAX_SPLITS` (geralmente 3-4 em casinos reais) e adicionar validacao no metodo `split()`.
- **Arquivo**: `src/core/GameManager.js`, metodo `split()`.

### 2.4 Implementar Regra de Split de Ases
- **Problema**: Ao dividir ases, casinos geralmente permitem apenas uma carta adicional por mao. O codigo atual permite ao jogador continuar pedindo cartas normalmente.
- **Sugestao**: Quando o split envolve ases, forcar `stand` automaticamente apos receber a segunda carta.
- **Arquivo**: `src/core/GameManager.js`, metodo `split()`.

### 2.5 Validar Blackjack apos Split
- **Problema**: Em `endGame()` (linha 463), um 21 natural apos split e tratado como Blackjack (paga 3:2). Na maioria dos casinos, 21 apos split nao conta como Blackjack — paga apenas 1:1.
- **Sugestao**: Ja existe `this.playerHands.length === 1` como condicao, o que esta correto. Porem, seria mais claro criar uma funcao `isNaturalBlackjack(hand, handsCount)`.
- **Arquivo**: `src/core/GameManager.js`, metodo `endGame()`.

### 2.6 Manter a Aposta Anterior entre Rodadas
- **Problema**: Em `newGame()` (linha 549), a aposta e resetada para 50 (`this.currentBet = 50`). A maioria dos jogos de Blackjack mantem a aposta anterior do jogador.
- **Sugestao**: Nao resetar `currentBet` em `newGame()`. Apenas ajustar se for maior que o saldo atual.
- **Arquivo**: `src/core/GameManager.js`, metodo `newGame()`.

### 2.7 Adicionar Empate em Blackjack (Push)
- **Problema**: Se ambos jogador e dealer tem Blackjack, o resultado deve ser empate (push). O codigo atual parece tratar isso, mas a logica em `endGame()` e `evaluateHand()` nao verifica explicitamente o cenario de ambos com Blackjack natural.
- **Sugestao**: Adicionar verificacao explicita: se jogador e dealer ambos tem Blackjack, resultado = push (devolver aposta).
- **Arquivo**: `src/core/GameManager.js`, metodos `evaluateHand()` e `endGame()`.

### 2.8 Eliminar Metodos Proxy Desnecessarios
- **Problema**: As linhas 561-564 do `GameManager` contem metodos proxy (`getCardNumericValue`, `getHandStats`, `calculateHandValue`, `isSoftHand`) que apenas delegam para `HandUtils`. O comentario diz "for tests/compatibility".
- **Sugestao**: Atualizar os testes para importar `HandUtils` diretamente e remover esses metodos do `GameManager`.
- **Arquivo**: `src/core/GameManager.js` linhas 560-564, testes relacionados.

---

## 3. Interface do Usuario (UIManager)

### 3.1 Evitar `innerHTML` para Prevenir XSS
- **Problema**: Em `renderHand()` (linha 295-298), `card.value` e `card.suit` sao inseridos via template literal dentro de `innerHTML`. Embora os valores venham do proprio codigo (nao de input externo), e uma ma pratica que pode causar problemas se os dados forem corrompidos.
- **Sugestao**: Usar `document.createElement()` e `textContent` ao inves de `innerHTML` para a face da carta, similar ao que ja e feito em `createCardElement()` para os containers.
- **Arquivo**: `src/ui/UIManager.js`, metodo `createCardElement()`.

### 3.2 Otimizar Re-renderizacao com Virtual DOM ou Diffing
- **Problema**: `renderPlayerHands()` (linha 314) faz `container.innerHTML = ''` a cada renderizacao, destruindo e recriando todos os elementos DOM. Isso causa piscadas visuais e impede transicoes CSS suaves.
- **Sugestao**: Implementar uma estrategia de diffing similar a `renderHand()` (que ja faz sync incremental). Reutilizar elementos existentes, criando/removendo apenas o necessario.
- **Arquivo**: `src/ui/UIManager.js`, metodo `renderPlayerHands()`.

### 3.3 Adicionar Feedback Visual para Atalhos de Teclado
- **Problema**: Os atalhos de teclado (H, S, D, P) funcionam mas nao ha indicacao visual de que foram acionados. O jogador nao recebe feedback sobre qual tecla foi pressionada.
- **Sugestao**: Adicionar um breve highlight no botao correspondente quando o atalho e usado (similar ao efeito de click).
- **Arquivo**: `src/ui/UIManager.js`, metodo `handleKeyboard()`.

### 3.4 Implementar Sistema de Notificacao Mais Rico
- **Problema**: As mensagens de status (win/lose/tie) sao apenas texto com cores. Nao ha notificacoes toast para acoes como "Jogo salvo", "Configuracao alterada", etc.
- **Sugestao**: Criar um sistema de notificacoes empilhaveis (toast notifications) com diferentes niveis (info, success, warning, error).
- **Arquivo**: `src/ui/UIManager.js`, novo metodo `showToast(message, type, duration)`.

### 3.5 Adicionar Animacao de Transicao entre Telas
- **Problema**: A transicao entre Login -> Welcome -> Game e feita com `display: none/flex` e `classList.add('hidden')`. As transicoes sao abruptas.
- **Sugestao**: Usar CSS transitions/animations mais elaboradas com `opacity`, `transform`, e `visibility` para transicoes suaves entre telas.
- **Arquivo**: `src/ui/UIManager.js`, metodos `handleLogin()`, `hideWelcomeScreen()`.

### 3.6 Limpar Confetti Adequadamente
- **Problema**: O metodo `createConfetti()` (linhas 396-411) cria 150 elementos DOM (50 x 3 chamadas) com `setTimeout` de 4s para remocao. Se o jogador ganhar varias vezes rapidamente, pode haver centenas de elementos confetti no DOM simultaneamente.
- **Sugestao**: Manter referencia aos confetti ativos, limpar os anteriores antes de criar novos, e usar `requestAnimationFrame` ao inves de `setTimeout` para remocao.
- **Arquivo**: `src/ui/UIManager.js`, metodo `createConfetti()`.

### 3.7 Exibir Contagem de Cartas Restantes
- **Problema**: O jogador nao sabe quantas cartas restam no sapato (shoe). A mensagem de "Embaralhando..." aparece, mas nao ha indicacao visual previa.
- **Sugestao**: Adicionar um indicador visual discreto mostrando a porcentagem de cartas restantes no baralho.
- **Arquivo**: `src/ui/UIManager.js`, metodo `render()`.

---

## 4. Sistema de Som (SoundManager)

### 4.1 Adicionar Controle de Volume
- **Problema**: O volume esta fixo em 0.5 para samples e 0.1 para sinteticos. O jogador so pode ligar/desligar o som, sem controle de volume.
- **Sugestao**: Adicionar um slider de volume nas configuracoes. Armazenar o valor de volume e aplica-lo em `playSample()` e `playSynthetic()`.
- **Arquivo**: `src/utils/SoundManager.js`, `src/ui/UIManager.js` (novo controle), `index.html`.

### 4.2 Implementar Pool de Audio para Evitar Sobreposicao
- **Problema**: Se o jogador clicar rapidamente em acoes, multiplos sons podem tocar simultaneamente sem controle. Nao ha limite de sons concorrentes.
- **Sugestao**: Implementar um pool de AudioBufferSource limitado (ex: maximo 5 sons simultaneos). Novos sons substituem os mais antigos.
- **Arquivo**: `src/utils/SoundManager.js`.

### 4.3 Incluir Arquivos de Som no Repositorio ou Usar CDN
- **Problema**: O `SoundManager` referencia arquivos em `assets/sounds/` mas nao ha evidencia de que esses arquivos existam no repositorio. A ausencia deles faz o sistema depender inteiramente dos sons sinteticos.
- **Sugestao**: Incluir os arquivos de som no repositorio, ou usar sons gratuitos de bibliotecas como freesound.org, ou gerar sons via Web Audio API de forma mais elaborada (nao apenas osciladores simples).
- **Arquivo**: Pasta `assets/sounds/` (criar se nao existir).

### 4.4 Melhorar Sons Sinteticos
- **Problema**: Os sons sinteticos sao apenas osciladores simples com frequencia e duracao. O som de "win" e um unico tom, o de "card" e um bip agudo — nenhum se assemelha ao que pretende representar.
- **Sugestao**: Criar sons sinteticos mais realistas usando multiplos osciladores, envelopes ADSR complexos e filtros. Ex: som de carta = ruido branco filtrado por highpass rapido; som de ficha = multiplos tons curtos em sequencia.
- **Arquivo**: `src/utils/SoundManager.js`, metodo `playSynthetic()`.

---

## 5. Persistencia de Dados (StorageManager)

### 5.1 Adicionar Versionamento de Dados
- **Problema**: Os dados salvos no localStorage nao possuem versao. Se a estrutura do estado mudar em uma atualizacao, dados antigos podem causar erros ou comportamentos inesperados.
- **Sugestao**: Adicionar uma propriedade `version` ao estado salvo. Ao carregar, verificar a versao e migrar dados se necessario.
- **Arquivo**: `src/utils/StorageManager.js`, `src/core/GameManager.js` metodos `_saveGameImmediate()` e `loadGame()`.

### 5.2 Adicionar Exportar/Importar Dados
- **Problema**: O jogador nao pode transferir seu progresso entre dispositivos ou navegadores.
- **Sugestao**: Adicionar funcoes de exportar (gerar JSON para download) e importar (upload de arquivo JSON) o estado do jogo.
- **Arquivo**: `src/utils/StorageManager.js`, `src/ui/UIManager.js` (novos botoes nas configuracoes).

### 5.3 Implementar Criptografia Basica
- **Problema**: Os dados no localStorage sao texto puro. Qualquer pessoa com acesso ao console pode alterar saldo, vitorias, etc.
- **Sugestao**: Embora nao seja um jogo com dinheiro real, uma ofuscacao simples (base64 + checksum) pode prevenir alteracoes casuais.
- **Arquivo**: `src/utils/StorageManager.js`.

### 5.4 Limitar Uso de Armazenamento
- **Problema**: Nao ha verificacao do espaco disponivel no localStorage antes de salvar. Em dispositivos com espaco limitado, a gravacao pode falhar silenciosamente.
- **Sugestao**: Verificar espaco disponivel antes de salvar e notificar o usuario se o armazenamento estiver quase cheio.
- **Arquivo**: `src/utils/StorageManager.js`.

### 5.5 Adicionar IndexedDB como Fallback
- **Problema**: O localStorage tem limite de ~5MB e e sincrono. Para dados mais complexos (historico de partidas, replays), pode ser insuficiente.
- **Sugestao**: Implementar IndexedDB como camada de armazenamento principal, com localStorage como fallback.
- **Arquivo**: `src/utils/StorageManager.js`.

---

## 6. Baralho e Cartas (Deck)

### 6.1 Usar Crypto.getRandomValues para Shuffle
- **Problema**: O `Math.random()` usado no Fisher-Yates shuffle nao e criptograficamente seguro. Embora para um jogo casual isso seja aceitavel, para um jogo de casino a aleatoriedade deveria ser mais robusta.
- **Sugestao**: Substituir `Math.random()` por `crypto.getRandomValues()` para gerar numeros aleatorios criptograficamente seguros.
- **Arquivo**: `src/core/Deck.js`, metodo `shuffle()`.

### 6.2 Implementar Cut Card
- **Problema**: O reshuffle acontece quando restam menos de 20% das cartas (verificado no inicio de cada rodada). Em casinos reais, ha um "cut card" posicionado a ~75% do sapato que indica quando reshufflar.
- **Sugestao**: Implementar a mecanica de cut card: posicionar um marcador aleatorio entre 60-80% do sapato. Quando atingido, reshufflar no final da rodada atual (nao no meio).
- **Arquivo**: `src/core/Deck.js`, `src/core/GameManager.js` metodo `startGame()`.

### 6.3 Adicionar Representacao Visual do Sapato
- **Problema**: O jogador nao tem nocao visual de quantas cartas restam.
- **Sugestao**: Adicionar uma barra de progresso sutil que representa o nivel do sapato.
- **Arquivo**: `src/core/Deck.js` (getter adicional), `src/ui/UIManager.js`, `index.html`, `style.css`.

---

## 7. CSS e Design Visual

### 7.1 Usar CSS Custom Properties para Temas
- **Problema**: Embora existam algumas CSS custom properties (`:root`), muitas cores estao hardcoded em seletores especificos (ex: `#e74c3c`, `#2ecc71` em varios locais).
- **Sugestao**: Centralizar todas as cores em `:root` como custom properties e usar apenas variaveis no restante do CSS. Isso facilita a implementacao de temas (dark mode, modo daltonico, etc).
- **Arquivo**: `style.css`.

### 7.2 Implementar Tema Escuro/Claro
- **Problema**: O jogo tem apenas um tema (escuro/verde). Nao ha opcao de personalizar a aparencia.
- **Sugestao**: Criar dois conjuntos de CSS custom properties e alternar entre eles via classe no `<body>`. Adicionar toggle nas configuracoes.
- **Arquivo**: `style.css`, `src/ui/UIManager.js`, `index.html`.

### 7.3 Melhorar Responsividade para Telas Muito Pequenas
- **Problema**: Ha media queries para 768px e 480px, mas em telas muito pequenas (<360px) ou com muitas cartas (apos splits), os elementos podem se sobrepor.
- **Sugestao**: Adicionar media query para 360px, usar scroll horizontal para cartas quando necessario, e testar com 4+ maos de split.
- **Arquivo**: `style.css`, setor de responsive design.

### 7.4 Adicionar Animacao de Embaralhamento
- **Problema**: Quando o baralho e reshufflado, aparece apenas a mensagem "Embaralhando...". Nao ha animacao visual.
- **Sugestao**: Criar uma breve animacao que simule o embaralhamento de cartas (cartas se movendo rapidamente).
- **Arquivo**: `style.css`, `src/ui/UIManager.js`.

### 7.5 Otimizar Animacoes para Acessibilidade
- **Problema**: As animacoes nao respeitam a preferencia `prefers-reduced-motion` do sistema operacional.
- **Sugestao**: Adicionar `@media (prefers-reduced-motion: reduce)` para desabilitar ou simplificar animacoes automaticamente para usuarios que preferem menos movimento.
- **Arquivo**: `style.css`.

### 7.6 Carregar Fonte de Forma Otimizada
- **Problema**: A fonte Poppins e importada via `@import url(...)` no CSS, o que bloqueia a renderizacao.
- **Sugestao**: Usar `<link rel="preconnect">` e `<link rel="stylesheet">` no HTML com `font-display: swap` para carregamento nao-bloqueante.
- **Arquivo**: `index.html`, `style.css`.

---

## 8. HTML e Acessibilidade

### 8.1 Adicionar Atributos ARIA
- **Problema**: O HTML nao possui atributos ARIA. Leitores de tela nao conseguem interpretar o estado do jogo (cartas, pontuacao, mensagens).
- **Sugestao**: Adicionar `role`, `aria-label`, `aria-live`, `aria-hidden` nos elementos relevantes:
  - `aria-live="polite"` na area de mensagens para anunciar resultados.
  - `aria-label` descritivo nos botoes e cartas.
  - `role="status"` no saldo e pontuacao.
- **Arquivo**: `index.html`, `src/ui/UIManager.js` (ao criar cartas dinamicamente).

### 8.2 Melhorar Navegacao por Teclado
- **Problema**: Os atalhos de teclado (H, S, D, P) funcionam apenas quando os controles de jogo estao visiveis. Nao ha indicacao visual dos atalhos alem do atributo `title` nos botoes. Nao ha como navegar por teclado no menu de apostas.
- **Sugestao**: Adicionar legenda visivel dos atalhos (ex: "Pedir Carta (H)"), implementar navegacao por Tab entre controles de aposta, e suportar Enter/Space para chips.
- **Arquivo**: `index.html`, `src/ui/UIManager.js`, `style.css`.

### 8.3 Adicionar Semantica HTML5
- **Problema**: A estrutura HTML usa `<div>` para quase tudo. Nao ha tags semanticas como `<main>`, `<header>`, `<section>`, `<footer>`, `<nav>`.
- **Sugestao**: Substituir divs genericos por tags semanticas:
  - `.container` -> `<main>`
  - `.header` -> `<header>`
  - `.game-area` -> `<section>`
  - `.stats-container` -> `<aside>` ou `<section>`
  - `.controls` -> `<nav>` (controles de jogo)
- **Arquivo**: `index.html`.

### 8.4 Adicionar Meta Tags para PWA
- **Problema**: O projeto nao tem manifest.json nem service worker. Nao e instalavel como PWA.
- **Sugestao**: Criar `manifest.json` com icones, cores do tema, etc. Adicionar service worker basico para cache offline. Isso permite instalar o jogo como app no celular.
- **Arquivo**: Novos: `manifest.json`, `sw.js`. Alterar: `index.html`.

### 8.5 Adicionar `lang` nas Mensagens em Portugues
- **Problema**: O `<html lang="pt-BR">` esta correto, mas nao ha tratamento para internacionalizacao.
- **Sugestao**: Extrair todas as strings para um arquivo de traducao (`i18n/pt-BR.json`). Isso facilita adicionar outros idiomas no futuro (ingles, espanhol, etc).
- **Arquivo**: Novo: `src/i18n/pt-BR.json`. Alterar: todos os arquivos com strings hardcoded.

---

## 9. Testes

### 9.1 Adotar Framework de Testes Padronizado
- **Problema**: Os testes sao scripts Python individuais sem framework de teste. Cada um tem seu proprio setup (servidor HTTP, Playwright init), verificacoes manuais via `assert`, e nao ha relatorio consolidado.
- **Sugestao**: Adotar **pytest** como framework, usar fixtures para setup/teardown compartilhado (servidor HTTP, pagina Playwright), e gerar relatorios com `pytest-html`.
- **Arquivo**: Todos os arquivos em `tests/`.

### 9.2 Adicionar Testes Unitarios em JavaScript
- **Problema**: Quase todos os testes sao E2E via Playwright. Nao ha testes unitarios para a logica de jogo pura (calculo de maos, avaliacao de resultados, regras de split/double/surrender).
- **Sugestao**: Usar **Vitest** ou **Jest** para testes unitarios. Testar `HandUtils`, `Deck`, e a logica pura do `GameManager` sem browser.
- **Exemplo de testes necessarios**:
  - `HandUtils.calculateHandValue` com multiplas combinacoes de maos.
  - `Deck.shuffle()` garante que todas as cartas estao presentes apos shuffle.
  - `GameManager.evaluateHand()` com todos os cenarios possiaveis.
- **Arquivo**: Nova pasta `tests/unit/`.

### 9.3 Adicionar Testes de Regressao Visual
- **Problema**: Apenas `verify_win_animation.py` faz screenshot. Nao ha comparacao automatica de screenshots para detectar regressoes visuais.
- **Sugestao**: Implementar testes de regressao visual com comparacao de screenshots usando `pixelmatch` ou a funcao `toHaveScreenshot()` do Playwright.
- **Arquivo**: `tests/visual/`.

### 9.4 Aumentar Cobertura de Testes
- **Problema**: Muitas funcionalidades nao tem testes:
  - Settings (sound, animations, auto-save, stats toggle)
  - Surrender em diferentes situacoes
  - Insurance quando saldo e insuficiente
  - Multiplos splits
  - Edge case: deck vazio durante jogo
  - Keyboard shortcuts
  - Responsividade (testes em viewports diferentes)
- **Sugestao**: Criar testes para cada funcionalidade listada acima.
- **Arquivo**: Novos scripts em `tests/`.

### 9.5 Adicionar CI para Todos os Testes
- **Problema**: O CI (`.github/workflows/ci.yml`) executa apenas `verify_game.py`. Os outros 10 testes nao sao executados no pipeline.
- **Sugestao**: Executar todos os testes no CI. Se usar pytest, basta `pytest tests/` para rodar todos.
- **Arquivo**: `.github/workflows/ci.yml`.

---

## 10. CI/CD e DevOps

### 10.1 Atualizar Actions para Versoes Mais Recentes
- **Problema**: O CI usa `actions/checkout@v3` e `actions/setup-python@v4`. Ha versoes mais recentes disponiveis.
- **Sugestao**: Atualizar para `actions/checkout@v4` e `actions/setup-python@v5`.
- **Arquivo**: `.github/workflows/ci.yml`.

### 10.2 Adicionar Deploy Automatico
- **Problema**: Nao ha deploy automatico. O projeto precisa ser hospedado manualmente.
- **Sugestao**: Adicionar deploy automatico para **GitHub Pages** no CI. Apos os testes passarem no branch `main`, publicar automaticamente.
- **Arquivo**: `.github/workflows/ci.yml` (novo job de deploy).

### 10.3 Adicionar Linting e Formatacao
- **Problema**: Nao ha ferramentas de linting (ESLint) ou formatacao (Prettier) configuradas. O estilo de codigo depende da disciplina manual dos desenvolvedores.
- **Sugestao**: Configurar **ESLint** com regras para ES Modules e **Prettier** para formatacao automatica. Adicionar como step no CI.
- **Arquivo**: Novos: `.eslintrc.json`, `.prettierrc`. Alterar: `.github/workflows/ci.yml`, `package.json`.

### 10.4 Adicionar `package.json`
- **Problema**: O projeto nao tem `package.json`. Nao ha scripts de build, test, ou dev padronizados. As dependencias JavaScript nao sao gerenciadas.
- **Sugestao**: Criar `package.json` com scripts:
  ```json
  {
    "scripts": {
      "dev": "vite",
      "build": "vite build",
      "test": "vitest",
      "test:e2e": "pytest tests/",
      "lint": "eslint src/",
      "format": "prettier --write src/"
    }
  }
  ```
- **Arquivo**: Novo: `package.json`.

### 10.5 Adicionar Pre-commit Hooks
- **Problema**: Nao ha verificacao automatica antes de commits. Codigo mal formatado ou com erros pode ser commitado.
- **Sugestao**: Usar **Husky** + **lint-staged** para rodar ESLint e Prettier automaticamente antes de cada commit.
- **Arquivo**: Novos: `.husky/`, configuracao em `package.json`.

---

## 11. Seguranca

### 11.1 Remover `window.game` em Producao
- **Problema**: Em `src/main.js` (linha 16), o objeto `game` e exposto globalmente via `window.game`. Isso permite que qualquer pessoa altere o estado do jogo pelo console (ex: `window.game.balance = 999999`).
- **Sugestao**: Remover `window.game = game` ou condiciond-lo a um flag de desenvolvimento.
- **Arquivo**: `src/main.js` linha 16.

### 11.2 Sanitizar Input de Username
- **Problema**: O username e validado apenas por comprimento (3+ caracteres). Nao ha sanitizacao contra caracteres especiais que poderiam causar problemas no localStorage key.
- **Sugestao**: Sanitizar o username removendo caracteres especiais, limitando a alfanumericos e underscores. Validar tambem comprimento maximo.
- **Arquivo**: `src/ui/UIManager.js`, metodo `handleLogin()`.

### 11.3 Adicionar Content Security Policy
- **Problema**: Nao ha CSP (Content Security Policy) definida. Scripts inline e fontes externas sao carregados sem restricao.
- **Sugestao**: Adicionar meta tag CSP ou header HTTP que restrinja fontes de scripts, estilos e conexoes.
- **Arquivo**: `index.html` (meta tag) ou configuracao do servidor.

---

## 12. Performance

### 12.1 Lazy Load dos Sons
- **Problema**: O `SoundManager` tenta carregar todos os sons no constructor via `this.init()`. Se os arquivos de som forem grandes, isso pode impactar o carregamento inicial.
- **Sugestao**: Carregar sons sob demanda (na primeira vez que sao usados) ou apos o usuario interagir com a pagina (quando o AudioContext pode ser criado).
- **Arquivo**: `src/utils/SoundManager.js`.

### 12.2 Otimizar Confetti com Canvas
- **Problema**: O confetti usa 150 elementos DOM com animacoes CSS individuais. Isso e ineficiente e pode causar jank em dispositivos moveis.
- **Sugestao**: Usar um `<canvas>` para renderizar o confetti com `requestAnimationFrame`. Isso usa GPU de forma mais eficiente e nao cria pressao no DOM.
- **Arquivo**: `src/ui/UIManager.js`, `style.css`.

### 12.3 Debounce no Resize e Scroll
- **Problema**: Nao ha tratamento para eventos de resize da janela. Se o layout depender de calculos JavaScript baseados no viewport, pode haver recalculos excessivos.
- **Sugestao**: Adicionar debounce em event listeners de `resize` se forem necessarios no futuro.
- **Arquivo**: `src/ui/UIManager.js`.

### 12.4 Implementar Object Pool para Cartas
- **Problema**: A cada renderizacao, elementos de carta podem ser criados e destruidos. Isso gera garbage collection.
- **Sugestao**: Manter um pool de elementos `card` reutilizaveis. Ao inves de criar novos elementos, pegar do pool e devolver quando nao mais necessarios.
- **Arquivo**: `src/ui/UIManager.js`.

---

## 13. Novas Funcionalidades

### 13.1 Historico de Partidas
- **Sugestao**: Registrar cada partida (resultado, cartas, aposta, ganho) e exibir em uma tela de historico. Permitir que o jogador reveja jogadas anteriores.
- **Impacto**: Novo modulo `HistoryManager.js`, alteracoes em `GameManager.js`, `UIManager.js`, `index.html`, `style.css`.

### 13.2 Achievements/Conquistas
- **Sugestao**: Sistema de conquistas para engajar o jogador. Exemplos:
  - "Primeira Vitoria" - Ganhar a primeira partida
  - "Blackjack!" - Conseguir um Blackjack natural
  - "High Roller" - Apostar $500 ou mais
  - "Lucky Streak" - Ganhar 5 partidas consecutivas
  - "Comeback" - Recuperar de menos de $100 para mais de $1000
- **Impacto**: Novo modulo `AchievementManager.js`.

### 13.3 Tutorial Interativo
- **Sugestao**: Para novos jogadores, criar um tutorial passo a passo que explique as regras, acoes e estrategias basicas do Blackjack.
- **Impacto**: Novo modulo `TutorialManager.js`, novos elementos HTML/CSS.

### 13.4 Tabela de Estrategia Basica
- **Sugestao**: Mostrar uma tabela de estrategia basica de Blackjack que indica a melhor jogada para cada combinacao de mao do jogador vs carta do dealer.
- **Impacto**: Novo componente visual, acessivel via configuracoes ou botao dedicado.

### 13.5 Modo Multiplayer Local
- **Sugestao**: Permitir que 2+ jogadores joguem na mesma mesa, cada um com seu saldo e maos, alternando turnos.
- **Impacto**: Refatoracao significativa do `GameManager` para suportar multiplos jogadores.

### 13.6 Leaderboard
- **Sugestao**: Ranking local de jogadores (baseado em localStorage) mostrando maiores saldos, mais vitorias, maiores sequencias de vitorias.
- **Impacto**: Novo modulo `LeaderboardManager.js`, nova tela.

### 13.7 Configuracao de Regras da Casa
- **Sugestao**: Permitir que o jogador configure regras como:
  - Numero de baralhos (1, 2, 4, 6, 8)
  - Dealer hits/stands on soft 17
  - Blackjack paga 3:2 ou 6:5
  - Surrender permitido (early/late/nao)
  - Double apos split
- **Impacto**: Expansao de `Constants.js`, alteracoes em `GameManager.js`, novo painel de configuracoes.

### 13.8 Contagem de Cartas (Modo Treino)
- **Sugestao**: Modo educativo que mostra a contagem Hi-Lo em tempo real, ajudando jogadores a praticar a tecnica de contagem de cartas.
- **Impacto**: Novo modulo `CardCounter.js`, toggle nas configuracoes.

### 13.9 Modo Torneio
- **Sugestao**: Modo de jogo com numero fixo de rodadas onde o objetivo e maximizar o saldo. Ao final, mostra resultado com ranking.
- **Impacto**: Novo modo de jogo no `GameManager`, nova tela de resultados.

### 13.10 Animacao de Distribuicao de Cartas
- **Sugestao**: Ao iniciar uma rodada, animar as cartas sendo distribuidas uma a uma, saindo de um ponto central (representando o sapato) para as posicoes do dealer e jogador.
- **Impacto**: Alteracoes em `UIManager.js`, novas animacoes CSS.

---

## 14. Documentacao

### 14.1 Expandir o README.md
- **Problema**: O README atual tem apenas uma linha ("# BlackJack"). Nao ha instrucoes de instalacao, uso, contribuicao, ou descricao do projeto.
- **Sugestao**: Adicionar:
  - Descricao do projeto com screenshot
  - Como rodar localmente
  - Como rodar testes
  - Estrutura de pastas
  - Tecnologias usadas
  - Regras implementadas
  - Como contribuir
  - Licenca

### 14.2 Adicionar JSDoc aos Modulos
- **Problema**: A maioria das funcoes e metodos nao tem documentacao JSDoc. Apenas o metodo `play()` do `SoundManager` tem um bloco JSDoc.
- **Sugestao**: Adicionar JSDoc com descricao, `@param`, `@returns`, e `@throws` para todos os metodos publicos.
- **Arquivo**: Todos os arquivos JavaScript em `src/`.

### 14.3 Criar Guia de Contribuicao
- **Sugestao**: Adicionar `CONTRIBUTING.md` com instrucoes de como configurar o ambiente de desenvolvimento, rodar testes, e submeter PRs.

### 14.4 Adicionar Licenca
- **Problema**: O projeto nao tem arquivo de licenca. Isso significa que, legalmente, ninguem tem permissao para usar, modificar ou distribuir o codigo.
- **Sugestao**: Adicionar arquivo `LICENSE` com a licenca escolhida (MIT, Apache 2.0, GPL, etc).

---

## Resumo de Prioridades

### Alta Prioridade (impacto imediato na qualidade)
| # | Melhoria | Esforco |
|---|----------|---------|
| 2.1 | Corrigir calculo de totalWinnings | Baixo |
| 2.2 | Tratar deck vazio | Baixo |
| 2.6 | Manter aposta anterior | Baixo |
| 3.1 | Evitar innerHTML (seguranca) | Baixo |
| 8.1 | Adicionar atributos ARIA | Medio |
| 9.5 | CI para todos os testes | Baixo |
| 11.1 | Remover window.game em producao | Baixo |
| 14.1 | Expandir README.md | Baixo |

### Media Prioridade (melhorias significativas)
| # | Melhoria | Esforco |
|---|----------|---------|
| 1.3 | Separar logica de negocio | Alto |
| 4.1 | Controle de volume | Baixo |
| 4.3 | Incluir arquivos de som | Medio |
| 7.5 | prefers-reduced-motion | Baixo |
| 9.1 | Framework de testes pytest | Medio |
| 9.2 | Testes unitarios JS | Alto |
| 10.3 | ESLint + Prettier | Medio |
| 10.4 | package.json | Baixo |

### Baixa Prioridade (melhorias futuras)
| # | Melhoria | Esforco |
|---|----------|---------|
| 1.1 | Migrar para TypeScript | Alto |
| 1.2 | Adotar Vite | Medio |
| 5.2 | Exportar/Importar dados | Medio |
| 7.2 | Tema escuro/claro | Medio |
| 8.4 | PWA (manifest + service worker) | Medio |
| 13.1-13.10 | Novas funcionalidades | Variavel |
