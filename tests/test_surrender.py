"""Test: Surrender functionality — player can surrender on first two cards and recovers half bet."""
import time


def test_surrender_returns_half_bet(logged_in_page):
    page = logged_in_page
    page.wait_for_function("window.__game !== undefined")

    # Set up a clean state with known balance
    page.evaluate("""
        window.__game.balance = 500;
        window.__game.currentBet = 100;
    """)

    # Start a game
    page.evaluate("""
        document.getElementById('bet-input').value = 100;
        window.__game.startGame();
    """)
    time.sleep(1)

    # Force player turn (skip insurance/dealer BJ checks)
    page.evaluate("""
        window.__game.playerHands[0].status = 'playing';
    """)

    balance_before = page.evaluate("window.__game.balance")

    # Execute surrender
    page.evaluate("window.__game.surrender()")
    time.sleep(0.5)

    balance_after = page.evaluate("window.__game.balance")
    hand_status = page.evaluate("window.__game.playerHands[0].status")

    # Surrender refunds half the bet
    assert hand_status == "surrender", f"Expected 'surrender' status, got '{hand_status}'"
    assert balance_after == balance_before + 50, (
        f"Expected balance {balance_before + 50} after surrender refund, got {balance_after}"
    )


def test_surrender_only_on_first_two_cards(logged_in_page):
    page = logged_in_page
    page.wait_for_function("window.__game !== undefined")

    page.evaluate("""
        window.__game.balance = 500;
        window.__game.currentBet = 100;
        document.getElementById('bet-input').value = 100;
        window.__game.startGame();
    """)
    time.sleep(1)

    # Add a third card to the hand
    page.evaluate("""
        window.__game.playerHands[0].cards.push({suit: '♠', value: '2'});
        window.__game.playerHands[0].status = 'playing';
    """)

    balance_before = page.evaluate("window.__game.balance")

    # Try to surrender with 3 cards — should be rejected
    page.evaluate("window.__game.surrender()")
    time.sleep(0.3)

    balance_after = page.evaluate("window.__game.balance")
    hand_status = page.evaluate("window.__game.playerHands[0].status")

    assert hand_status == "playing", f"Surrender should be rejected with 3 cards, got '{hand_status}'"
    assert balance_after == balance_before, "Balance should not change when surrender is rejected"
