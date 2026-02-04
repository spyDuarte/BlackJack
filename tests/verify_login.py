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
        context = browser.new_context()
        page = context.new_page()

        url = f'http://localhost:{port}/index.html'
        print(f"Navigating to {url}")

        try:
            page.goto(url)

            # 1. Check Login Screen is visible
            print("Checking for login screen...")
            # We expect login screen to be visible and welcome screen hidden (or covered)
            if not page.is_visible('#login-screen'):
                print("FAIL: Login screen not visible")
                #sys.exit(1) # Don't exit yet as we expect this to fail initially
            else:
                print("Login screen visible")

            # 2. Login as User1
            print("Logging in as User1...")
            page.fill('#login-username', 'User1')
            page.click('#login-btn')

            # 3. Check Welcome Screen
            print("Checking for welcome screen...")
            page.wait_for_selector('#welcome-screen', state='visible')
            print("Welcome screen visible")

            # 4. Start Game
            print("Starting game...")
            page.click('#start-game-btn')
            page.wait_for_selector('.container', state='visible')

            # 5. Check Initial Balance
            balance_text = page.text_content('#balance')
            print(f"User1 Balance: {balance_text}")
            if '$1000' not in balance_text:
                 print(f"FAIL: Expected $1000, got {balance_text}")
                 sys.exit(1)

            # 6. Modify Balance
            print("Modifying User1 balance to $2000...")
            page.evaluate("window.game.balance = 2000; window.game.saveGame(); window.game.updateUI();")

            # Wait a bit for save (debounced)
            time.sleep(1.5)

            # 7. Reload and Login User1 again
            print("Reloading page...")
            page.reload()
            page.wait_for_selector('#login-screen', state='visible')

            print("Logging in as User1 again...")
            page.fill('#login-username', 'User1')
            page.click('#login-btn')

            page.wait_for_selector('#welcome-screen', state='visible')
            page.click('#start-game-btn')
            page.wait_for_selector('.container', state='visible')

            balance_text = page.text_content('#balance')
            print(f"User1 Balance after reload: {balance_text}")
            if '$2000' not in balance_text:
                 print(f"FAIL: Expected $2000, got {balance_text}")
                 sys.exit(1)

            # 8. Reload and Login User2
            print("Reloading page...")
            page.reload()
            page.wait_for_selector('#login-screen', state='visible')

            print("Logging in as User2...")
            page.fill('#login-username', 'User2')
            page.click('#login-btn')

            page.wait_for_selector('#welcome-screen', state='visible')
            page.click('#start-game-btn')
            page.wait_for_selector('.container', state='visible')

            balance_text = page.text_content('#balance')
            print(f"User2 Balance: {balance_text}")
            if '$1000' not in balance_text:
                 print(f"FAIL: Expected $1000, got {balance_text}")
                 sys.exit(1)

            print("SUCCESS: Login system verified.")

        except Exception as e:
            print(f"Test failed: {e}")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == '__main__':
    run()
