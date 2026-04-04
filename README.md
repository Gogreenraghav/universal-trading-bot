# 🤖 Universal Trading Bot

> Platform-aware intelligent trading bot for **Crypto**, **Forex**, and **Stocks** — powered by AI.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-18%2B-brightgreen.svg)

---

## 🌟 Features

- **🧠 Intelligent Trading Engine** — AI-powered decision making with knowledge base
- **📊 Full Web Dashboard** — Real-time charts, portfolio tracking, P&L monitoring
- **🎮 Demo Trading** — Practice with virtual $100 to $1M balance (no API keys needed)
- **🔗 Multi-Exchange** — Binance (live + testnet), Forex (OANDA), Stocks (Zerodha)
- **📰 News Sentiment Analysis** — Real-time market news impact assessment
- **🛡️ Advanced Risk Management** — VaR, CVaR, Sharpe Ratio, Sortino, drawdown limits
- **🔐 Secure API Storage** — AES-256-GCM encrypted API keys
- **⚡ Multiple Strategies** — Trend Following, Mean Reversion, Breakout, Scalping
- **📱 REST API** — Full API for integration with other tools
- **🔄 Paper + Live Trading** — Seamless switch between modes

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (use [nvm](https://github.com/nvm-sh/nvm))
- npm 8+

### Installation

```bash
# Clone the repository
git clone https://github.com/Gogreenraghav/universal-trading-bot.git
cd universal-trading-bot

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your API keys (see Configuration below)
nano .env

# Start the bot
npm start
```

### Demo Mode (No API Keys Required)

```bash
# Just run — no .env editing needed for demo
npm start
```

Dashboard will be available at **http://localhost:3020**

---

## ⚙️ Configuration

Copy `.env.example` to `.env` and configure:

```bash
# BINANCE API KEYS
# Get from: https://www.binance.com/en/my/settings/api-management
# Testnet: https://testnet.binance.vision/
BINANCE_API_KEY=your_api_key_here
BINANCE_SECRET_KEY=your_secret_key_here

# TRADING MODE
# Options: testnet | live
TRADING_MODE=testnet

# INITIAL CAPITAL (USDT)
INITIAL_CAPITAL=1000

# RISK PER TRADE (%)
MAX_RISK_PER_TRADE=2

# TRADING PAIRS (comma separated)
TRADING_PAIRS=BTC/USDT,ETH/USDT,BNB/USDT

# NEWS API KEY
# Get free from: https://cryptopanic.com/developer/
NEWS_API_KEY=your_news_api_key

# SERVER
PORT=3020

# LOGGING
LOG_LEVEL=info
```

---

## 📁 Project Structure

```
universal-trading-bot/
├── src/
│   ├── index.js                    ← Main entry point
│   ├── core/
│   │   └── IntelligentTradingEngine.js
│   ├── platforms/
│   │   └── crypto/
│   │       ├── CryptoPlatformAdapter.js
│   │       └── exchanges/
│   │           └── BinanceExchange.js
│   ├── integration/
│   │   ├── BinanceTradingIntegration.js
│   │   ├── DemoTradingEngine.js      ← Demo mode (no API keys!)
│   │   ├── UnifiedTradingIntegration.js
│   │   ├── NewsIntegration.js
│   │   ├── OrderManagementSystem.js
│   │   ├── RiskDashboard.js
│   │   └── SettingsManager.js        ← AES-256 encrypted keys
│   ├── ui/dashboard/
│   │   ├── server.js                  ← Express + WebSocket server
│   │   └── public/
│   │       ├── index.html             ← Dashboard UI
│   │       ├── styles.css
│   │       ├── app.js
│   │       └── demo.js
│   └── utils/
│       └── debugger.js
├── config/
│   └── config.json                   ← Bot configuration
├── knowledge-base/
│   └── crypto/
│       └── tasks/
│           └── crypto-trading.md      ← 6,000+ word trading guide
├── test/
│   ├── system-test.js
│   └── run-tests.js
├── .env.example                       ← Environment template
├── .gitignore
├── package.json
└── README.md
```

---

## 🎮 Running Modes

### Demo Mode (Recommended for Starters)
```bash
npm start
# Works without any API keys
# Virtual balance: $1,000 (customizable)
```

### Paper Trading (Testnet)
```bash
TRADING_MODE=testnet npm start
# Uses Binance testnet — no real money
```

### Live Trading (Real Account)
```bash
TRADING_MODE=live npm start
# ⚠️ WARNING: Real money at risk!
```

### Platform Selection
```bash
PLATFORM=crypto npm start   # Default — Crypto trading
PLATFORM=forex npm start   # Forex trading (OANDA)
PLATFORM=stocks npm start   # Stock trading (Zerodha)
```

---

## 📊 Dashboard Features

| Feature | Description |
|---------|-------------|
| **Portfolio** | Real-time balance, P&L, positions |
| **Charts** | Interactive price charts (1m to 1D) |
| **Orders** | Place buy/sell orders |
| **Risk Monitor** | VaR, CVaR, Sharpe, Sortino, exposure |
| **News Feed** | Sentiment analysis of market news |
| **Bot Control** | Start/Stop bot, switch strategies |
| **Settings** | Configure strategies, risk limits |

---

## 🛡️ Risk Management

Built-in risk controls:

- **VaR (Value at Risk)** — Portfolio downside exposure
- **CVaR (Conditional VaR)** — Expected loss beyond VaR
- **Sharpe Ratio** — Risk-adjusted returns
- **Sortino Ratio** — Downside risk-adjusted returns
- **Max Drawdown** — Maximum peak-to-trough loss
- **Position Sizing** — Dynamic based on risk per trade
- **Daily Loss Limit** — Auto-stop if loss exceeds threshold

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | Bot status & health |
| GET | `/api/portfolio` | Portfolio & balance |
| GET | `/api/positions` | Open positions |
| POST | `/api/order` | Place new order |
| DELETE | `/api/order/:id` | Cancel order |
| GET | `/api/market/:symbol` | Market data |
| GET | `/api/risk` | Risk metrics |
| POST | `/api/settings` | Update settings |

---

## 🔧 Development

```bash
# Run in development mode with hot reload
npm run dev

# Run tests
npm test

# Run crypto tests
npm run test:crypto

# Lint code
npm run lint

# Auto-fix lint issues
npm run lint:fix
```

---

## 🚢 VPS Deployment

### Ubuntu/Debian VPS

```bash
# SSH into your VPS, then:

# 1. Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Clone and setup
git clone https://github.com/Gogreenraghav/universal-trading-bot.git
cd universal-trading-bot
npm install

# 3. Configure
cp .env.example .env
nano .env  # Add your API keys

# 4. Install PM2 for production process manager
npm install -g pm2
pm2 start src/index.js --name trading-bot

# 5. Auto-restart on reboot
pm2 startup
pm2 save

# 6. View logs
pm2 logs trading-bot

# 7. SSL with Nginx (optional)
# Install nginx + certbot, then proxy_pass to localhost:3020
```

### Docker

```bash
# Build
docker build -t universal-trading-bot .

# Run
docker run -d \
  --name trading-bot \
  -p 3020:3020 \
  -v $(pwd)/.env:/app/.env \
  universal-trading-bot

# Stop
docker stop trading-bot && docker rm trading-bot
```

---

## ⚠️ Disclaimer

**This bot is for educational and informational purposes only.**

- Paper/Demo trading is simulated — no real market orders
- Live trading involves **real financial risk**
- Always test thoroughly on testnet before live trading
- Never invest more than you can afford to lose
- The authors are not responsible for any financial losses

---

## 📄 License

MIT License — see [LICENSE](LICENSE) file.

---

## 🤝 Contributing

Pull requests welcome! Please read contributing guidelines first.

---

**Built with ❤️ for traders — by Arjun Singh & Team**
