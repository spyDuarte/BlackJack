"""Test: Insurance functionality — accept/decline, insufficient balance handling."""
import time


def test_insurance_insufficient_balance(logged_in_page):
    page = logged_in_page
    page.wait_for_function("window.__game !== undefined")

    # Reset game state and set balance so player can bet but not afford insurance
    page.evaluate("""
        window.__game.gameOver = true;
        window.__game.playerHands = [];
        window.__game.balance = 100;
        window.__game.currentBet = 100;
        window.__game.insuranceTaken = false;
        document.getElementById('bet-input').value = 100;
        window.__game.startGame();
    """)
    time.sleep(1)

    # Player balance should be 0 after betting 100
    balance_after_bet = page.evaluate("window.__game.balance")
    assert balance_after_bet == 0, f"Expected 0 balance after bet, got {balance_after_bet}"

    # Try to accept insurance — should fail due to insufficient balance
    page.evaluate("window.__game.respondToInsurance(true)")
    time.sleep(0.5)

    insurance_taken = page.evaluate("window.__game.insuranceTaken")
    assert insurance_taken == False, (
        f"Insurance should not be taken with 0 balance, got {insurance_taken}"
    )


def test_insurance_accepted_with_sufficient_balance(logged_in_page):
    page = logged_in_page
    page.wait_for_function("window.__game !== undefined")

    # Set up with enough balance for insurance
    page.evaluate("""
        window.__game.balance = 500;
        window.__game.currentBet = 100;
        document.getElementById('bet-input').value = 100;
        window.__game.startGame();
    """)
    time.sleep(1)

    balance_before = page.evaluate("window.__game.balance")

    # Accept insurance (costs half the bet = 50)
    page.evaluate("window.__game.respondToInsurance(true)")
    # Wait short time to ensure balance update but before game potentially ends (if BJ)
    time.sleep(0.1)

    balance_after = page.evaluate("window.__game.balance")
    insurance_taken = page.evaluate("window.__game.insuranceTaken")

    assert insurance_taken == True, "Insurance should be accepted"
    assert balance_after == balance_before - 50, (
        f"Expected balance {balance_before - 50} after insurance, got {balance_after}"
    )


def test_insurance_declined(logged_in_page):
    page = logged_in_page
    page.wait_for_function("window.__game !== undefined")

    page.evaluate("""
        window.__game.balance = 500;
        window.__game.currentBet = 100;
        document.getElementById('bet-input').value = 100;
        window.__game.startGame();
    """)
    time.sleep(1)

    balance_before = page.evaluate("window.__game.balance")

    # Decline insurance
    page.evaluate("window.__game.respondToInsurance(false)")
    time.sleep(0.5)

    balance_after = page.evaluate("window.__game.balance")
    assert balance_after == balance_before, "Balance should not change when insurance is declined"
