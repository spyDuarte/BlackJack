"""Test: Balance reset when player goes bankrupt."""
import time


def test_no_bankruptcy_notification(logged_in_page):
    page = logged_in_page
    page.wait_for_function("window.__game !== undefined")

    page.on("dialog", lambda dialog: dialog.accept())

    # Force state to zero balance and trigger endGame
    page.evaluate("""() => {
        window.__game.balance = 0;
        window.__game.currentBet = 100;
        window.__game.playerHands = [{
            cards: [{value:'2', suit:'H'}, {value:'3', suit:'D'}],
            bet: 100,
            status: 'playing'
        }];
        window.__game.dealerHand = [{value:'10', suit:'H'}, {value:'K', suit:'D'}];
        window.__game.balance = 0;
        window.__game.endGame();
    }""")

    time.sleep(2.5)

    content = page.content()
    notification_visible = "Voce ficou sem dinheiro! Reiniciando..." in content

    time.sleep(2.5)
    assert not notification_visible, "Bankruptcy notification should not be present"
