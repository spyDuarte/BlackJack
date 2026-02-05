from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the local server
        url = "http://localhost:8000/index.html"
        try:
            page.goto(url)
            # Wait for game to initialize
            page.wait_for_selector('.container')

            # Benchmark
            print("Running benchmark...")

            # We measure time inside the browser context to avoid Playwright overhead for each call
            # although we are running 200 calls in one evaluate block if possible, or looping in python.
            # Looping in python adds overhead. Let's do it in JS.

            result = page.evaluate("""() => {
                const start = performance.now();
                for(let i = 0; i < 200; i++) {
                    window.game.ui.createConfetti();
                }
                const end = performance.now();
                return end - start;
            }""")

            print(f"Benchmark finished. Duration: {result:.2f} ms")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
