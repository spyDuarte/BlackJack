"""Test: Login system UI verification."""
import time

def test_login_modal_access(page, game_url):
    page.goto(game_url)

    # Check initial welcome screen is visible
    assert page.is_visible("#welcome-screen"), "Welcome screen should be visible"

    # Open settings/account modal
    page.click("#user-btn")

    # Ensure modal is visible
    assert page.is_visible("#settings-modal"), "Settings modal should be visible"

    # Switch to account tab
    page.click("#tab-btn-account")

    # Check login section visibility
    assert page.is_visible("#login-section"), "Login section should be visible in account tab"

def test_login_ui_elements(page, game_url):
    """Verifies that the new login UI elements are present."""
    page.goto(game_url)

    # Open modal and switch to account
    page.click("#user-btn")
    page.click("#tab-btn-account")

    # Check for email and password fields
    assert page.is_visible("#login-email"), "Email input should be visible"
    assert page.is_visible("#login-password"), "Password input should be visible"
    assert page.is_visible("#login-btn"), "Login button should be visible"
    assert page.is_visible("#go-to-register"), "Toggle auth mode link should be visible"

    # Check initial texts
    assert "Entrar" in page.text_content("#login-btn")
    assert "Cadastrar-se" in page.text_content("#go-to-register")

def test_register_ui_transition(page, game_url):
    """Verifies transition to register mode."""
    page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
    page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

    page.goto(game_url)

    # Open modal and switch to account
    page.click("#user-btn")
    page.click("#tab-btn-account")

    # Ensure Login is visible and Register is hidden
    assert page.is_visible("#login-section")
    assert not page.is_visible("#register-section")

    # Click toggle link to switch to register
    page.click("#go-to-register")

    # Check if visibility switched
    assert not page.is_visible("#login-section")
    assert page.is_visible("#register-section")

    # Check for Register elements
    assert page.is_visible("#register-email")
    assert page.is_visible("#register-password")
    assert "Cadastrar" in page.text_content("#register-btn")

    # Click toggle link to switch back to login
    page.click("#go-to-login")
    assert page.is_visible("#login-section")
    assert not page.is_visible("#register-section")
