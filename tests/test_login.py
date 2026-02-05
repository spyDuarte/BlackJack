"""Test: Login system with per-user data persistence."""
import time


def test_login_screen_visible(page, game_url):
    page.goto(game_url)
    assert page.is_visible("#login-screen"), "Login screen should be visible"


def test_user_data_persistence(page, game_url):
    page.goto(game_url)

    # Login as User1
    page.wait_for_selector("#login-screen")
    page.fill("#login-username", "User1")
    page.click("#login-btn")
    page.wait_for_selector("#welcome-screen", state="visible")
    page.click("#start-game-btn")
    page.wait_for_selector(".container", state="visible")

    balance_text = page.text_content("#balance")
    assert "$1000" in balance_text

    # Modify balance and save
    page.evaluate("window.__game.balance = 2000; window.__game.saveGame(); window.__game.updateUI();")
    time.sleep(1.5)  # Wait for debounced save

    # Reload and login as User1 again
    page.reload()
    page.wait_for_selector("#login-screen", state="visible")
    page.fill("#login-username", "User1")
    page.click("#login-btn")
    page.wait_for_selector("#welcome-screen", state="visible")
    page.click("#start-game-btn")
    page.wait_for_selector(".container", state="visible")

    balance_text = page.text_content("#balance")
    assert "$2000" in balance_text, f"Expected $2000, got {balance_text}"


def test_separate_user_data(page, game_url):
    page.goto(game_url)

    # Login as User1 and change balance
    page.wait_for_selector("#login-screen")
    page.fill("#login-username", "User1")
    page.click("#login-btn")
    page.wait_for_selector("#welcome-screen", state="visible")
    page.click("#start-game-btn")
    page.wait_for_selector(".container", state="visible")
    page.evaluate("window.__game.balance = 2000; window.__game.saveGame(); window.__game.updateUI();")
    time.sleep(1.5)

    # Reload and login as User2
    page.reload()
    page.wait_for_selector("#login-screen", state="visible")
    page.fill("#login-username", "User2")
    page.click("#login-btn")
    page.wait_for_selector("#welcome-screen", state="visible")
    page.click("#start-game-btn")
    page.wait_for_selector(".container", state="visible")

    balance_text = page.text_content("#balance")
    assert "$1000" in balance_text, f"User2 should have $1000, got {balance_text}"
