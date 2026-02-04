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

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"Browser Error: {exc}"))

        url = f'http://localhost:{port}/index.html'

        try:
            print(f"Navigating to {url}")
            page.goto(url)
            page.wait_for_selector('.start-btn')
            page.click('.start-btn')
            page.wait_for_selector('#bet-btn')

            # --- Test 1: Insurance ---
            print("--- Test 1: Insurance ---")
            js_mock_deck_insurance = """
            const padding = new Array(100).fill({suit: '♦', value: '2'});
            const targetCards = [
                {suit: '♠', value: '10'},
                {suit: '♠', value: 'A'},
                {suit: '♥', value: 'K'},
                {suit: '♥', value: 'Q'}
            ];
            window.game.deck.cards = [...padding, ...targetCards];
            """
            page.evaluate(js_mock_deck_insurance)
            page.click('#bet-btn')
            page.click('#insurance-no-btn')
            time.sleep(2)
            page.evaluate("window.game.resetGame()")
            page.wait_for_selector('#bet-btn')

            print("\nAll feature tests passed!")

        except Exception as e:
            print(f"Test failed: {e}")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == '__main__':
    run()
