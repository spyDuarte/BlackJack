# Melhorias de Código — Blackjack Premium

Análise técnica do código-fonte identificando inconsistências, bugs e oportunidades de melhoria para tornar o projeto mais profissional e robusto.

---

## 1. `CONFIG.MIN_BET` ignorado em múltiplos lugares

**Arquivo:** `src/core/GameManager.js` — linhas 370, 378, 385, 392
**Problema:** O arquivo `Constants.js` define `MIN_BET: 10`, mas as funções `adjustBet`, `setBet` e `multiplyBet` usam o valor `10` diretamente no código.

```js
// Atual (errado)
adjustBet(amount) {
    const newBet = Math.max(10, Math.min(this.balance, this.currentBet + amount));
}

// Correto
adjustBet(amount) {
    const newBet = Math.max(CONFIG.MIN_BET, Math.min(this.balance, this.currentBet + amount));
}
```

**Impacto:** Se o valor mínimo de aposta for alterado em `Constants.js`, o comportamento real do jogo não será atualizado.

---

## 2. Método `surrender()` desativado sem remoção

**Arquivo:** `src/core/GameManager.js` — linhas 563–565
**Problema:** O método existe na `BlackjackEngine` e funciona corretamente, mas o `GameManager` tem a implementação completamente vazia com um comentário `// Disabled`.

```js
// Atual (quebrado)
surrender() {
    // Disabled
}
```

O motor do jogo (`BlackjackEngine.surrender`) está implementado e funciona. O atalho de teclado `R` no `UIManager` chama este método, mas nada acontece. Deve ser implementado corretamente ou o botão/atalho devem ser removidos da UI.

```js
// Correto
surrender() {
    if (this.engine.gameOver) return;
    const result = this.engine.surrender(this.engine.currentHandIndex);
    if (!result) return;

    if (this.soundManager) this.soundManager.play('lose');
    this.addTimeout(() => this.endGame(), CONFIG.DELAYS.NEXT_HAND);
    this.updateUI();
}
```

---

## 3. `setTimeout` nu em vez de `this.addTimeout()`

**Arquivo:** `src/core/GameManager.js` — linhas 430 e 683
**Problema:** Dois `setTimeout` são chamados diretamente, fora do sistema de rastreamento `this.addTimeout()`. Isso impede que sejam cancelados por `clearTimeouts()`, podendo causar race conditions.

```js
// Linha 430 — Atual (fora do sistema de cleanup)
setTimeout(() => {
    if (this.ui) this.ui.toggleInsuranceModal(true);
}, CONFIG.DELAYS.INSURANCE_MODAL);

// Correto
this.addTimeout(() => {
    if (this.ui) this.ui.toggleInsuranceModal(true);
}, CONFIG.DELAYS.INSURANCE_MODAL);

// Linha 683 — Atual
setTimeout(() => {
    this.resetGame();
}, CONFIG.DELAYS.RESET);

// Correto
this.addTimeout(() => {
    this.resetGame();
}, CONFIG.DELAYS.RESET);
```

---

## 4. Versão do export de dados hardcoded

**Arquivo:** `src/core/GameManager.js` — linha 738
**Problema:** `exportData()` usa `version: 1` hardcoded enquanto `Constants.js` define `STORAGE_VERSION: 2`.

```js
// Atual (desatualizado)
const data = {
    username: this.username,
    version: 1,
    ...
};

// Correto
const data = {
    username: this.username,
    version: CONFIG.STORAGE_VERSION,
    ...
};
```

---

## 5. `loadGame()` checa `username` mas deveria checar `userId`

**Arquivo:** `src/core/GameManager.js` — linha 242
**Problema:** `loadGame()` retorna cedo se `this.username` for nulo, mas a chave de storage é gerada com `this.userId`. Se o usuário tiver um `userId` mas não um `username` (possível quando `user_metadata` está vazio), o jogo nunca carregará o estado salvo.

```js
// Atual
async loadGame() {
    if (!this.username) return;
    ...
    StorageManager.get(this.getStorageKey('blackjack-premium-save'));
}

// getStorageKey usa userId, não username
getStorageKey(key) {
    if (!this.userId) return null;
    return `${key}-${this.userId}`;
}

// Correto: proteger com userId, que é quem gera a chave
async loadGame() {
    if (!this.userId) return;
```

---

## 6. `PENETRATION_THRESHOLD` definido mas nunca usado

**Arquivo:** `src/core/Constants.js` — linha 3 / `src/core/Deck.js` — linhas 46–48
**Problema:** `CONFIG.PENETRATION_THRESHOLD: 0.2` existe como configuração central, mas a classe `Deck` usa valores hardcoded `0.2` e `0.4`.

```js
// Atual em Deck.js (hardcoded)
const minCut = Math.floor(this.totalCards * 0.2);
const maxCut = Math.floor(this.totalCards * 0.4);

// Correto
const minCut = Math.floor(this.totalCards * CONFIG.PENETRATION_THRESHOLD);
const maxCut = Math.floor(this.totalCards * CONFIG.PENETRATION_THRESHOLD * 2);
```

---

## 7. Comentário incorreto sobre penetração do cut card

**Arquivo:** `src/core/Deck.js` — linha 45
**Problema:** O comentário diz `60-80% penetration` mas o código coloca o cut card entre os 20%–40% **restantes** do baralho, o que equivale a 60%–80% de penetração — isso está correto matematicamente, mas o comentário é ambíguo e pode confundir.

```js
// Atual (ambíguo)
// Place cut card randomly between 60-80% penetration

// Sugerido (preciso)
// Place cut card at a position leaving 20-40% of cards remaining (60-80% penetration)
```

---

## 8. Condição redundante em `getHiLoValue()`

**Arquivo:** `src/utils/HandUtils.js` — linha 94
**Problema:** A condição `val >= 10 || val === 11 || card.value === 'A'` é redundante. Se `val === 11`, então `val >= 10` já é verdadeiro. E `card.value === 'A'` sempre resulta em `val === 11`.

```js
// Atual (redundante)
if (val >= 10 || val === 11 || card.value === 'A') return -1;

// Correto (simplificado)
if (val >= 10) return -1;
```

---

## 9. Método `login()` deprecado ainda presente

**Arquivo:** `src/core/GameManager.js` — linhas 101–103
**Problema:** O método `login(_username)` existe mas só emite um `console.warn`. Não há nenhum caminho de código que o chame. Deve ser removido completamente para não induzir novos desenvolvedores ao erro.

```js
// Remover completamente
login(_username) {
    console.warn('Manual login called, but should use Supabase Auth');
}
```

---

## 10. Indentação inconsistente em `BlackjackEngine.js`

**Arquivo:** `src/core/BlackjackEngine.js` — linhas 216–218, 226–229, 239–249, 261–262
**Problema:** Vários métodos têm indentação com espaço extra antes do corpo (5 espaços em vez de 8 para membros de classe), quebrando a consistência visual do arquivo.

```js
// Atual (espaço extra na linha 216)
dealerShouldHit() {
·····const value = HandUtils.calculateHandValue(this.dealerHand); // 5 espaços
     const isSoft = ...

// Correto (4 espaços de indentação padrão)
dealerShouldHit() {
    const value = HandUtils.calculateHandValue(this.dealerHand);
    const isSoft = HandUtils.isSoftHand(this.dealerHand);
    return (value < 17 || (value === 17 && isSoft));
}
```

---

## 11. `StorageManager.encode()` faz double-serialize desnecessário

**Arquivo:** `src/utils/StorageManager.js` — linhas 44–58 / `src/core/GameManager.js` — linha 198
**Problema:** `GameManager._saveGameImmediate()` já converte o estado para string via `JSON.stringify(gameState)` antes de passar para `StorageManager.set()`. Dentro do `encode()`, o valor string passa por mais um `JSON.stringify()`, resultando em double-serialization.

```js
// GameManager.js linha 198
StorageManager.set(key, JSON.stringify(gameState)); // já é string

// StorageManager.encode() linha 47
const strValue = JSON.stringify(value); // serializa novamente a string
```

A solução mais limpa é passar o objeto diretamente e deixar o `StorageManager` fazer a serialização:

```js
// GameManager.js — correto
StorageManager.set(this.getStorageKey('blackjack-premium-save'), gameState); // passar objeto

// StorageManager.encode() já cuida da serialização internamente
```

---

## 12. `_saveGameImmediate()` checa `username` mas nunca salva settings inline

**Arquivo:** `src/core/GameManager.js` — linha 186
**Problema:** `_saveGameImmediate()` usa `if (!this.username) return` como guard, o que é inconsistente com `saveSettings()` que usa o mesmo guard. Ambos deveriam usar `this.userId` como guard principal (ver item 5).

---

## Resumo das Prioridades

| # | Severidade | Categoria | Arquivo |
|---|-----------|-----------|---------|
| 2 | 🔴 Alta | Bug — funcionalidade quebrada | `GameManager.js` |
| 5 | 🔴 Alta | Bug — dados não carregam | `GameManager.js` |
| 3 | 🟠 Média | Bug — memory leak / race condition | `GameManager.js` |
| 1 | 🟠 Média | Manutenibilidade — magic number | `GameManager.js` |
| 4 | 🟠 Média | Manutenibilidade — versão desatualizada | `GameManager.js` |
| 6 | 🟡 Baixa | Manutenibilidade — constante não usada | `Constants.js` / `Deck.js` |
| 11 | 🟡 Baixa | Performance — serialização dupla | `StorageManager.js` |
| 8 | 🟡 Baixa | Legibilidade — condição redundante | `HandUtils.js` |
| 9 | 🟡 Baixa | Limpeza — código morto | `GameManager.js` |
| 10 | 🟡 Baixa | Estilo — indentação inconsistente | `BlackjackEngine.js` |
| 7 | 🟡 Baixa | Documentação — comentário impreciso | `Deck.js` |
| 12 | 🟡 Baixa | Consistência — guard incorreto | `GameManager.js` |
