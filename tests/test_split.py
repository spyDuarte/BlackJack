from playwright.sync_api import sync_playwright
import os
import sys
import threading
import http.server
import socketserver
import time

def start_server():
    handler = http.server.SimpleHTTPRequestHandler
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
        url = f'http://localhost:{port}/index.html'

        try:
            page.goto(url)
            page.wait_for_selector('#welcome-screen')
            page.click('.start-btn')
            page.wait_for_selector('.container')

            # Start a game
            # page.fill('#bet-input', '100') # Input is readonly
            page.click('#bet-btn')

            # Inject state: Give player two 8s
            print("Injecting split scenario...")
            page.evaluate("""() => {
                window.game.playerHands = [{
                    cards: [{suit: '♠', value: '8'}, {suit: '♥', value: '8'}],
                    bet: 100,
                    status: 'playing'
                }];
                window.game.currentHandIndex = 0;
                window.game.balance = 1000; // Ensure enough balance
                window.game.updateDisplay();
            }""")

            # Check if split button is visible
            split_btn = page.locator('#split-btn')
            if not split_btn.is_visible():
                raise Exception("Split button should be visible")
            print("Split button is visible")

            # Click split
            split_btn.click()
            print("Clicked Split")

            # Verify two hands
            hands_count = page.locator('.hand-container').count()
            if hands_count != 2:
                raise Exception(f"Expected 2 hands, found {hands_count}")
            print(f"Verified {hands_count} hands present")

            # Verify game continues (active hand highlight)
            active_hand = page.locator('.active-hand')
            if not active_hand.is_visible():
                raise Exception("No active hand highlighted")
            print("Active hand is highlighted")

            print("Split test passed successfully")

        except Exception as e:
            print(f"Test failed: {e}")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == '__main__':
    run()
