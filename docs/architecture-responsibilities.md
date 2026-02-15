# Mapeamento de responsabilidades e plano incremental

## Responsabilidades atuais

### GameManager
- Sessão/autenticação (login, logout e reação a mudanças de sessão).
- Estado de jogo (saldo, mãos, estatísticas, configurações).
- Persistência local e sincronização Supabase.
- Orquestração do fluxo de rodada (deal, turnos, dealer, fechamento).

### UIManager
- Binding de eventos de UI (botões, teclado, formulários).
- Renderização de estado visual (mãos, placar, controles).
- Feedback ao usuário (mensagens, toast, erros, animações).

## Extrações implementadas (compatíveis por fachada)

### Núcleo (`GameManager`)
- `AuthService`: login/logout/sessão.
- `PersistenceService`: persistência local + Supabase.
- `RoundController`: fluxo de mão/turnos.

`GameManager` mantém API pública anterior e apenas delega para os serviços.

### UI (`UIManager`)
- `Renderer`: ponto de entrada de render.
- `UIBindings`: ponto de entrada de listeners/atalhos.
- `Feedback`: ponto de entrada para toast/erro/mensagem.

`UIManager` segue como fachada para preservar contratos existentes.

## Estratégia incremental por feature flags

Flags em `ARCHITECTURE_FLAGS` permitem ligar/desligar cada extração por domínio:
- `enableAuthService`
- `enablePersistenceService`
- `enableRoundController`
- `enableRendererModule`
- `enableUIBindingsModule`
- `enableFeedbackModule`

## Testes de contrato adicionados
- `GameManager.contract.test.js`: valida delegação da fachada para serviços.
- `UIManager.contract.test.js`: valida delegação da fachada para módulos de UI.
