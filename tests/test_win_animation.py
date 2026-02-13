"""Test: Win animation triggers without errors."""
import os
import time


def test_win_animation(page, game_url):
    page.goto(game_url)
    page.wait_for_selector(".container")

    # Hide login/welcome screens
    if page.is_visible("#welcome-screen"):
        page.evaluate("document.getElementById('welcome-screen').style.display = 'none'")

    page.wait_for_function("window.__game !== undefined")

    # Trigger win animation
    page.evaluate("window.__game.ui.showWinAnimation(500)")
    time.sleep(1)

    screenshot_path = os.path.abspath("tests/win_animation_test.png")
    page.screenshot(path=screenshot_path)
    assert os.path.exists(screenshot_path), "Screenshot should be saved"
