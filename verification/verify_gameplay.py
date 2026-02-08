
from playwright.sync_api import sync_playwright
import time

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app (using default Vite port)
        page.goto("http://localhost:5173")

        # Login
        page.fill("#login-username", "testuser")
        page.click("#login-btn")

        # Start Game (Welcome Screen)
        page.click("#start-game-btn")
        time.sleep(1)

        # Place Bet (using default 50)
        page.click("#bet-btn")
        time.sleep(1)

        # Click Hint Button
        page.click("#hint-btn")
        time.sleep(1) # Wait for animation

        # Take screenshot of Hint effect
        page.screenshot(path="verification/hint_verification.png")
        print("Screenshot saved to verification/hint_verification.png")

        # Play until game over to see Rebet button
        # Force a bust or stand to end round quickly
        try:
            page.click("#stand-btn")
        except:
            pass # Maybe round ended already

        time.sleep(2) # Wait for dealer turn

        # Take screenshot of Game Over screen with Rebet button
        page.screenshot(path="verification/rebet_verification.png")
        print("Screenshot saved to verification/rebet_verification.png")

        browser.close()

if __name__ == "__main__":
    verify_frontend()
