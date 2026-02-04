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

                # Start game
                page.wait_for_selector('.start-btn')
                page.click('.start-btn')

                # Check if button exists
                print("Checking for Max button...")
                try:
                    page.wait_for_selector('#bet-max-value', timeout=2000)
                    print("Max button found.")
                except Exception as e:
                    print("Max button NOT found.")
                    # We expect this to fail initially
                    sys.exit(1)

                # Get initial balance
                # Note: balance element text might be "000", need to parse
                balance_text = page.text_content('#balance').replace('$', '').replace(',', '')
                balance = int(balance_text)
                print(f"Current Balance: {balance}")

                # Click Max
                print("Clicking Max button...")
                page.click('#bet-max-value')

                # Check new bet
                new_bet = int(page.input_value('#bet-input'))
                print(f"New bet: {new_bet}")

                if new_bet != balance:
                    print(f"ERROR: Expected {balance}, got {new_bet}")
                    sys.exit(1)

                print("Verification passed!")

            finally:
                browser.close()

    except Exception as e:
        print(f"Test failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    run()
