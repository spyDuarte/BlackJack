"""Test: Split hand functionality."""
import time


def test_split_creates_two_hands(logged_in_page):
    page = logged_in_page
    page.wait_for_function("window.__game !== undefined")

    # Start a game
    page.click("#bet-btn")

    # Wait for game to fully initialize and player turn to start
    time.sleep(2)

    # Inject state: two 8s for split
    page.evaluate("""() => {
        window.__game.gameOver = false;
        window.__game.playerHands = [{
            cards: [{suit: '\u2660', value: '8'}, {suit: '\u2665', value: '8'}],
            bet: 100,
            status: 'playing'
        }];
        window.__game.currentHandIndex = 0;
        window.__game.balance = 1000;
        window.__game.ui.toggleGameControls(true);
        window.__game.updateUI();
    }""")

    time.sleep(0.5)

    # Verify the injected state allows split
    can_split = page.evaluate("""() => {
        const hand = window.__game.playerHands[0];
        return hand.cards.length === 2 &&
               hand.cards[0].value === hand.cards[1].value &&
               window.__game.balance >= hand.bet;
    }""")
    assert can_split, "Game state should allow split"

    # Execute split via JS to avoid Playwright click issues
    page.evaluate("window.__game.split()")
    time.sleep(0.5)

    hands_count = page.evaluate("window.__game.playerHands.length")
    assert hands_count == 2, f"Expected 2 hands, found {hands_count}"

    dom_hands = page.locator(".hand-container").count()
    assert dom_hands == 2, f"Expected 2 hand-container divs, found {dom_hands}"
