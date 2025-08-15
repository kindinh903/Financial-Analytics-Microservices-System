# Financial Analytics Frontend

A modern React SPA (Single Page Application) for financial analytics with TradingView charts, portfolio management, and market insights.

## Features

- 📊 **Dashboard**: Overview of services status and market data
- 📈 **Charts**: Advanced TradingView charts with multiple timeframes
- 💼 **Portfolio**: Investment tracking and management
- 📰 **News**: Financial news with category filtering
- 🔐 **Authentication**: JWT-based authentication system
- 📱 **Responsive**: Mobile-friendly design with Tailwind CSS

## Tech Stack

- **React 18** - Modern React with hooks
- **React Router 6** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **react-tradingview-widget** - Official TradingView charts
- **Axios** - HTTP client for API calls
- **Docker** - Containerization

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Docker (for containerized deployment)

## Quick Start

### Development Mode

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

1. Build the application:
```bash
npm run build
```

2. The built files will be in the `build/` directory.

### Docker Deployment

1. Build the Docker image:
```bash
docker build -t financial-analytics-frontend .
```

2. Run the container:
```bash
docker run -p 3000:80 financial-analytics-frontend
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout/         # Layout components (Header, Layout)
│   └── Charts/         # Chart components (TradingViewChart)
├── pages/              # Page components
│   ├── Dashboard.js    # Main dashboard
│   ├── Charts.js       # Trading charts
│   ├── Portfolio.js    # Portfolio management
│   └── News.js         # Financial news
├── services/           # API services
│   └── api.js         # API client and endpoints
├── App.js             # Main app component with routing
└── index.js           # Entry point
```

## API Integration

The frontend communicates with backend services through a gateway:

- **Gateway**: `http://localhost:8080`
- **Price Service**: `/api/price/*`
- **Auth Service**: `/api/auth/*`
- **User Service**: `/api/user/*`
- **News Service**: `/api/news/*`

## Environment Variables

Create a `.env` file in the root directory:

```env
REACT_APP_API_URL=http://localhost:8080
```

## Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

## Features in Detail

### TradingView Charts
- Multiple timeframes (1H, 4H, 1D, 1W, 1M)
- Technical indicators (RSI, MACD, Bollinger Bands)
- Symbol search and switching
- Responsive design

### Portfolio Management
- Asset tracking
- Performance metrics
- Add/edit/remove holdings
- Real-time price updates

### News Dashboard
- Category filtering
- Sentiment analysis
- Source attribution
- Responsive grid layout

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License. 