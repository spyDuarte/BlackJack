import pytest
import os
import time
import random
import string
import shutil
from playwright.sync_api import sync_playwright

def _find_chromium_executable():
    """Find a Chromium executable from Playwright cache or system installation."""
    env_executable = os.getenv("PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH")
    if env_executable and os.path.isfile(env_executable):
        return env_executable

    cache_dir = os.path.expanduser("~/.cache/ms-playwright")
    candidates = []
    if os.path.isdir(cache_dir):
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

    for command in ("chromium", "chromium-browser", "google-chrome", "google-chrome-stable"):
        command_path = shutil.which(command)
        if command_path:
            candidates.append(command_path)

    candidates.extend([
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/usr/bin/google-chrome",
    ])

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
        try:
            browser = p.chromium.launch(**launch_kwargs)
        except Exception as exc:
            message = str(exc)
            if "Executable doesn't exist" in message:
                pytest.skip(f"Chromium unavailable for E2E tests: {message}")
            raise

        # Use reduced motion to disable animations and improve stability
        context = browser.new_context(reduced_motion="reduce")
        pg = context.new_page()
        yield pg
        context.close()
        browser.close()


@pytest.fixture
def game_url():
    """Return the full URL to the game's index.html."""
    return "http://localhost:3000"

@pytest.fixture
def logged_in_page(page, game_url):
    """
    Fixture that returns a page where a user has 'logged in' via direct manipulation
    of the GameManager instance, bypassing Supabase network calls.
    It also navigates past the Welcome Screen to the main game area.
    """
    page.goto(game_url)

    # Wait for game instance to be available
    page.wait_for_function("window.__game !== undefined")

    # Inject fake user and trigger login success
    page.evaluate("""
        () => {
            const game = window.__game;
            game.userId = 'test-user-id';
            game.username = 'Test User';
            game.loadGame();
            game.updateUI();

            if (game.ui) {
                game.ui.onLoginSuccess();
                game.ui.setAuthLoading(false);
            }
        }
    """)

    # Dismiss the welcome screen by calling startApp() directly.
    # Using evaluate is more reliable than clicking the button, which can
    # fail under reduced-motion due to CSS animation timing issues.
    page.evaluate("""
        () => {
            const game = window.__game;
            game.startApp();
            // Force immediate welcome screen removal to avoid animation timing issues
            const ws = document.getElementById('welcome-screen');
            if (ws) ws.style.display = 'none';
        }
    """)

    # Wait for startApp()'s loading sequence to complete (400ms loading delay
    # + UI render). The loading overlay is hidden when the game is fully ready.
    page.wait_for_function(
        "document.querySelector('.loading').style.display === 'none'",
        timeout=5000
    )

    # Wait for game UI (balance) to ensure loaded
    page.wait_for_selector("#balance", timeout=5000)

    # Ensure no overlays are blocking interaction
    page.evaluate("""
        () => {
            document.querySelectorAll('.modal, .overlay').forEach(el => el.style.display = 'none');
        }
    """)

    return page
