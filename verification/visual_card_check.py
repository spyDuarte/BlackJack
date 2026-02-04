from playwright.sync_api import sync_playwright
import sys
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
    try:
        port = start_server()
        print(f"Server started on port {port}")
    except Exception as e:
        print(f"Failed to start server: {e}")
        sys.exit(1)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"Browser Error: {exc}"))

        url = f'http://localhost:{port}/index.html'
        print(f"Navigating to {url}")

        try:
            page.goto(url)
            page.wait_for_selector('.start-btn')
            print("Clicking start button")
            page.click('.start-btn')

            # Wait for game screen
            page.wait_for_selector('#bet-btn')
            print("Game screen loaded, placing bet")

            # Click bet button to deal
            page.click('#bet-btn')

            # Wait for deal animation
            print("Waiting for cards")
            page.wait_for_selector('#dealer-cards .card')
            time.sleep(1) # Allow animation to finish

            # Screenshot
            os.makedirs('verification', exist_ok=True)
            page.screenshot(path='verification/cards_visual.png')
            print("Screenshot saved to verification/cards_visual.png")

        except Exception as e:
            print(f"Verification failed: {e}")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == '__main__':
    run()
