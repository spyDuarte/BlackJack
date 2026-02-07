# BlackJack Premium ♠️

[![CI](https://github.com/blackjack-premium/blackjack-premium/actions/workflows/ci.yml/badge.svg)](https://github.com/blackjack-premium/blackjack-premium/actions/workflows/ci.yml)

A feature-rich, browser-based Blackjack (21) game built with modern JavaScript (ES Modules), Vite, and HTML5.

## Features

- **Standard Blackjack Rules**: Dealer hits on soft 17, 3:2 Blackjack payout, 2:1 Insurance.
- **Advanced Moves**: Split (up to 3 times), Double Down, Surrender.
- **Persistent State**: Game progress and settings are saved automatically via `localStorage`.
- **Rich UI**: Smooth animations, sound effects, and responsive design.
- **Statistics**: Track your wins, losses, win rate, and total winnings.
- **Configurable**: Toggle sounds, animations, auto-save, and switch between Light/Dark themes.
- **Modern Stack**: Built with Vite for fast development and optimized production builds.

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES Modules), CSS3 (Variables, Flexbox/Grid), HTML5.
- **Build Tool**: Vite.
- **Testing**:
    - **Unit**: Vitest (for core game logic).
    - **E2E**: Playwright + Pytest (for browser automation and integration).
- **Code Quality**: ESLint + Prettier.

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+ (for E2E tests)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/blackjack-premium.git
    cd blackjack-premium
    ```

2.  Install Node dependencies:
    ```bash
    npm install
    ```

3.  (Optional) Install Python dependencies for E2E tests:
    ```bash
    pip install -r requirements.txt
    python -m playwright install chromium chromium-headless-shell
    ```

### Running Locally

Start the local development server with Vite:

```bash
npm run dev
```

Open your browser at the URL shown in the terminal (usually `http://localhost:5173` or `http://localhost:3000`).

### Building for Production

To build the project for production:

```bash
npm run build
```

The output will be in the `dist/` directory. You can preview the production build with:

```bash
npm run preview
```

## Development

### Project Structure

```text
src/
  core/           # Core game logic
    BlackjackEngine.js  # Pure game rules and state management
    GameManager.js      # Orchestrator (connects Engine, UI, Storage)
    Deck.js             # Card deck logic
    Constants.js        # Game configuration
  ui/             # User Interface logic
    UIManager.js        # DOM manipulation and event handling
  utils/          # Utility modules
    HandUtils.js        # Hand value calculations
    SoundManager.js     # Audio handling
    StorageManager.js   # LocalStorage wrapper
    debounce.js         # Helper for performance
    EventEmitter.js     # Event bus
tests/
  unit/           # Vitest unit tests for JS logic
  *.py            # Pytest/Playwright E2E tests
```

### Scripts

- `npm run dev`: Start local server (Vite).
- `npm run build`: Build for production.
- `npm test`: Run unit tests (Vitest).
- `npm run test:e2e`: Run E2E tests (Playwright).
- `npm run lint`: Check for linting errors.
- `npm run format`: Format code with Prettier.

## Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes (`git commit -m 'feat: Add amazing feature'`).
4.  Push to the branch (`git push origin feature/amazing-feature`).
5.  Open a Pull Request.

Please ensure all tests pass (`npm test` and `npm run lint`) before submitting your PR.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
