from playwright.sync_api import sync_playwright
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

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            try:
                url = f'http://localhost:{port}/index.html'
                print(f"Navigating to {url}")
                page.goto(url)

                # Login
                page.wait_for_selector('#login-screen')
                page.fill('#login-username', 'TestUser')
                page.click('#login-btn')

                # Start game
                page.wait_for_selector('#start-game-btn')
                page.click('#start-game-btn')

                # Check if button exists
                print("Checking for 2x button...")
                try:
                    page.wait_for_selector('#bet-double-value', timeout=2000)
                    print("2x button found.")
                except Exception as e:
                    print("2x button NOT found.")
                    # We expect this to fail initially
                    sys.exit(1)

                # Get initial bet
                initial_bet = int(page.input_value('#bet-input'))
                print(f"Initial bet: {initial_bet}")

                # Click 2x
                print("Clicking 2x button...")
                page.click('#bet-double-value')

                # Check new bet
                new_bet = int(page.input_value('#bet-input'))
                print(f"New bet: {new_bet}")

                if new_bet != initial_bet * 2:
                    print(f"ERROR: Expected {initial_bet * 2}, got {new_bet}")
                    sys.exit(1)

                print("Verification passed!")

            finally:
                browser.close()

    except Exception as e:
        print(f"Test failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    run()
