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
    """Start a local HTTP server serving the 'dist' directory (Vite build) and return its port."""
    # Serve the 'dist' folder which contains the built artifacts
    dist_dir = os.path.join(os.path.dirname(__file__), "..", "dist")
    if not os.path.exists(dist_dir):
        # Fallback to current directory for debugging if build failed/skipped locally
        dist_dir = os.path.join(os.path.dirname(__file__), "..")

    os.chdir(dist_dir)
    httpd = socketserver.TCPServer(("", 0), QuietHTTPHandler)
    port = httpd.server_address[1]
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()
    time.sleep(0.5)
    yield port
    httpd.shutdown()


@pytest.fixture
def page(server_port):
    """Create a fresh browser and page for each test."""
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-gpu",
                "--single-process",
                "--no-zygote",
                "--disable-setuid-sandbox",
            ]
        )
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
