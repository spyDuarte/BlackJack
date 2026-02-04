from playwright.sync_api import sync_playwright
import threading
import http.server
import socketserver
import time
import json

def start_server():
    handler = http.server.SimpleHTTPRequestHandler
    def log_message(self, format, *args): pass
    handler.log_message = log_message
    httpd = socketserver.TCPServer(("", 0), handler)
    port = httpd.server_address[1]
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()
    return port

def run():
    port = start_server()
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        page.goto(f'http://localhost:{port}/index.html')

        # Login
        page.wait_for_selector('#login-screen')
        page.fill('#login-username', 'DebounceUser')
        page.click('#login-btn')

        page.wait_for_selector('#start-game-btn')
        page.click('#start-game-btn')
        page.wait_for_timeout(1000)

        # Clear storage first
        page.evaluate("localStorage.clear()")

        # Trigger save
        print("Triggering saveGame...")
        page.evaluate("window.game.saveGame()")

        # Check immediately
        saved = page.evaluate("localStorage.getItem('blackjack-premium-save-DebounceUser')")
        if saved:
            print("FAILURE: Saved immediately! Debounce not working.")
        else:
            print("SUCCESS: Not saved immediately.")

        # Wait 1.5s
        print("Waiting for debounce...")
        page.wait_for_timeout(1500)

        # Check again
        saved = page.evaluate("localStorage.getItem('blackjack-premium-save-DebounceUser')")
        if saved:
            print("SUCCESS: Saved after delay.")
        else:
            print("FAILURE: Not saved after delay.")

        browser.close()

if __name__ == '__main__':
    run()
