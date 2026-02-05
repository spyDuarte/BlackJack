"""Test: Debounced save functionality."""


def test_save_is_debounced(page, game_url):
    page.goto(game_url)

    page.wait_for_selector("#login-screen")
    page.fill("#login-username", "DebounceUser")
    page.click("#login-btn")
    page.wait_for_selector("#start-game-btn")
    page.click("#start-game-btn")
    page.wait_for_timeout(1000)

    # Clear storage first
    page.evaluate("localStorage.clear()")

    # Trigger save
    page.evaluate("window.__game.saveGame()")

    # Check immediately — should NOT be saved yet (debounced)
    saved = page.evaluate("localStorage.getItem('blackjack-premium-save-DebounceUser')")
    assert saved is None, "Save should be debounced (not immediate)"

    # Wait for debounce to complete
    page.wait_for_timeout(1500)

    saved = page.evaluate("localStorage.getItem('blackjack-premium-save-DebounceUser')")
    assert saved is not None, "Save should have completed after debounce delay"
