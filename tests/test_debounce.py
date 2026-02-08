"""Test: Debounced save functionality."""
import time

def test_save_is_debounced(logged_in_page, game_url):
    page = logged_in_page

    # Wait for game to be ready
    page.wait_for_function("window.__game !== undefined")

    # Get user ID
    user_id = page.evaluate("window.__game.userId")

    # Start game if needed (logged_in_page might be at welcome screen or game screen depending on logic)
    # The fixture waits for #balance, which is in game screen?
    # No, UIManager.js shows welcome screen after login success.
    # But #balance is in the header, which is always visible?
    # Let's check index.html to see if #balance is hidden initially.
    # Assuming logged_in_page lands on welcome screen or game screen.

    # If start button is visible, click it.
    if page.is_visible("#start-game-btn"):
        page.click("#start-game-btn")
        page.wait_for_timeout(500)

    # Clear storage first
    page.evaluate("localStorage.clear()")

    # Trigger save
    page.evaluate("window.__game.saveGame()")

    # Check immediately — should NOT be saved yet (debounced)
    key = f"blackjack-premium-save-{user_id}"
    saved = page.evaluate(f"localStorage.getItem('{key}')")
    assert saved is None, "Save should be debounced (not immediate)"

    # Wait for debounce to complete (debounce time is usually 1000ms or so)
    page.wait_for_timeout(2000)

    saved = page.evaluate(f"localStorage.getItem('{key}')")
    assert saved is not None, "Save should have completed after debounce delay"
