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
    assert page.is_visible("#go-to-register"), "Toggle auth mode link should be visible"

    # Check initial texts
    assert "Entrar" in page.text_content("#login-btn")
    assert "Registrar-se" in page.text_content("#go-to-register")

def test_register_ui_transition(page, game_url):
    """Verifies transition to register mode."""
    page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
    page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

    page.goto(game_url)
    page.wait_for_selector("#login-screen")

    # Ensure Login is visible and Register is hidden
    assert page.is_visible("#login-screen")
    assert not page.is_visible("#register-screen")

    # Click toggle link to switch to register
    page.click("#go-to-register")

    # Check if visibility switched
    assert not page.is_visible("#login-screen")
    assert page.is_visible("#register-screen")

    # Check for Register elements
    assert page.is_visible("#register-email")
    assert page.is_visible("#register-password")
    assert "Cadastrar" in page.text_content("#register-btn")

    # Click toggle link to switch back to login
    page.click("#go-to-login")
    assert page.is_visible("#login-screen")
    assert not page.is_visible("#register-screen")
