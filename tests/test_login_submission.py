
import pytest

def test_login_submission_error(page, game_url):
    """Verifies that submitting the login form shows an error message for non-test users."""
    page.goto(game_url)
    page.wait_for_selector("#login-screen")

    # Fill in dummy credentials (NOT containing "test")
    page.fill("#login-email", "user@example.com")
    page.fill("#login-password", "password123")

    # Submit form by clicking button
    page.click("#login-btn")

    # Wait for error message
    page.wait_for_selector("#login-error")
    error_text = page.text_content("#login-error")
    assert error_text != ""
    assert any(msg in error_text for msg in ["Failed to fetch", "Supabase not configured", "Invalid login credentials"])

def test_login_submission_enter_key(page, game_url):
    """Verifies that pressing Enter in password field submits the form."""
    page.goto(game_url)
    page.wait_for_selector("#login-screen")

    page.fill("#login-email", "user@example.com")
    page.fill("#login-password", "password123")

    # Press Enter in password field
    page.press("#login-password", "Enter")

    # Wait for error message
    page.wait_for_selector("#login-error")
    error_text = page.text_content("#login-error")
    assert error_text != ""
    assert any(msg in error_text for msg in ["Failed to fetch", "Supabase not configured", "Invalid login credentials"])

def test_login_submission_enter_key_email(page, game_url):
    """Verifies that pressing Enter in email field submits the form."""
    page.goto(game_url)
    page.wait_for_selector("#login-screen")

    page.fill("#login-email", "user@example.com")
    page.fill("#login-password", "password123")

    # Press Enter in email field
    page.press("#login-email", "Enter")

    # Wait for error message
    page.wait_for_selector("#login-error")
    error_text = page.text_content("#login-error")
    assert error_text != ""
    assert any(msg in error_text for msg in ["Failed to fetch", "Supabase not configured", "Invalid login credentials"])

def test_login_success(page, game_url):
    """Verifies that test credentials allow successful login."""
    page.goto(game_url)
    page.wait_for_selector("#login-screen")

    page.fill("#login-email", "test@example.com")
    page.fill("#login-password", "password123")
    page.click("#login-btn")

    # Expect login screen to disappear and game UI to appear
    page.wait_for_selector("#balance")
    assert page.is_visible("#balance")
