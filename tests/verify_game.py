from playwright.sync_api import sync_playwright
import os
import sys

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Get absolute path to index.html relative to this script
        # Assuming script is in tests/ and index.html is in root
        cwd = os.getcwd()
        path = os.path.join(cwd, 'index.html')
        url = f'file://{path}'

        print(f"Navigating to {url}")
        try:
            page.goto(url)

            # Wait for welcome screen
            page.wait_for_selector('#welcome-screen')
            print("Welcome screen visible")

            # Click start button
            page.click('.start-btn')
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
