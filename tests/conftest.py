import pytest
import os
import time
from playwright.sync_api import sync_playwright

def _find_chromium_executable():
    """Find a Chromium executable from Playwright's cache (multiple layouts)."""
    cache_dir = os.path.expanduser("~/.cache/ms-playwright")
    if not os.path.isdir(cache_dir):
        return None

    candidates = []
    try:
        for entry in sorted(os.listdir(cache_dir), reverse=True):
            entry_dir = os.path.join(cache_dir, entry)
            if not os.path.isdir(entry_dir):
                continue

            # Chromium for Testing layout
            if entry.startswith("chromium-"):
                candidates.append(os.path.join(entry_dir, "chrome-linux", "chrome"))
                candidates.append(os.path.join(entry_dir, "chrome-linux64", "chrome"))

            # Headless shell layout
            if entry.startswith("chromium_headless_shell-"):
                candidates.append(
                    os.path.join(entry_dir, "chrome-headless-shell-linux64", "chrome-headless-shell")
                )
    except FileNotFoundError:
        return None

    for candidate in candidates:
        if os.path.isfile(candidate):
            return candidate
    return None


@pytest.fixture
def page():
    """Create a fresh browser and page for each test."""
    with sync_playwright() as p:
        launch_kwargs = {
            "headless": True,
            "args": [
                "--no-sandbox",
                "--disable-gpu",
                "--single-process",
                "--no-zygote",
                "--disable-setuid-sandbox",
            ],
        }
        executable = _find_chromium_executable()
        if executable:
            launch_kwargs["executable_path"] = executable
        browser = p.chromium.launch(**launch_kwargs)
        pg = browser.new_page()
        yield pg
        browser.close()


@pytest.fixture
def game_url():
    """Return the full URL to the game's index.html."""
    return "http://localhost:3000"


@pytest.fixture
def logged_in_page(page, game_url):
    """Log in to the game and return the page object ready to play."""
    page.goto(game_url)
    page.wait_for_selector("#login-screen")
    page.fill("#login-email", "test@example.com")
    page.fill("#login-password", "password123")
    page.click("#login-btn")

    # Wait for login screen to disappear
    page.wait_for_selector("#login-screen", state="hidden")

    # Handle Welcome Screen if it appears
    try:
        page.wait_for_selector("#welcome-screen", state="visible", timeout=2000)
        page.click("#start-game-btn")
        page.wait_for_selector("#welcome-screen", state="hidden")
    except Exception:
        pass

    # Wait for the main game screen to be interactable
    page.wait_for_selector("#bet-btn", state="visible")

    return page
