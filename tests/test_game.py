"""Test: Game initialization and critical elements."""


def test_game_initializes(logged_in_page):
    page = logged_in_page

    page.wait_for_selector("#dealer-cards")
    page.wait_for_selector("#player-cards")
    page.wait_for_selector("#bet-controls")
