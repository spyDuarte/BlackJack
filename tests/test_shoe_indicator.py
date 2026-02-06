"""Test: Shoe indicator — verifies the shoe progress bar updates correctly."""
import time


def test_shoe_indicator_exists(logged_in_page):
    page = logged_in_page
    page.wait_for_function("window.__game !== undefined")

    shoe_indicator = page.query_selector("#shoe-indicator")
    assert shoe_indicator is not None, "Shoe indicator element should exist"

    shoe_bar = page.query_selector("#shoe-bar")
    assert shoe_bar is not None, "Shoe bar element should exist"

    shoe_label = page.query_selector("#shoe-label")
    assert shoe_label is not None, "Shoe label element should exist"


def test_shoe_indicator_updates_after_deal(logged_in_page):
    page = logged_in_page
    page.wait_for_function("window.__game !== undefined")

    # Get initial label
    initial_label = page.evaluate("document.getElementById('shoe-label').textContent")
    assert initial_label == "100%", f"Expected initial shoe label '100%', got '{initial_label}'"

    # Start a game (deals 4 cards)
    page.evaluate("""
        window.__game.balance = 500;
        window.__game.currentBet = 50;
        document.getElementById('bet-input').value = 50;
        window.__game.startGame();
    """)
    time.sleep(1)

    # After dealing 4 cards from 312, percentage should be ~99%
    label_after = page.evaluate("document.getElementById('shoe-label').textContent")
    pct = int(label_after.replace('%', ''))
    assert pct < 100, f"Expected shoe percentage to decrease after deal, got {pct}%"
    assert pct > 90, f"Expected shoe percentage to be high still, got {pct}%"
