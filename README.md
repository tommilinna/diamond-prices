# Diamond Price Explorer

![CI](https://github.com/tommilinna/diamond-prices/actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![React](https://img.shields.io/badge/React-19-61dafb)

Real-time diamond price dashboard powered by [OpenFacet](https://openfacet.net/) market data. Track GIA-graded round brilliant diamond prices across the 4Cs (Carat, Color, Clarity, Cut).

**[Live Demo](https://tommilinna.github.io/diamond-prices/)**

## Features

- **Price Matrix** -- Color x Clarity price grid for each carat weight with heatmap coloring, change detection (flash animation), and supply depth tooltips
- **Price Calculator** -- Estimate any carat weight via log-linear interpolation between reference bands with full breakdown
- **Market Index** -- DCX Diamond Index with trend indicator and sparkline visualization
- **Market Depth** -- Interactive Recharts bar charts showing supply distribution by carat weight and clarity grade
- **Price Alerts** -- Set price targets with browser notifications, persisted in localStorage
- **CSV Export** -- Download the current price matrix as a CSV file
- **Dark Mode** -- System-aware theme with manual toggle, persisted across sessions
- **Auto-refresh** -- Polls OpenFacet API every 30 minutes with live status indicator

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | React 19 + TypeScript 5.9 |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 |
| Charts | Recharts |
| Testing | Vitest + React Testing Library |
| CI/CD | GitHub Actions |
| Hosting | GitHub Pages |

## Getting Started

```bash
# Clone
git clone https://github.com/tommilinna/diamond-prices.git
cd diamond-prices

# Install
npm install

# Development
npm run dev

# Run tests
npm test

# Production build
npm run build
```

## Architecture

```
src/
  api/
    openfacet.ts        # API client + TypeScript types (IndexData, MatrixData, DepthData)
  components/
    PriceMatrix.tsx      # Color x Clarity price grid with heatmap + CSV export
    PriceCalculator.tsx  # Interpolation-based price estimator
    MarketIndex.tsx      # DCX index display with sparkline
    MarketDepth.tsx      # Recharts supply distribution charts
    PriceAlerts.tsx      # Alert management UI
    CaratSelector.tsx    # Carat band radio group
  hooks/
    useOpenFacet.ts      # Data fetching with polling and change detection
    useAlerts.ts         # Alert state management with localStorage + notifications
    useTheme.ts          # Dark/light mode with system preference detection
  utils/
    price.ts             # Price math: logToPrice, interpolation, formatting
  test/
    setup.ts             # Vitest + jest-dom setup
```

## Data Source

All price data comes from [OpenFacet](https://openfacet.net/), which aggregates real asking prices for GIA-graded natural diamonds. The dashboard shows prices for **round brilliant** cut diamonds with **3EX (Triple Excellent)** cut grade and **no fluorescence**.

- `index.json` -- DCX market index + example spec stones
- `matrix.json` -- Log-price matrix (10 colors x 8 clarities x 10 carat bands)
- `depth.json` -- Market depth (stone counts by carat, color, clarity)

## License

[MIT](LICENSE)
