from playwright.sync_api import sync_playwright
import time
import os

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Load the page
        print("Navigating to app...")
        page.goto("http://localhost:3000")
        time.sleep(1) # Wait for initial load
        page.screenshot(path="verification/step1_login_screen.png")
        print("Saved step1_login_screen.png")

        # 2. Login
        print("Filling login form...")
        page.fill("#login-email", "test@example.com")
        page.fill("#login-password", "password123")
        page.click("#login-btn")

        # 3. Wait for welcome screen
        print("Waiting for welcome screen...")
        try:
            page.wait_for_selector("#welcome-screen", state="visible", timeout=3000)
            time.sleep(0.5) # Allow transition to finish
            page.screenshot(path="verification/step2_welcome_screen.png")
            print("Saved step2_welcome_screen.png")
        except Exception as e:
            print(f"Error waiting for welcome screen: {e}")
            page.screenshot(path="verification/step2_error.png")
            return

        # 4. Start Game
        print("Starting game...")
        page.click("#start-game-btn")

        # 5. Wait for game UI
        print("Waiting for game UI...")
        try:
            page.wait_for_selector("#bet-btn", state="visible", timeout=3000)
            time.sleep(0.5) # Allow transition to finish
            page.screenshot(path="verification/step3_game_ui.png")
            print("Saved step3_game_ui.png")
        except Exception as e:
            print(f"Error waiting for game UI: {e}")
            page.screenshot(path="verification/step3_error.png")
            return

        print("Verification complete!")
        browser.close()

if __name__ == "__main__":
    run_verification()
