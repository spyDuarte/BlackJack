"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { cn } from "@/lib/utils"

// Constants
const CONFIG = {
  DECKS: 6,
  PENETRATION_THRESHOLD: 0.2,
  INITIAL_BALANCE: 1000,
  MIN_BET: 10,
  ANIMATION_SPEED: 500,
  PAYOUT: {
    BLACKJACK: 2.5,
    REGULAR: 2.0,
    INSURANCE: 3.0,
  },
}

// Types
interface Card {
  suit: string
  value: string
}

interface Hand {
  cards: Card[]
  bet: number
  status: "playing" | "stand" | "busted" | "surrender"
}

interface GameState {
  playerHands: Hand[]
  currentHandIndex: number
  dealerHand: Card[]
  balance: number
  currentBet: number
  wins: number
  losses: number
  blackjacks: number
  totalWinnings: number
  gameOver: boolean
  dealerRevealed: boolean
  gameStarted: boolean
  insuranceTaken: boolean
  message: string
  messageType: string
  showGameControls: boolean
  showNewGameBtn: boolean
  showInsuranceModal: boolean
  showSettingsModal: boolean
  showWelcome: boolean
  settings: {
    soundEnabled: boolean
    animationsEnabled: boolean
    autoSave: boolean
    showStats: boolean
  }
}

// Deck class
class Deck {
  numberOfDecks: number
  cards: Card[]

  constructor(numberOfDecks = CONFIG.DECKS) {
    this.numberOfDecks = numberOfDecks
    this.cards = []
    this.reset()
    this.shuffle()
  }

  reset() {
    const suits = ["♠", "♥", "♦", "♣"]
    const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
    this.cards = []

    for (let i = 0; i < this.numberOfDecks; i++) {
      for (const suit of suits) {
        for (const value of values) {
          this.cards.push({ suit, value })
        }
      }
    }
  }

  get remainingCards() {
    return this.cards.length
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]]
    }
  }

  draw(): Card {
    return this.cards.pop()!
  }
}

// Card component
function CardComponent({
  card,
  hidden = false,
  animationDelay = 0,
  animationsEnabled = true,
}: {
  card: Card
  hidden?: boolean
  animationDelay?: number
  animationsEnabled?: boolean
}) {
  const isRed = card.suit === "♥" || card.suit === "♦"

  return (
    <div
      className={cn("card", hidden && "flipped")}
      style={animationsEnabled ? { animationDelay: `${animationDelay}s` } : { animation: "none" }}
    >
      <div className="card-inner">
        <div className={cn("card-face card-front", isRed ? "red" : "black")}>
          <div className="suit">{card.suit}</div>
          <div className="suit-bottom">{card.suit}</div>
          <div className="value">{card.value}</div>
        </div>
        <div className="card-face card-back" />
      </div>
    </div>
  )
}

// Chip component
function Chip({ value, onClick }: { value: number; onClick: () => void }) {
  const chipClass = `chip chip-${value}`
  return (
    <div className={chipClass} onClick={onClick} data-value={value}>
      ${value}
    </div>
  )
}

// Helper functions
function getCardNumericValue(card: Card): number {
  if (card.value === "A") return 11
  if (["J", "Q", "K"].includes(card.value)) return 10
  return parseInt(card.value)
}

function calculateHandValue(hand: Card[]): number {
  let value = 0
  let aces = 0

  for (const card of hand) {
    if (!card) continue
    const cardValue = getCardNumericValue(card)
    value += cardValue
    if (cardValue === 11) aces++
  }

  while (value > 21 && aces > 0) {
    value -= 10
    aces--
  }

  return value
}

function isSoftHand(hand: Card[]): boolean {
  let value = 0
  let aces = 0

  for (const card of hand) {
    if (!card) continue
    const cardValue = getCardNumericValue(card)
    value += cardValue
    if (cardValue === 11) aces++
  }

  while (value > 21 && aces > 0) {
    value -= 10
    aces--
  }

  return aces > 0
}

// Confetti component
function Confetti({ active }: { active: boolean }) {
  const [confetti, setConfetti] = useState<
    Array<{ id: number; color: string; left: string; duration: string; fallX: string }>
  >([])

  useEffect(() => {
    if (active) {
      const colors = ["#FFD700", "#FFA500", "#2ecc71", "#3498db", "#e74c3c", "#ffffff"]
      const newConfetti = Array.from({ length: 50 }, (_, i) => ({
        id: Date.now() + i,
        color: colors[Math.floor(Math.random() * colors.length)],
        left: `${Math.random() * 100}vw`,
        duration: `${Math.random() * 0.75 + 0.75}s`,
        fallX: `${Math.random() * 200 - 100}px`,
      }))
      setConfetti(newConfetti)

      const timer = setTimeout(() => setConfetti([]), 4000)
      return () => clearTimeout(timer)
    }
  }, [active])

  return (
    <>
      {confetti.map((c) => (
        <div
          key={c.id}
          className="confetti"
          style={
            {
              backgroundColor: c.color,
              left: c.left,
              animationDuration: c.duration,
              "--fall-x": c.fallX,
            } as React.CSSProperties
          }
        />
      ))}
    </>
  )
}

// Main Game Component
export default function BlackjackGame() {
  const deckRef = useRef<Deck>(new Deck())
  const timeoutsRef = useRef<NodeJS.Timeout[]>([])
  const [showConfetti, setShowConfetti] = useState(false)

  const initialState: GameState = {
    playerHands: [],
    currentHandIndex: 0,
    dealerHand: [],
    balance: CONFIG.INITIAL_BALANCE,
    currentBet: 50,
    wins: 0,
    losses: 0,
    blackjacks: 0,
    totalWinnings: 0,
    gameOver: false,
    dealerRevealed: false,
    gameStarted: false,
    insuranceTaken: false,
    message: "Escolha sua aposta!",
    messageType: "",
    showGameControls: false,
    showNewGameBtn: false,
    showInsuranceModal: false,
    showSettingsModal: false,
    showWelcome: true,
    settings: {
      soundEnabled: true,
      animationsEnabled: true,
      autoSave: true,
      showStats: false,
    },
  }

  const [state, setState] = useState<GameState>(initialState)

  // Load saved game on mount
  useEffect(() => {
    try {
      const savedGame = localStorage.getItem("blackjack-premium-save")
      if (savedGame) {
        const gameState = JSON.parse(savedGame)
        setState((prev) => ({
          ...prev,
          balance: gameState.balance || CONFIG.INITIAL_BALANCE,
          wins: gameState.wins || 0,
          losses: gameState.losses || 0,
          blackjacks: gameState.blackjacks || 0,
          totalWinnings: gameState.totalWinnings || 0,
        }))
      }

      const savedSettings = localStorage.getItem("blackjack-premium-settings")
      if (savedSettings) {
        const settings = JSON.parse(savedSettings)
        setState((prev) => ({
          ...prev,
          settings: { ...prev.settings, ...settings },
        }))
      }
    } catch (e) {
      console.warn("Could not load saved game")
    }
  }, [])

  // Save game when relevant state changes
  useEffect(() => {
    if (state.settings.autoSave && !state.showWelcome) {
      try {
        localStorage.setItem(
          "blackjack-premium-save",
          JSON.stringify({
            balance: state.balance,
            wins: state.wins,
            losses: state.losses,
            blackjacks: state.blackjacks,
            totalWinnings: state.totalWinnings,
          })
        )
      } catch (e) {
        console.warn("Could not save game")
      }
    }
  }, [
    state.balance,
    state.wins,
    state.losses,
    state.blackjacks,
    state.totalWinnings,
    state.settings.autoSave,
    state.showWelcome,
  ])

  // Save settings
  useEffect(() => {
    try {
      localStorage.setItem("blackjack-premium-settings", JSON.stringify(state.settings))
    } catch (e) {
      console.warn("Could not save settings")
    }
  }, [state.settings])

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((id) => clearTimeout(id))
    }
  }, [])

  const addTimeout = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay)
    timeoutsRef.current.push(id)
    return id
  }, [])

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((id) => clearTimeout(id))
    timeoutsRef.current = []
  }, [])

  // Game actions
  const startApp = useCallback(() => {
    setState((prev) => ({ ...prev, showWelcome: false }))
  }, [])

  const adjustBet = useCallback((amount: number) => {
    setState((prev) => {
      const newBet = Math.max(10, Math.min(prev.balance, prev.currentBet + amount))
      return { ...prev, currentBet: newBet }
    })
  }, [])

  const setBet = useCallback((amount: number) => {
    setState((prev) => {
      if (amount <= prev.balance) {
        return { ...prev, currentBet: Math.max(10, amount) }
      }
      return prev
    })
  }, [])

  const multiplyBet = useCallback((factor: number) => {
    setState((prev) => {
      const newBet = Math.max(10, Math.min(prev.balance, Math.floor(prev.currentBet * factor)))
      return { ...prev, currentBet: newBet }
    })
  }, [])

  const maxBet = useCallback(() => {
    setState((prev) => ({ ...prev, currentBet: prev.balance }))
  }, [])

  const startGame = useCallback(() => {
    setState((prev) => {
      if (prev.currentBet < 10 || prev.currentBet > prev.balance) {
        return { ...prev, message: "Aposta invalida!", messageType: "lose" }
      }

      const deck = deckRef.current
      const totalCards = deck.numberOfDecks * 52
      if (deck.remainingCards < totalCards * CONFIG.PENETRATION_THRESHOLD) {
        deck.reset()
        deck.shuffle()
      }

      const playerHands: Hand[] = [
        {
          cards: [deck.draw(), deck.draw()],
          bet: prev.currentBet,
          status: "playing",
        },
      ]
      const dealerHand = [deck.draw(), deck.draw()]

      const dealerUpCard = dealerHand[0]

      return {
        ...prev,
        balance: prev.balance - prev.currentBet,
        playerHands,
        currentHandIndex: 0,
        dealerHand,
        gameOver: false,
        dealerRevealed: false,
        gameStarted: true,
        insuranceTaken: false,
        message: "Boa sorte!",
        messageType: "",
        showGameControls: false,
        showNewGameBtn: false,
        showInsuranceModal: dealerUpCard.value === "A",
      }
    })
  }, [])

  // Effect to handle game flow after startGame
  useEffect(() => {
    if (state.gameStarted && !state.gameOver && state.playerHands.length > 0 && !state.showInsuranceModal) {
      const dealerUpCard = state.dealerHand[0]
      if (dealerUpCard) {
        const dealerUpVal = getCardNumericValue(dealerUpCard)
        if (dealerUpVal === 10 && !state.dealerRevealed) {
          // Check for dealer blackjack
          const dealerValue = calculateHandValue(state.dealerHand)
          if (dealerValue === 21 && state.dealerHand.length === 2) {
            addTimeout(() => {
              setState((prev) => ({
                ...prev,
                dealerRevealed: true,
                message: "Dealer tem Blackjack!",
                messageType: "lose",
              }))
              addTimeout(() => endGame(), 750)
            }, 500)
          } else {
            addTimeout(() => startPlayerTurn(), 500)
          }
        } else if (dealerUpCard.value !== "A" && !state.showGameControls) {
          addTimeout(() => startPlayerTurn(), 500)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.gameStarted, state.showInsuranceModal])

  const startPlayerTurn = useCallback(() => {
    setState((prev) => {
      const pVal = prev.playerHands[0] ? calculateHandValue(prev.playerHands[0].cards) : 0
      if (pVal === 21) {
        addTimeout(() => endGame(), 500)
        return { ...prev, showGameControls: true, message: "Sua vez!" }
      }
      return { ...prev, showGameControls: true, message: "Sua vez!" }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const respondToInsurance = useCallback(
    (accept: boolean) => {
      setState((prev) => {
        let newState = { ...prev, showInsuranceModal: false }

        if (accept) {
          const insuranceCost = Math.floor(prev.currentBet / 2)
          if (prev.balance >= insuranceCost) {
            newState = {
              ...newState,
              balance: prev.balance - insuranceCost,
              insuranceTaken: true,
              message: "Seguro apostado.",
              messageType: "",
            }
          } else {
            newState = {
              ...newState,
              message: "Saldo insuficiente para seguro.",
              messageType: "lose",
            }
          }
        } else {
          newState = { ...newState, message: "Seguro recusado.", messageType: "" }
        }

        return newState
      })

      addTimeout(() => {
        // Check for dealer blackjack
        const dealerValue = calculateHandValue(state.dealerHand)
        if (dealerValue === 21 && state.dealerHand.length === 2) {
          setState((prev) => ({
            ...prev,
            dealerRevealed: true,
            message: "Dealer tem Blackjack!",
            messageType: "lose",
          }))
          addTimeout(() => endGame(), 750)
        } else {
          setState((prev) => ({
            ...prev,
            message: "Dealer nao tem Blackjack.",
            messageType: "",
          }))
          addTimeout(() => startPlayerTurn(), 500)
        }
      }, 500)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.dealerHand]
  )

  const hit = useCallback(() => {
    setState((prev) => {
      if (prev.gameOver) return prev

      const newHands = [...prev.playerHands]
      const hand = { ...newHands[prev.currentHandIndex] }
      hand.cards = [...hand.cards, deckRef.current.draw()]
      newHands[prev.currentHandIndex] = hand

      const handValue = calculateHandValue(hand.cards)
      if (handValue > 21) {
        hand.status = "busted"
        newHands[prev.currentHandIndex] = hand
        addTimeout(() => nextHand(), 250)
        return { ...prev, playerHands: newHands, message: "Estourou!", messageType: "lose" }
      }

      return { ...prev, playerHands: newHands }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stand = useCallback(() => {
    setState((prev) => {
      if (prev.gameOver) return prev

      const newHands = [...prev.playerHands]
      const hand = { ...newHands[prev.currentHandIndex] }
      hand.status = "stand"
      newHands[prev.currentHandIndex] = hand

      return { ...prev, playerHands: newHands }
    })

    addTimeout(() => nextHand(), 100)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const double = useCallback(() => {
    setState((prev) => {
      if (prev.gameOver) return prev

      const hand = prev.playerHands[prev.currentHandIndex]
      if (prev.balance < hand.bet) return prev

      const newHands = [...prev.playerHands]
      const newHand = { ...hand }
      newHand.bet = hand.bet * 2
      newHand.cards = [...hand.cards, deckRef.current.draw()]

      const value = calculateHandValue(newHand.cards)

      if (value > 21) {
        newHand.status = "busted"
        newHands[prev.currentHandIndex] = newHand
        addTimeout(() => nextHand(), 250)
        return {
          ...prev,
          balance: prev.balance - hand.bet,
          playerHands: newHands,
          message: "Estourou!",
          messageType: "lose",
        }
      } else {
        newHand.status = "stand"
        newHands[prev.currentHandIndex] = newHand
        addTimeout(() => nextHand(), 250)
        return { ...prev, balance: prev.balance - hand.bet, playerHands: newHands }
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const split = useCallback(() => {
    setState((prev) => {
      if (prev.playerHands.length === 0) return prev

      const currentHand = prev.playerHands[prev.currentHandIndex]

      if (
        currentHand.cards.length !== 2 ||
        currentHand.cards[0].value !== currentHand.cards[1].value ||
        prev.balance < currentHand.bet
      ) {
        return prev
      }

      const newHands = [...prev.playerHands]
      const firstHand = { ...currentHand, cards: [currentHand.cards[0], deckRef.current.draw()] }
      const newHand: Hand = {
        cards: [currentHand.cards[1], deckRef.current.draw()],
        bet: currentHand.bet,
        status: "playing",
      }

      newHands[prev.currentHandIndex] = firstHand
      newHands.splice(prev.currentHandIndex + 1, 0, newHand)

      return { ...prev, balance: prev.balance - currentHand.bet, playerHands: newHands }
    })
  }, [])

  const nextHand = useCallback(() => {
    setState((prev) => {
      if (prev.currentHandIndex < prev.playerHands.length - 1) {
        return { ...prev, currentHandIndex: prev.currentHandIndex + 1 }
      } else {
        // Play dealer
        addTimeout(() => playDealer(), 100)
        return prev
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const playDealer = useCallback(() => {
    setState((prev) => {
      const allBusted = prev.playerHands.every((h) => h.status === "busted")
      if (allBusted) {
        addTimeout(() => endGame(), 100)
        return prev
      }
      return { ...prev, dealerRevealed: true }
    })

    const dealerTurn = () => {
      setState((prev) => {
        const value = calculateHandValue(prev.dealerHand)
        const soft = isSoftHand(prev.dealerHand)

        if (value < 17 || (value === 17 && soft)) {
          const newDealerHand = [...prev.dealerHand, deckRef.current.draw()]
          addTimeout(dealerTurn, 500)
          return { ...prev, dealerHand: newDealerHand }
        } else {
          addTimeout(() => endGame(), 250)
          return prev
        }
      })
    }

    addTimeout(dealerTurn, 500)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const endGame = useCallback(() => {
    setState((prev) => {
      const dealerValue = calculateHandValue(prev.dealerHand)
      const dealerBJ = dealerValue === 21 && prev.dealerHand.length === 2

      let newBalance = prev.balance
      let newWins = prev.wins
      let newLosses = prev.losses
      let newBlackjacks = prev.blackjacks
      let newTotalWinnings = prev.totalWinnings

      if (prev.insuranceTaken && dealerBJ) {
        const insuranceWin = Math.floor(prev.currentBet / 2) * CONFIG.PAYOUT.INSURANCE
        newBalance += insuranceWin
        newTotalWinnings += insuranceWin - Math.floor(prev.currentBet / 2)
      }

      let totalWin = 0
      let anyWin = false
      let allLost = true

      prev.playerHands.forEach((hand) => {
        const playerValue = calculateHandValue(hand.cards)
        let handWin = 0
        let result = ""

        if (hand.status === "surrender") {
          result = "surrender"
          newLosses++
        } else if (hand.status === "busted") {
          result = "lose"
          newLosses++
        } else if (dealerValue > 21) {
          result = "win"
          handWin = hand.bet * 2
          newWins++
        } else if (playerValue > dealerValue) {
          result = "win"
          handWin = hand.bet * 2
          newWins++
        } else if (dealerValue > playerValue) {
          result = "lose"
          newLosses++
        } else {
          result = "tie"
          handWin = hand.bet
        }

        if (prev.playerHands.length === 1 && playerValue === 21 && hand.cards.length === 2 && result === "win") {
          handWin = Math.floor(hand.bet * CONFIG.PAYOUT.BLACKJACK)
          newBlackjacks++
        }

        totalWin += handWin
        if (result === "win") anyWin = true
        if (result !== "lose") allLost = false
      })

      newBalance += totalWin
      newTotalWinnings += totalWin

      // Determine message
      let message = ""
      let messageType = ""

      if (prev.playerHands.length === 1) {
        const hand = prev.playerHands[0]
        const pVal = calculateHandValue(hand.cards)
        if (hand.status === "surrender") {
          message = "Voce desistiu."
          messageType = "tie"
        } else if (hand.status === "busted") {
          message = "Voce estourou! Dealer vence!"
          messageType = "lose"
        } else if (dealerValue > 21) {
          message = "Dealer estourou! Voce venceu!"
          messageType = "win"
        } else if (pVal > dealerValue) {
          if (totalWin > hand.bet * 2) message = "BLACKJACK! Voce venceu!"
          else message = "Voce venceu!"
          messageType = "win"
        } else if (dealerValue > pVal) {
          message = "Dealer vence!"
          messageType = "lose"
        } else {
          message = "Empate!"
          messageType = "tie"
        }
      } else {
        if (totalWin > 0) {
          message = `Ganhou $${totalWin}!`
          messageType = "win"
        } else {
          message = "Dealer venceu todas!"
          messageType = "lose"
        }
      }

      if (anyWin) {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 2000)
      }

      // Reset if bankrupt
      if (newBalance < 10) {
        addTimeout(() => resetGame(), 2000)
      }

      return {
        ...prev,
        balance: newBalance,
        wins: newWins,
        losses: newLosses,
        blackjacks: newBlackjacks,
        totalWinnings: newTotalWinnings,
        gameOver: true,
        dealerRevealed: true,
        message,
        messageType,
        showNewGameBtn: true,
        showGameControls: false,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetGame = useCallback(() => {
    clearTimeouts()
    deckRef.current = new Deck()
    setState((prev) => ({
      ...prev,
      balance: CONFIG.INITIAL_BALANCE,
      wins: 0,
      losses: 0,
      blackjacks: 0,
      totalWinnings: 0,
      playerHands: [],
      currentHandIndex: 0,
      dealerHand: [],
      currentBet: 50,
      gameOver: false,
      dealerRevealed: false,
      gameStarted: false,
      message: "Jogo reiniciado!",
      messageType: "win",
      showGameControls: false,
      showNewGameBtn: false,
    }))
  }, [clearTimeouts])

  const newGame = useCallback(() => {
    clearTimeouts()
    setState((prev) => ({
      ...prev,
      playerHands: [],
      currentHandIndex: 0,
      dealerHand: [],
      currentBet: 50,
      gameOver: false,
      dealerRevealed: false,
      gameStarted: false,
      message: "Escolha sua aposta!",
      messageType: "",
      showGameControls: false,
      showNewGameBtn: false,
    }))
  }, [clearTimeouts])

  const updateSetting = useCallback((key: keyof GameState["settings"], value: boolean) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, [key]: value },
    }))
  }, [])

  // Keyboard controls
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (!state.showGameControls || state.gameOver) return

      switch (e.key.toLowerCase()) {
        case "h":
          hit()
          break
        case "s":
          stand()
          break
        case "d":
          double()
          break
        case "p":
          split()
          break
        case "escape":
          setState((prev) => ({ ...prev, showSettingsModal: false }))
          break
      }
    }

    window.addEventListener("keydown", handleKeydown)
    return () => window.removeEventListener("keydown", handleKeydown)
  }, [state.showGameControls, state.gameOver, hit, stand, double, split])

  // Calculate scores for display
  const dealerScore = state.dealerHand.length > 0 ? (state.dealerRevealed ? calculateHandValue(state.dealerHand) : calculateHandValue([state.dealerHand[0]])) : 0

  const playerScore = state.playerHands.length > 0 && state.playerHands[state.currentHandIndex] ? calculateHandValue(state.playerHands[state.currentHandIndex].cards) : 0

  // Check split availability
  const currentHand = state.playerHands[state.currentHandIndex]
  const canSplit =
    currentHand &&
    currentHand.cards.length === 2 &&
    currentHand.cards[0].value === currentHand.cards[1].value &&
    state.balance >= currentHand.bet

  const canDouble = currentHand && currentHand.status === "playing" && state.balance >= currentHand.bet && currentHand.cards.length === 2

  // Stats
  const totalGames = state.wins + state.losses
  const winRate = totalGames > 0 ? Math.round((state.wins / totalGames) * 100) : 0

  return (
    <>
      <Confetti active={showConfetti && state.settings.animationsEnabled} />

      {/* Welcome Screen */}
      {state.showWelcome && (
        <div className="welcome-screen">
          <div className="welcome-content">
            <h1>BLACKJACK PREMIUM</h1>
            <p>
              Bem-vindo ao melhor jogo de Blackjack online! Desafie o dealer, faca suas apostas e tente chegar aos 21
              pontos sem estourar.
            </p>
            <button className="start-btn" onClick={startApp}>
              Comecar a Jogar
            </button>
          </div>
        </div>
      )}

      <div className="container">
        <div className="header">
          <button
            className="settings-btn"
            onClick={() => setState((prev) => ({ ...prev, showSettingsModal: true }))}
            title="Configuracoes"
          >
            ⚙️
          </button>
          <h1>BLACKJACK</h1>
          <div className="subtitle">PREMIUM EDITION</div>
        </div>

        <div className="game-info">
          <div className="info-box">
            <h3>Saldo</h3>
            <div className="value">${state.balance}</div>
          </div>
          <div className="info-box">
            <h3>Aposta</h3>
            <div className="value">${state.currentBet}</div>
          </div>
          <div className="info-box">
            <h3>Vitorias</h3>
            <div className="value">{state.wins}</div>
          </div>
          <div className="info-box">
            <h3>Derrotas</h3>
            <div className="value">{state.losses}</div>
          </div>
        </div>

        <div className="game-area">
          <div className="dealer-area">
            <div className="area-title">
              <span>
                <span className="icon">🎩</span>Dealer
              </span>
              <span className="score">{state.dealerRevealed ? dealerScore : "?"}</span>
            </div>
            <div className="cards">
              {state.dealerHand.map((card, index) => (
                <CardComponent
                  key={`dealer-${index}`}
                  card={card}
                  hidden={index === 1 && !state.dealerRevealed}
                  animationDelay={index * 0.05}
                  animationsEnabled={state.settings.animationsEnabled}
                />
              ))}
            </div>
          </div>

          <div className="player-area">
            <div className="area-title">
              <span>
                <span className="icon">👤</span>Jogador
              </span>
              <span className="score">{playerScore}</span>
            </div>
            <div className="cards">
              {state.playerHands.length === 1
                ? state.playerHands[0].cards.map((card, index) => (
                    <CardComponent
                      key={`player-${index}`}
                      card={card}
                      animationDelay={index * 0.05}
                      animationsEnabled={state.settings.animationsEnabled}
                    />
                  ))
                : state.playerHands.map((hand, handIndex) => (
                    <div
                      key={`hand-${handIndex}`}
                      className={cn("hand-container", handIndex === state.currentHandIndex && "active-hand")}
                    >
                      <div className="hand-info">${hand.bet}</div>
                      <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                        {hand.cards.map((card, cardIndex) => (
                          <CardComponent
                            key={`hand-${handIndex}-card-${cardIndex}`}
                            card={card}
                            animationDelay={cardIndex * 0.05}
                            animationsEnabled={state.settings.animationsEnabled}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </div>

        <div className={cn("message", state.messageType)}>{state.message}</div>

        {/* Bet Controls */}
        {!state.showGameControls && !state.showNewGameBtn && (
          <div className="bet-controls">
            <div className="chips-container">
              <Chip value={10} onClick={() => setBet(10)} />
              <Chip value={25} onClick={() => setBet(25)} />
              <Chip value={50} onClick={() => setBet(50)} />
              <Chip value={100} onClick={() => setBet(100)} />
              <Chip value={500} onClick={() => setBet(500)} />
            </div>
            <div className="bet-amount-container">
              <button className="bet-btn-adjust" onClick={() => adjustBet(-10)} title="Diminuir aposta">
                -
              </button>
              <input type="number" value={state.currentBet} readOnly />
              <button className="bet-btn-adjust" onClick={() => adjustBet(10)} title="Aumentar aposta">
                +
              </button>
              <button className="bet-btn-adjust" onClick={() => multiplyBet(2)} title="Dobrar aposta">
                2x
              </button>
              <button className="bet-btn-adjust" onClick={maxBet} title="Apostar tudo">
                Max
              </button>
            </div>
            <button onClick={startGame}>Apostar</button>
          </div>
        )}

        {/* Game Controls */}
        {state.showGameControls && (
          <div className="controls">
            <button onClick={hit} title="Pedir carta (H)">
              Pedir Carta
            </button>
            <button onClick={stand} title="Parar (S)">
              Parar
            </button>
            <button onClick={double} disabled={!canDouble} title="Dobrar aposta (D)">
              Dobrar
            </button>
            {canSplit && (
              <button onClick={split} title="Dividir (P)">
                Dividir
              </button>
            )}
          </div>
        )}

        {/* New Game Button */}
        {state.showNewGameBtn && (
          <div className="controls">
            <button onClick={newGame}>Nova Rodada</button>
          </div>
        )}

        {/* Stats */}
        {state.settings.showStats && (
          <div className="stats-container">
            <div className="stats-title">Estatisticas da Sessao</div>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{totalGames}</div>
                <div className="stat-label">Jogos</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{winRate}%</div>
                <div className="stat-label">Taxa de Vitoria</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">${state.totalWinnings}</div>
                <div className="stat-label">Ganhos Totais</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{state.blackjacks}</div>
                <div className="stat-label">Blackjacks</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {state.showSettingsModal && (
        <div className="modal" style={{ display: "block" }}>
          <div className="modal-content">
            <span className="close" onClick={() => setState((prev) => ({ ...prev, showSettingsModal: false }))}>
              &times;
            </span>
            <h2 style={{ color: "var(--primary-gold)", marginBottom: "20px" }}>Configuracoes</h2>

            <div className="setting-item">
              <label>Sons</label>
              <input
                type="checkbox"
                checked={state.settings.soundEnabled}
                onChange={(e) => updateSetting("soundEnabled", e.target.checked)}
              />
            </div>

            <div className="setting-item">
              <label>Animacoes</label>
              <input
                type="checkbox"
                checked={state.settings.animationsEnabled}
                onChange={(e) => updateSetting("animationsEnabled", e.target.checked)}
              />
            </div>

            <div className="setting-item">
              <label>Salvamento Automatico</label>
              <input
                type="checkbox"
                checked={state.settings.autoSave}
                onChange={(e) => updateSetting("autoSave", e.target.checked)}
              />
            </div>

            <div className="setting-item">
              <label>Mostrar Estatisticas</label>
              <input
                type="checkbox"
                checked={state.settings.showStats}
                onChange={(e) => updateSetting("showStats", e.target.checked)}
              />
            </div>

            <div style={{ marginTop: "30px", textAlign: "center" }}>
              <button
                onClick={resetGame}
                style={{ background: "linear-gradient(45deg, #e74c3c, #c0392b)" }}
              >
                Resetar Jogo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insurance Modal */}
      {state.showInsuranceModal && (
        <div className="modal" style={{ display: "block" }}>
          <div className="modal-content" style={{ textAlign: "center" }}>
            <h2 style={{ color: "var(--primary-gold)", marginBottom: "20px" }}>Seguro?</h2>
            <p>O Dealer tem um As. Deseja fazer um seguro?</p>
            <p style={{ fontSize: "0.9em", color: "rgba(255,255,255,0.7)", margin: "15px 0" }}>
              Custa metade da sua aposta. Paga 2:1 se o Dealer tiver Blackjack.
            </p>
            <div style={{ marginTop: "25px", display: "flex", justifyContent: "center", gap: "20px" }}>
              <button
                className="start-btn"
                style={{ fontSize: "1em", padding: "10px 30px", minWidth: "auto" }}
                onClick={() => respondToInsurance(true)}
              >
                Sim
              </button>
              <button
                className="start-btn"
                style={{
                  fontSize: "1em",
                  padding: "10px 30px",
                  minWidth: "auto",
                  background: "linear-gradient(45deg, #e74c3c, #c0392b)",
                  boxShadow: "0 5px 15px rgba(231, 76, 60, 0.3)",
                }}
                onClick={() => respondToInsurance(false)}
              >
                Nao
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
