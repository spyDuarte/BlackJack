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
    # Start server
    try:
        port = start_server()
        print(f"Server started on port {port}")
    except Exception as e:
        print(f"Failed to start server: {e}")
        sys.exit(1)

    # Give it a moment to ensure it's ready (though usually instant)
    time.sleep(1)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        url = f'http://localhost:{port}/index.html'
        print(f"Navigating to {url}")

        try:
            page.goto(url)

            # Login
            page.wait_for_selector('#login-screen')
            page.fill('#login-username', 'TestUser')
            page.click('#login-btn')

            # Wait for welcome screen
            page.wait_for_selector('#welcome-screen')
            print("Welcome screen visible")

            # Click start button
            page.click('#start-game-btn')
            print("Clicked start button")

            # Wait for loading to finish and game to start
            page.wait_for_selector('.container')

            # Verify critical game elements
            page.wait_for_selector('#dealer-cards')
            page.wait_for_selector('#player-cards')
            page.wait_for_selector('#bet-controls')

            print("Game initialized successfully")

        except Exception as e:
            print(f"Test failed: {e}")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == '__main__':
    run()
