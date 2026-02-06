import pytest
import os
import time
import threading
import http.server
import socketserver
from playwright.sync_api import sync_playwright


class QuietHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


@pytest.fixture(scope="session")
def server_port():
    """Start a local HTTP server serving the project root and return its port."""
    os.chdir(os.path.join(os.path.dirname(__file__), ".."))
    httpd = socketserver.TCPServer(("", 0), QuietHTTPHandler)
    port = httpd.server_address[1]
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()
    time.sleep(0.5)
    yield port
    httpd.shutdown()


def _find_chromium_executable():
    """Find a Chromium executable from Playwright's cache (multiple layouts)."""
    cache_dir = os.path.expanduser("~/.cache/ms-playwright")
    if not os.path.isdir(cache_dir):
        return None

    candidates = []
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

    for candidate in candidates:
        if os.path.isfile(candidate):
            return candidate
    return None


@pytest.fixture
def page(server_port):
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
def game_url(server_port):
    """Return the full URL to the game's index.html."""
    return f"http://localhost:{server_port}/index.html"


@pytest.fixture
def logged_in_page(page, game_url):
    """Navigate to the game, login as TestUser, and start the game.

    Returns the page object ready for game interaction.
    """
    page.goto(game_url, wait_until="domcontentloaded")
    page.wait_for_selector("#login-screen", state="attached")
    time.sleep(0.5)  # Wait for CSS animations
    page.click("#login-username")
    page.keyboard.type("TestUser")
    page.click("#login-btn")
    page.wait_for_selector("#start-game-btn", state="attached")
    time.sleep(0.5)
    page.click("#start-game-btn")
    page.wait_for_selector(".container", state="attached")
    time.sleep(0.5)
    return page
