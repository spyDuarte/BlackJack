from playwright.sync_api import sync_playwright
import os
import sys
import threading
import http.server
import socketserver
import time

def start_server():
    # Use port 0 to let the OS choose an available port
    handler = http.server.SimpleHTTPRequestHandler

    # Suppress logging to keep output clean
    def log_message(self, format, *args):
        pass
    handler.log_message = log_message

    httpd = socketserver.TCPServer(("", 0), handler)
    port = httpd.server_address[1]

    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()

    return port

def run():
    try:
        port = start_server()
        print(f"Server started on port {port}")
    except Exception as e:
        print(f"Failed to start server: {e}")
        sys.exit(1)

    time.sleep(1)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Handle dialogs (confirm reset) - auto accept
        page.on("dialog", lambda dialog: dialog.accept())

        # Enable console logs
        page.on("console", lambda msg: print(f"Console: {msg.text}"))

        url = f'http://localhost:{port}/index.html'
        print(f"Navigating to {url}")

        try:
            page.goto(url)
            page.wait_for_selector('#welcome-screen')
            page.click('.start-btn')
            page.wait_for_selector('.container')

            # Ensure game is initialized
            page.wait_for_function("() => window.game !== undefined")

            # Force state to zero balance and ensure loss
            print("Setting up game state for bankruptcy...")
            page.evaluate("""() => {
                window.game.balance = 0;
                window.game.currentBet = 100; // Bet was already deducted presumably, or we just simulate it
                // Actually, just ensure balance is 0 after endGame

                // Force a loss condition
                window.game.playerHand = [{value:'2', suit:'H'}, {value:'3', suit:'D'}]; // 5
                window.game.dealerHand = [{value:'10', suit:'H'}, {value:'K', suit:'D'}]; // 20

                // Set balance to 0
                window.game.balance = 0;

                // Trigger endGame
                window.game.endGame();
            }""")

            # Wait for the "You ran out of money" notification (approx 2s delay)
            # We check at 2.5s
            time.sleep(2.5)

            # Check for notification
            content = page.content()
            notification_visible = "Você ficou sem dinheiro! Reiniciando..." in content

            if notification_visible:
                print("NOTIFICATION FOUND: 'Você ficou sem dinheiro! Reiniciando...' is visible.")
            else:
                print("NOTIFICATION NOT FOUND.")

            # Wait for reset (another 2s delay, total 4s)
            time.sleep(2.5)

            # Check balance to confirm reset
            balance = page.evaluate("window.game.balance")
            print(f"Final Balance: {balance}")

            if notification_visible:
                 # If we found it, and we haven't fixed it yet, this is expected behavior (for now)
                 # But since this test is "verify_balance_reset.py" intended to verify the FIX,
                 # it should fail if notification is found.
                 print("FAIL: Notification was present.")
                 sys.exit(1)
            else:
                 print("PASS: Notification was absent.")

        except Exception as e:
            print(f"Test failed: {e}")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == '__main__':
    run()
