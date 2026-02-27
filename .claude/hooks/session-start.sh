#!/bin/bash
set -euo pipefail

# Only run in Claude Code remote environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo "Setting up BlackJack Premium environment..."

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Install Python dependencies (pytest + playwright)
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Install Playwright browsers for E2E tests
echo "Installing Playwright browsers..."
if ! python3 -m playwright install chromium chromium-headless-shell; then
  echo "Warning: Playwright browser installation failed. Browsers may already be cached or network access is restricted."
fi

echo "Environment setup complete!"
