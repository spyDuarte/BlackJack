"""Test: EventEmitter integration — verify events are emitted during game actions."""
import time


def test_event_emitter_exists(logged_in_page):
    page = logged_in_page
    page.wait_for_function("window.__game !== undefined")

    has_events = page.evaluate("window.__game.events !== undefined")
    assert has_events, "GameManager should have an events (EventEmitter) property"


def test_game_started_event(logged_in_page):
    page = logged_in_page
    page.wait_for_function("window.__game !== undefined")

    # Set up event listener
    page.evaluate("""
        window.__eventLog = [];
        window.__game.events.on('game:started', (state) => {
            window.__eventLog.push('game:started');
        });
    """)

    # Start a game
    page.evaluate("""
        window.__game.balance = 500;
        window.__game.currentBet = 50;
        // Ensure bet input matches (for validation if any)
        if(document.getElementById('bet-input')) document.getElementById('bet-input').value = 50;
        window.__game.startGame();
    """)
    time.sleep(1.5) # Increased wait time for startup

    log = page.evaluate("window.__eventLog")
    assert "game:started" in log, f"Expected 'game:started' event, got {log}"


def test_player_hit_event(logged_in_page):
    page = logged_in_page
    page.wait_for_function("window.__game !== undefined")

    page.evaluate("""
        window.__eventLog = [];
        window.__game.events.on('player:hit', (data) => {
            window.__eventLog.push({event: 'player:hit', handIndex: data.handIndex});
        });
    """)

    # Manually setup game state to avoid waiting for animations/shuffling
    page.evaluate("""
        window.__game.engine.resetState();
        window.__game.balance = 500;
        window.__game.currentBet = 50;

        // Setup hands manually
        window.__game.engine.playerHands = [{
            cards: [{suit: '♠', value: '10'}, {suit: '♠', value: '5'}],
            bet: 50,
            status: 'playing',
            canSplit: false
        }];
        window.__game.engine.dealerHand = [{suit: '♥', value: '10'}, {suit: '♥', value: '5'}];
        window.__game.engine.currentHandIndex = 0;
        window.__game.engine.gameStarted = true;
        window.__game.engine.gameOver = false;

        window.__game.hit();
    """)
    time.sleep(0.5)

    log = page.evaluate("window.__eventLog")
    assert len(log) > 0, "Expected player:hit event to be logged"
    assert log[0]["event"] == "player:hit", f"Expected player:hit, got {log[0]}"
    assert log[0]["handIndex"] == 0, f"Expected handIndex 0, got {log[0]['handIndex']}"


def test_player_stand_event(logged_in_page):
    page = logged_in_page
    page.wait_for_function("window.__game !== undefined")

    page.evaluate("""
        window.__eventLog = [];
        window.__game.events.on('player:stand', (data) => {
            window.__eventLog.push('player:stand');
        });
    """)

    # Manually setup game state
    page.evaluate("""
        window.__game.engine.resetState();
        window.__game.balance = 500;
        window.__game.currentBet = 50;

        window.__game.engine.playerHands = [{
            cards: [{suit: '♠', value: '10'}, {suit: '♠', value: '10'}], // 20
            bet: 50,
            status: 'playing',
            canSplit: true
        }];
        window.__game.engine.dealerHand = [{suit: '♥', value: '10'}, {suit: '♥', value: '5'}];
        window.__game.engine.currentHandIndex = 0;
        window.__game.engine.gameStarted = true;
        window.__game.engine.gameOver = false;

        window.__game.stand();
    """)
    time.sleep(0.5)

    log = page.evaluate("window.__eventLog")
    assert "player:stand" in log, f"Expected 'player:stand' event, got {log}"
