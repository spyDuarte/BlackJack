"""Test: Login system UI verification."""
import time

def test_login_screen_visible(page, game_url):
    page.goto(game_url)
    assert page.is_visible("#login-screen"), "Login screen should be visible"

def test_login_ui_elements(page, game_url):
    """Verifies that the new login UI elements are present."""
    page.goto(game_url)
    page.wait_for_selector("#login-screen")

    # Check for email and password fields
    assert page.is_visible("#login-email"), "Email input should be visible"
    assert page.is_visible("#login-password"), "Password input should be visible"
    assert page.is_visible("#login-btn"), "Login button should be visible"
    assert page.is_visible("#login-google-btn"), "Google login button should be visible"
    assert page.is_visible("#toggle-auth-mode"), "Toggle auth mode link should be visible"

    # Check initial texts
    assert "Entrar" in page.text_content("#login-btn")
    assert "Registrar-se" in page.text_content("#toggle-auth-mode")

def test_register_ui_transition(page, game_url):
    """Verifies transition to register mode."""
    page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
    page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

    page.goto(game_url)
    page.wait_for_selector("#login-screen")

    # Click toggle link to switch to register
    page.click("#toggle-auth-mode")

    # Check if text changed
    assert "Cadastrar" in page.text_content("#login-btn")
    assert "Já tem uma conta? Entrar" in page.text_content("#toggle-auth-mode")

    # Inputs should still be visible (same elements used)
    assert page.is_visible("#login-email")
    assert page.is_visible("#login-password")

    # Click toggle link to switch back to login
    page.click("#toggle-auth-mode")
    assert "Entrar" in page.text_content("#login-btn")
