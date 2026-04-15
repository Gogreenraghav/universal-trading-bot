/**
 * Crypto Trading Bot — Full Multi-Module Crypto Trading System
 * Integrates: Binance Spot, Binance Futures, News Feed, Whale Alerts, On-Chain Data
 * 
 * Run: PLATFORM=crypto node src/crypto-bot.js
 */
const BinanceExchange = require('./platforms/crypto/exchanges/BinanceExchange');
const BinanceFutures = require('./platforms/crypto/exchanges/BinanceFutures');
const CryptoNewsFeed = require('./platforms/crypto/NewsFeed');
const WhaleAlert = require('./platforms/crypto/WhaleAlert');

class CryptoTradingBot {
  constructor(config = {}) {
    this.config = {
      mode: config.mode || process.env.TRADING_MODE || 'demo',
      symbols: config.symbols || ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT'],
      minTradeUSD: config.minTradeUSD || 10,
      maxPositions: config.maxPositions || 5,
      ...config,
    };

    this.exchange = null;
    this.futures = null;
    this.newsFeed = null;
    this.whaleAlert = null;
    this.positions = [];
    this.signals = [];
    this.running = false;
    this.stats = { trades: 0, wins: 0, losses: 0, pnl: 0 };

    console.log(`\n🚀 Crypto Trading Bot v1.0 — ${this.config.mode.toUpperCase()} MODE`);
    console.log(`   Symbols: ${this.config.symbols.join(', ')}`);
    console.log(`   Min trade: $${this.config.minTradeUSD}\n`);
  }

  async initialize() {
    // Initialize Spot Exchange
    this.exchange = new BinanceExchange({
      apiKey: process.env.BINANCE_API_KEY,
      apiSecret: process.env.BINANCE_SECRET_KEY,
      mode: this.config.mode,
      testnet: this.config.mode === 'testnet',
      wsStream: true,
    });
    const spotStatus = await this.exchange.initialize();

    // Initialize Futures
    if (this.config.mode !== 'paper') {
      this.futures = new BinanceFutures({
        apiKey: process.env.BINANCE_API_KEY,
        apiSecret: process.env.BINANCE_SECRET_KEY,
        mode: this.config.mode,
        futuresTestnet: true,
      });
    }

    // Initialize News Feed
    this.newsFeed = new CryptoNewsFeed({
      pollInterval: 60000,
      sentimentEnabled: true,
    });
    await this.newsFeed.initialize();

    // Initialize Whale Alert
    this.whaleAlert = new WhaleAlert({
      minTransactionUSD: 500000,
      pollInterval: 30000,
    });
    await this.whaleAlert.initialize();

    // Set up event listeners
    this._setupListeners();

    console.log(`\n✅ All modules initialized`);
    console.log(`   Spot: ${spotStatus.mode}`);
    this.exchange.on('priceUpdate', (data) => this._onPriceUpdate(data));

    return { spot: spotStatus };
  }

  _setupListeners() {
    // Whale alerts
    if (this.whaleAlert) {
      this.whaleAlert.on('whale', (alert) => {
        console.log(`\n🐋 ${alert.message}`);
        this._onWhaleAlert(alert);
      });
    }

    // News
    if (this.newsFeed) {
      this.newsFeed.on('breaking', (article) => {
        console.log(`\n📰 BREAKING: ${article.title}`);
        this._onBreakingNews(article);
      });
      this.newsFeed.on('fearGreed', (fg) => {
        console.log(`\n😱 Fear & Greed: ${fg.value} — ${fg.classification}`);
        this._onFearGreed(fg);
      });
    }
  }

  _onPriceUpdate(data) {
    // Check for trading opportunities
    this._checkSignals(data.symbol, data);
  }

  _onWhaleAlert(alert) {
    const signal = this.whaleAlert.getWhaleSignal(alert.symbol);
    if (signal && signal.confidence > 0.65) {
      console.log(`🐋 Whale signal: ${signal.action} ${signal.symbol} | Confidence: ${(signal.confidence * 100).toFixed(0)}%`);
    }
  }

  _onBreakingNews(article) {
    if (article.sentiment > 65) {
      console.log(`📈 Bullish news for ${article.symbols?.join(', ') || 'market'}`);
    } else if (article.sentiment < 35) {
      console.log(`📉 Bearish news for ${article.symbols?.join(', ') || 'market'}`);
    }
  }

  _onFearGreed(fg) {
    if (fg.value < 25) {
      console.log(`🟢 Extreme Fear — Potential buying opportunity`);
    } else if (fg.value > 75) {
      console.log(`🔴 Extreme Greed — Consider taking profits`);
    }
  }

  _checkSignals(symbol, priceData) {
    // Simple momentum signal
    const change = priceData.change24h || 0;
    if (change > 3 && !this._hasPosition(symbol)) {
      this._generateSignal(symbol, 'BUY', Math.min(change / 10, 0.9), 'momentum');
    } else if (change < -3 && this._hasPosition(symbol)) {
      this._generateSignal(symbol, 'SELL', Math.min(Math.abs(change) / 10, 0.9), 'momentum');
    }
  }

  _hasPosition(symbol) {
    return this.positions.some(p => p.symbol === symbol && p.status === 'OPEN');
  }

  _generateSignal(symbol, action, confidence, strategy) {
    const signal = { symbol, action, confidence, strategy, price: null, timestamp: Date.now() };

    // Enhance with news sentiment
    this.newsFeed?.filterByNews(symbol, signal).then(enhanced => {
      if (enhanced.confidence >= 0.6) {
        console.log(`\n📊 SIGNAL: ${action} ${symbol} @ ₹??? | Confidence: ${(enhanced.confidence * 100).toFixed(0)}% | Strategy: ${strategy}`);
        this.signals.push(enhanced);
      }
    });
  }

  async start() {
    this.running = true;
    console.log(`\n🚀 Crypto Bot started — watching ${this.config.symbols.join(', ')}`);
    console.log(`📡 Subscribing to live prices...`);

    // Subscribe to live prices
    for (const symbol of this.config.symbols) {
      const quote = await this.exchange.getQuote(symbol);
      console.log(`   ${symbol}: $${quote.price?.toFixed(4) || 'N/A'}`);
    }

    // Show whale stats
    if (this.whaleAlert) {
      const stats = this.whaleAlert.getStats();
      console.log(`\n🐋 Whale Activity (24h): ${stats.total} transactions | $${stats.volume24hFormatted}`);
    }

    // Show sentiment
    if (this.newsFeed) {
      const fg = this.newsFeed.getFearGreed();
      if (fg) console.log(`😱 Fear & Greed: ${fg.value}/100 — ${fg.classification}`);
    }
  }

  async status() {
    const prices = {};
    for (const sym of this.config.symbols) {
      const q = await this.exchange.getQuote(sym);
      prices[sym] = q?.price?.toFixed(4) || 'N/A';
    }

    const whale = this.whaleAlert?.getStats() || {};
    const fg = this.newsFeed?.getFearGreed() || {};
    const balances = await this.exchange.getBalance();

    console.log(`\n📊 CRYPTO BOT STATUS`);
    console.log(`   Mode: ${this.config.mode.toUpperCase()}`);
    console.log(`   Prices:`, prices);
    console.log(`   Positions: ${this.positions.length}`);
    console.log(`   Signals: ${this.signals.length}`);
    console.log(`   Trades: ${this.stats.trades} (W: ${this.stats.wins} / L: ${this.stats.losses})`);
    console.log(`   P&L: ₹${this.stats.pnl.toFixed(2)}`);
    console.log(`   Whale txs: ${whale.total || 0} | Volume: ${whale.volume24hFormatted || 'N/A'}`);
    console.log(`   Fear & Greed: ${fg.value || 'N/A'}`);
    console.log(`   Balance: USDT ${balances?.USDT?.available?.toFixed(2) || 'N/A'}`);

    return { prices, positions: this.positions, stats: this.stats, whale, fg, balances };
  }

  async destroy() {
    console.log(`\n🛑 Stopping Crypto Bot...`);
    await this.exchange?.destroy();
    this.newsFeed?.destroy();
    this.whaleAlert?.destroy();
    this.running = false;
    console.log(`✅ Crypto Bot stopped`);
  }
}

// ── CLI Interface ──────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'start';
  const bot = new CryptoTradingBot();

  await bot.initialize();

  switch (command) {
    case 'start':
    case 'run':
      await bot.start();
      break;
    case 'status':
      await bot.status();
      break;
    case 'signals':
      const signals = bot.newsFeed?.getNews(10);
      console.log(`\n📰 Latest Crypto News:`);
      signals?.forEach(s => console.log(`   [${s.sentiment > 60 ? '📈' : s.sentiment < 40 ? '📉' : '➡️'}] ${s.title?.slice(0, 80)}`));
      break;
    case 'whales':
      const txs = bot.whaleAlert?.getTransactions(null, 10);
      console.log(`\n🐋 Recent Whale Transactions:`);
      txs?.forEach(t => console.log(`   ${t.direction === 'inflow' ? '📥' : '📤'} $${(t.usd_value / 1e6).toFixed(1)}M ${t.symbol} — ${t.type}`));
      break;
    case 'sentiment':
      const sentiments = bot.newsFeed?.getAllSentiments();
      console.log(`\n😀 Coin Sentiments:`);
      Object.entries(sentiments || {}).forEach(([sym, s]) => {
        console.log(`   ${sym}: ${s.score}/100 | ${s.score > 60 ? '📈 Bullish' : s.score < 40 ? '📉 Bearish' : '➡️ Neutral'}`);
      });
      break;
    default:
      console.log(`Usage: node src/crypto-bot.js [start|status|signals|whales|sentiment]`);
  }

  await bot.destroy();
  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = CryptoTradingBot;
