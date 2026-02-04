import http.server
import socketserver
import threading
import time
from playwright.sync_api import sync_playwright

PORT = 8002

def start_server():
    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print("serving at port", PORT)
        httpd.serve_forever()

def verify_animations():
    # Start server in background
    thread = threading.Thread(target=start_server, daemon=True)
    thread.start()

    # Wait for server to start
    time.sleep(1)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(f"http://localhost:{PORT}/index.html")

        # Click start button (skip welcome screen)
        # Use first() to avoid strict mode violation if multiple buttons share the class but only one is the main start button
        # or filter by text
        start_btn = page.locator(".start-btn").filter(has_text="Começar").first
        if start_btn.is_visible():
            start_btn.click()

        # Wait for game to be ready (game-area visible)
        page.wait_for_selector(".game-area")

        # Take a screenshot of the initial state
        page.screenshot(path="verification/initial_state.png")
        print("Initial state screenshot taken.")

        # Interact: Place a bet
        if page.is_visible("#bet-btn"):
            page.click("#bet-btn")
            # Wait a bit for accelerated animation
            page.wait_for_timeout(2000)
            page.screenshot(path="verification/game_started.png")
            print("Game started screenshot taken.")

        browser.close()

if __name__ == "__main__":
    verify_animations()
