"""Test: Game features — insurance modal."""
import time


def test_insurance_modal(logged_in_page):
    page = logged_in_page
    page.wait_for_function("window.__game !== undefined")

    # Mock deck so dealer gets an Ace as upcard
    page.evaluate("""
        const padding = new Array(100).fill({suit: '\u2666', value: '2'});
        const targetCards = [
            {suit: '\u2660', value: '10'},
            {suit: '\u2665', value: 'K'},
            {suit: '\u2660', value: 'A'},
            {suit: '\u2665', value: 'Q'}
        ];
        window.__game.deck.cards = [...padding, ...targetCards];
        window.__game.startGame();
    """)

    # Wait for insurance modal to appear (1s delay in game code)
    page.wait_for_selector("#insurance-modal", state="visible", timeout=5000)
    page.click("#insurance-no-btn")
    time.sleep(2)
    page.evaluate("window.__game.resetGame()")
    page.wait_for_selector("#bet-btn")
