from playwright.sync_api import sync_playwright
import time

def verify_login_screen():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print("Navigating to http://localhost:3000")
            page.goto("http://localhost:3000")

            # Wait for login screen
            page.wait_for_selector("#login-screen")

            # Check for new elements
            print("Checking elements...")
            assert page.is_visible("#login-email"), "Email input not visible"
            assert page.is_visible("#login-password"), "Password input not visible"
            assert page.is_visible("#login-google-btn"), "Google button not visible"
            assert page.is_visible("#toggle-auth-mode"), "Toggle link not visible"

            print("Taking screenshot of Login Mode")
            page.screenshot(path="verification_login_supabase.png")

            # Click toggle to switch to register
            print("Switching to Register Mode")
            page.click("#toggle-auth-mode")
            time.sleep(0.5) # Wait for text update

            # Check text changes
            title = page.text_content("#auth-title")
            btn_text = page.text_content("#login-btn")
            assert "Cadastro" in title, f"Title should contain 'Cadastro', got '{title}'"
            assert "Cadastrar" in btn_text, f"Button should contain 'Cadastrar', got '{btn_text}'"

            print("Taking screenshot of Register Mode")
            page.screenshot(path="verification_register_supabase.png")

            print("Verification successful!")

        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="verification_failed.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    verify_login_screen()
