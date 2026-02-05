"""Test: Max bet button functionality."""


def test_max_bet_button(logged_in_page):
    page = logged_in_page

    page.wait_for_selector("#bet-max-value", timeout=2000)

    balance_text = page.text_content("#balance").replace("$", "").replace(",", "")
    balance = int(balance_text)

    page.click("#bet-max-value")
    new_bet = int(page.input_value("#bet-input"))

    assert new_bet == balance, f"Expected {balance}, got {new_bet}"
