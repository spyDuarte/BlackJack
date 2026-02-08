
import pytest

def test_login_submission_error(page, game_url):
    """Verifies that submitting the login form shows an error message."""
    page.goto(game_url)
    page.wait_for_selector("#login-screen")

    # Fill in dummy credentials
    page.fill("#login-email", "test@example.com")
    page.fill("#login-password", "password123")

    # Submit form by clicking button
    page.click("#login-btn")

    # Wait for error message
    page.wait_for_selector("#login-error")
    error_text = page.text_content("#login-error")
    assert error_text != ""
    # Should be one of these depending on env
    assert any(msg in error_text for msg in ["Failed to fetch", "Supabase not configured", "Invalid login credentials"])

def test_login_submission_enter_key(page, game_url):
    """Verifies that pressing Enter in password field submits the form."""
    page.goto(game_url)
    page.wait_for_selector("#login-screen")

    page.fill("#login-email", "test@example.com")
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

    page.fill("#login-email", "test@example.com")
    page.fill("#login-password", "password123")

    # Press Enter in email field
    page.press("#login-email", "Enter")

    # Wait for error message
    page.wait_for_selector("#login-error")
    error_text = page.text_content("#login-error")
    assert error_text != ""
    assert any(msg in error_text for msg in ["Failed to fetch", "Supabase not configured", "Invalid login credentials"])
