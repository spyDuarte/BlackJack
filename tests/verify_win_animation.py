from playwright.sync_api import sync_playwright
import http.server
import socketserver
import threading
import time
import os
import sys

def start_server():
    handler = http.server.SimpleHTTPRequestHandler
    def log_message(self, format, *args):
        pass
    handler.log_message = log_message

    # Use port 0 for random available port
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

        url = f"http://localhost:{port}/index.html"
        print(f"Navigating to {url}")

        try:
            page.goto(url)
            page.wait_for_selector('.container')

            # Hide welcome screen
            page.evaluate("document.getElementById('welcome-screen').style.display = 'none'")

            # Inject win animation
            print("Triggering win animation...")
            page.evaluate("""
                window.game.ui.showWinAnimation(500);
            """)

            # Wait a bit for animation to appear
            time.sleep(1)

            screenshot_path = os.path.abspath("tests/win_animation_test.png")
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")

        except Exception as e:
            print(f"Error: {e}")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    run()
