from playwright.sync_api import sync_playwright
import threading
import http.server
import socketserver
import time
import os

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
    port = start_server()
    print(f"Server started on port {port}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        url = f'http://localhost:{port}/index.html'

        try:
            print(f"Navigating to {url}")
            page.goto(url)

            # Wait for welcome screen
            page.wait_for_selector('#welcome-screen')

            # Click start (Welcome screen)
            page.click('.start-btn')

            # Wait for betting UI
            page.wait_for_selector('#bet-btn')
            time.sleep(1)

            # Click Bet/Start Game
            print("Clicking Bet button...")
            page.click('#bet-btn')

            # Wait for deal
            time.sleep(2)

            # Take screenshot
            screenshot_path = 'verification/game_screen.png'
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")

        finally:
            browser.close()

if __name__ == '__main__':
    run()
