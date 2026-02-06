"""Test: Core game logic — deck size, isSoftHand, reshuffle behavior."""
import time


def test_deck_size(logged_in_page):
    page = logged_in_page
    page.wait_for_function("window.__game !== undefined")
    deck_size = page.evaluate("window.__game.deck.cards.length")
    assert deck_size == 312, f"Expected 312 cards, got {deck_size}"


def test_is_soft_hand(logged_in_page):
    page = logged_in_page
    page.wait_for_function("window.__HandUtils !== undefined")

    test_cases = [
        {"cards": ["A", "6"], "expected": True, "desc": "Soft 17 (A, 6)"},
        {"cards": ["A", "6", "10"], "expected": False, "desc": "Hard 17 (A, 6, 10)"},
        {"cards": ["A", "A", "5"], "expected": True, "desc": "Soft 17 (A, A, 5)"},
        {"cards": ["10", "7"], "expected": False, "desc": "Hard 17 (10, 7)"},
        {"cards": ["A", "8"], "expected": True, "desc": "Soft 19 (A, 8)"},
        {"cards": ["A", "8", "2"], "expected": True, "desc": "Soft 21 (A, 8, 2)"},
        {"cards": ["A", "8", "3"], "expected": False, "desc": "Hard 12 (A, 8, 3 -> 22 -> 12)"},
    ]

    for case in test_cases:
        js_code = f"""
        () => {{
            const cards = {str(case['cards'])};
            const hand = cards.map(val => ({{ value: val, suit: '\u2660' }}));
            return window.__HandUtils.isSoftHand(hand);
        }}
        """
        result = page.evaluate(js_code)
        assert result == case["expected"], f"Failed {case['desc']}: Expected {case['expected']}, got {result}"


def test_reshuffle_when_deck_low(logged_in_page):
    page = logged_in_page
    page.wait_for_function("window.__game !== undefined")

    # Mock deck to be low
    page.evaluate('window.__game.deck.cards = new Array(50).fill({suit: "\u2660", value: "A"})')
    remaining_before = page.evaluate("window.__game.deck.remainingCards")
    assert remaining_before == 50

    # Start game (should trigger shuffle)
    page.evaluate("""
        document.getElementById('bet-input').value = 100;
        window.__game.startGame();
    """)

    remaining_after = page.evaluate("window.__game.deck.remainingCards")
    # Should have reshuffled (312 - 4 dealt cards)
    assert remaining_after == 308, f"Expected 308 cards after reshuffle and deal, got {remaining_after}"


def test_no_reshuffle_when_deck_full(logged_in_page):
    page = logged_in_page
    page.wait_for_function("window.__game !== undefined")

    # First force a reshuffle by making deck low
    page.evaluate('window.__game.deck.cards = new Array(50).fill({suit: "\u2660", value: "A"})')
    page.evaluate("""
        document.getElementById('bet-input').value = 100;
        window.__game.startGame();
    """)

    # Deck should now be ~308 cards. Start another game without reshuffle.
    page.evaluate("""
        window.__game.gameOver = true;
        window.__game.startGame();
    """)

    remaining_after = page.evaluate("window.__game.deck.remainingCards")
    assert remaining_after == 304, f"Expected 304 cards (no reshuffle), got {remaining_after}"
