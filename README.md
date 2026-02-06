# Blackjack Premium

Jogo de Blackjack (21) completo, desenvolvido em JavaScript puro com interface responsiva, sons sinteticos, tema claro/escuro e suporte offline via PWA.

## Como Jogar

1. **Login** - Digite um nome de usuario (3+ caracteres)
2. **Apostar** - Escolha o valor da aposta usando as fichas ou botoes de ajuste
3. **Jogar** - Use os botoes ou atalhos de teclado para tomar decisoes:
   - **Pedir Carta (H)** - Receber mais uma carta
   - **Parar (S)** - Manter a mao atual
   - **Dobrar (D)** - Dobrar a aposta e receber uma carta
   - **Dividir (P)** - Separar um par em duas maos
   - **Desistir (R)** - Desistir e recuperar metade da aposta

## Regras Implementadas

- Sapato de 6 baralhos com cut card (reshuffle entre 60-80% de penetracao)
- Dealer para em hard 17, pede carta em soft 17
- Blackjack paga 3:2 (apenas mao natural, nao apos split)
- Split de Ases: apenas uma carta adicional por mao
- Maximo de 3 splits por rodada
- Seguro disponivel quando dealer mostra As (paga 2:1)
- Push quando ambos tem Blackjack natural

## Como Rodar Localmente

```bash
# Servir os arquivos (qualquer servidor HTTP estatico)
npx serve .

# Ou usar Python
python3 -m http.server 8080
```

Acesse `http://localhost:8080` no navegador.

## Como Rodar Testes

```bash
# Instalar dependencias
pip install pytest playwright
python -m playwright install --with-deps chromium

# Rodar todos os testes E2E
pytest tests/ -v
```

## Estrutura do Projeto

```
src/
  core/
    GameManager.js    # Orquestrador do jogo (estado, regras, fluxo)
    Deck.js           # Gerenciamento do sapato (6 baralhos, cut card)
    Constants.js      # Configuracoes (payouts, delays, limites)
  ui/
    UIManager.js      # Interface, eventos, renderizacao DOM
  utils/
    HandUtils.js      # Calculos de mao (valor, soft hand, BJ natural)
    SoundManager.js   # Audio via Web Audio API (samples + sintetico)
    StorageManager.js # Persistencia (localStorage, ofuscacao, checksum)
    debounce.js       # Utilitario de debounce
index.html            # HTML semantico (main, header, section, nav, aside)
style.css             # Estilos com CSS custom properties e temas
sw.js                 # Service Worker para cache offline
manifest.json         # Manifesto PWA
tests/                # Testes E2E com Playwright + pytest
```

## Tecnologias

- **JavaScript ES6+** (ES Modules nativos, sem bundler)
- **CSS3** (Custom Properties, Flexbox, animacoes 3D, temas)
- **Web Audio API** (sons sinteticos com ADSR, pool de audio)
- **localStorage** (dados ofuscados com base64 + checksum)
- **PWA** (Service Worker, manifest.json, instalavel)
- **Playwright + pytest** (testes E2E automatizados)
- **GitHub Actions** (CI com testes + deploy para GitHub Pages)

## Scripts NPM

```bash
npm run dev        # Iniciar servidor de desenvolvimento
npm run lint       # Verificar codigo com ESLint
npm run format     # Formatar codigo com Prettier
npm run test:e2e   # Rodar testes E2E
```
