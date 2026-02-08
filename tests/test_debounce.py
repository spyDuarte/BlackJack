"""Test: Debounced save functionality."""


def test_save_is_debounced(page, game_url):
    page.goto(game_url)

    page.wait_for_selector("#login-screen")
    page.fill("#login-email", "test@example.com")
    page.fill("#login-password", "password123")
    page.click("#login-btn")

    # Wait for login screen to disappear
    page.wait_for_selector("#login-screen", state="hidden")

    # Handle Welcome Screen if it appears
    try:
        page.wait_for_selector("#welcome-screen", state="visible", timeout=2000)
        page.click("#start-game-btn")
        page.wait_for_selector("#welcome-screen", state="hidden")
    except Exception:
        pass

    page.wait_for_selector("#bet-btn", state="visible")
    page.wait_for_timeout(1000)

    # Clear storage first
    page.evaluate("localStorage.clear()")

    # Trigger save
    page.evaluate("window.__game.saveGame()")

    # Check immediately — should NOT be saved yet (debounced)
    # Mock user ID is 'test-user'
    saved = page.evaluate("localStorage.getItem('blackjack-premium-save-test-user')")
    assert saved is None, "Save should be debounced (not immediate)"

    # Wait for debounce to complete (debounce time is 1000ms)
    page.wait_for_timeout(1500)

    saved = page.evaluate("localStorage.getItem('blackjack-premium-save-test-user')")
    assert saved is not None, "Save should have completed after debounce delay"
