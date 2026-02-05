"""Test: Double bet (2x) button functionality."""


def test_double_bet_button(logged_in_page):
    page = logged_in_page

    page.wait_for_selector("#bet-double-value", timeout=2000)

    initial_bet = int(page.input_value("#bet-input"))
    page.click("#bet-double-value")
    new_bet = int(page.input_value("#bet-input"))

    assert new_bet == initial_bet * 2, f"Expected {initial_bet * 2}, got {new_bet}"
