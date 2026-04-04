/**
 * Universal Trading Bot - Main Entry Point
 * Platform-aware intelligent trading bot for Crypto, Forex, and Stocks
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');

// ============================================
// VALIDATE REQUIRED CONFIGURATION
// ============================================
const requiredEnvVars = ['BINANCE_API_KEY', 'BINANCE_SECRET_KEY'];
const missingVars = requiredEnvVars.filter(v => !process.env[v] || process.env[v].includes('YOUR_'));

if (missingVars.length > 0) {
    console.warn('⚠️  Warning: Missing or placeholder environment variables:', missingVars);
    console.warn('    Please update your .env file with real API keys.');
    console.warn('    The bot will start in DEMO/PAPER mode without live keys.\n');
}

// ============================================
// PLATFORM SELECTION
// ============================================
const PLATFORM = (process.env.PLATFORM || 'crypto').toLowerCase();
const TRADING_MODE = (process.env.TRADING_MODE || 'testnet').toLowerCase();
const PORT = parseInt(process.env.PORT || '3020', 10);
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// ============================================
// LOGGER SETUP (Simple Built-in Logger)
// ============================================
const LOG_COLORS = {
    error: '\x1b[31m',
    warn: '\x1b[33m',
    info: '\x1b[36m',
    success: '\x1b[32m',
    debug: '\x1b[90m',
    reset: '\x1b[0m'
};

const log = (level, ...args) => {
    if (LOG_LEVEL === 'debug' || level !== 'debug') {
        const color = LOG_COLORS[level] || LOG_COLORS.info;
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        console.log(`${LOG_COLORS.debug}[${timestamp}]${LOG_COLORS.reset} ${color}[${level.toUpperCase()}]${LOG_COLORS.reset}`, ...args);
    }
};

// ============================================
// BOT STATE
// ============================================
const botState = {
    platform: PLATFORM,
    mode: TRADING_MODE,
    startedAt: Date.now(),
    isRunning: false,
    positions: [],
    balance: parseFloat(process.env.INITIAL_CAPITAL || '1000'),
    initialCapital: parseFloat(process.env.INITIAL_CAPITAL || '1000'),
    stats: {
        trades: 0,
        wins: 0,
        losses: 0,
        pnl: 0
    },
    settings: {
        maxRiskPerTrade: parseFloat(process.env.MAX_RISK_PER_TRADE || '2'),
        tradingPairs: (process.env.TRADING_PAIRS || 'BTC/USDT,ETH/USDT,BNB/USDT').split(','),
        autoTrade: process.env.AUTO_TRADE === 'true',
        logLevel: LOG_LEVEL
    }
};

// ============================================
// PLATFORM ADAPTERS
// ============================================
let PlatformAdapter;
let ExchangeAdapter;

try {
    switch (PLATFORM) {
        case 'crypto':
            PlatformAdapter = require('./src/platforms/crypto/CryptoPlatformAdapter');
            ExchangeAdapter = require('./src/platforms/crypto/exchanges/BinanceExchange');
            break;
        case 'forex':
            PlatformAdapter = require('./src/platforms/forex/ForexPlatformAdapter');
            ExchangeAdapter = require('./src/platforms/forex/exchanges/OandaExchange');
            break;
        case 'stocks':
            PlatformAdapter = require('./src/platforms/stocks/StocksPlatformAdapter');
            ExchangeAdapter = require('./src/platforms/stocks/exchanges/ZerodhaExchange');
            break;
        default:
            console.warn(`⚠️  Unknown platform "${PLATFORM}", defaulting to crypto`);
            PlatformAdapter = require('./src/platforms/crypto/CryptoPlatformAdapter');
            ExchangeAdapter = require('./src/platforms/crypto/exchanges/BinanceExchange');
    }
} catch (err) {
    log('warn', `Platform adapter not found for "${PLATFORM}", using crypto as fallback`);
    try {
        PlatformAdapter = require('./src/platforms/crypto/CryptoPlatformAdapter');
        ExchangeAdapter = require('./src/platforms/crypto/exchanges/BinanceExchange');
    } catch (e) {
        console.error('❌ Failed to load platform adapter:', e.message);
        process.exit(1);
    }
}

// ============================================
// CORE MODULES
// ============================================
let tradingEngine;
let settingsManager;
let dashboard;

async function initializeBot() {
    log('info', '═'.repeat(55));
    log('info', '🚀 Universal Trading Bot — Starting Up...');
    log('info', '═'.repeat(55));
    log('info', `📦 Platform:   ${PLATFORM.toUpperCase()}`);
    log('info', `⚙️  Mode:      ${TRADING_MODE.toUpperCase()}`);
    log('info', `💰 Capital:   $${botState.balance}`);
    log('info', `📊 Risk:      ${botState.settings.maxRiskPerTrade}% per trade`);
    log('info', `🔗 Pairs:     ${botState.settings.tradingPairs.join(', ')}`);
    log('info', `🤖 AutoTrade: ${botState.settings.autoTrade ? 'ON' : 'OFF'}`);
    log('info', '');

    try {
        // Initialize Settings Manager
        log('info', '⚙️  Loading Settings Manager...');
        const SettingsManager = require('./src/integration/SettingsManager');
        settingsManager = new SettingsManager({
            configPath: path.join(__dirname, 'config'),
            dashboard: null
        });
        await settingsManager.initialize();
        log('success', '✅ Settings Manager loaded');

        // Initialize Trading Engine
        log('info', '⚙️  Loading Trading Engine...');
        const IntelligentTradingEngine = require('./src/core/IntelligentTradingEngine');
        tradingEngine = new IntelligentTradingEngine({
            platform: PLATFORM,
            mode: TRADING_MODE,
            settings: botState.settings,
            settingsManager: settingsManager,
            exchangeAdapter: null // will be set below
        });
        await tradingEngine.initialize();
        log('success', '✅ Trading Engine loaded');

        // Initialize Exchange Adapter
        log('info', `⚙️  Loading ${PLATFORM} exchange adapter...`);
        try {
            const exchange = new ExchangeAdapter({
                apiKey: process.env.BINANCE_API_KEY,
                apiSecret: process.env.BINANCE_SECRET_KEY,
                mode: TRADING_MODE
            });
            await exchange.initialize();
            tradingEngine.exchangeAdapter = exchange;
            log('success', `✅ ${PLATFORM.toUpperCase()} Exchange connected`);
        } catch (exchangeErr) {
            log('warn', `Exchange connection failed: ${exchangeErr.message}`);
            log('info', '   Bot will run in DEMO/PAPER mode');
            botState.mode = 'demo';
        }

        // Initialize Dashboard Server
        log('info', '⚙️  Loading Dashboard Server...');
        const Dashboard = require('./src/ui/dashboard/server');
        dashboard = new Dashboard({
            port: PORT,
            tradingEngine: tradingEngine,
            settingsManager: settingsManager,
            botState: botState
        });
        await dashboard.start();
        log('success', `✅ Dashboard running at http://localhost:${PORT}`);

        // Initialize Demo Trading Engine if no real exchange
        if (botState.mode === 'demo' || botState.mode === 'paper') {
            log('info', '📝 Running in DEMO/PAPER mode');
            try {
                const DemoEngine = require('./src/integration/DemoTradingEngine');
                const demoEngine = new DemoEngine({
                    initialBalance: botState.balance,
                    tradingPairs: botState.settings.tradingPairs
                });
                tradingEngine.demoEngine = demoEngine;
                log('success', '✅ Demo Trading Engine loaded');
            } catch (e) {
                log('warn', 'Demo engine not available, using simulated mode');
            }
        }

        botState.isRunning = true;
        log('success', '═'.repeat(55));
        log('success', '🎉 Universal Trading Bot is LIVE!');
        log('success', '═'.repeat(55));
        log('info', '');
        log('info', '📌 Quick Commands:');
        log('info', '   View Dashboard:  http://localhost:' + PORT);
        log('info', '   API Docs:        http://localhost:' + PORT + '/api');
        log('info', '   Health:          http://localhost:' + PORT + '/health');
        log('info', '');
        log('info', 'Press Ctrl+C to stop the bot.');
        log('info', '');

        // Start background tasks
        startBackgroundTasks();

    } catch (err) {
        console.error('❌ Bot initialization failed:', err);
        process.exit(1);
    }
}

// ============================================
// BACKGROUND TASKS
// ============================================
function startBackgroundTasks() {
    // Market data refresh every 30 seconds
    setInterval(async () => {
        if (!botState.isRunning) return;
        try {
            if (tradingEngine && tradingEngine.exchangeAdapter) {
                await tradingEngine.fetchMarketData();
            }
        } catch (err) {
            log('debug', 'Market data refresh error:', err.message);
        }
    }, 30000);

    // Trading engine tick every 60 seconds
    setInterval(async () => {
        if (!botState.isRunning || !botState.settings.autoTrade) return;
        try {
            if (tradingEngine) {
                await tradingEngine.executeTick();
            }
        } catch (err) {
            log('debug', 'Trading tick error:', err.message);
        }
    }, 60000);

    // Portfolio stats update every 15 seconds
    setInterval(() => {
        if (!botState.isRunning) return;
        updatePortfolioStats();
    }, 15000);

    log('info', '⏰ Background tasks started');
}

function updatePortfolioStats() {
    const currentCapital = botState.balance;
    const pnl = currentCapital - botState.initialCapital;
    const pnlPercent = ((pnl / botState.initialCapital) * 100).toFixed(2);
    botState.stats.pnl = pnl;

    if (tradingEngine && tradingEngine.positions) {
        botState.positions = tradingEngine.positions;
    }
}

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
async function shutdown(signal) {
    log('warn', `🛑 Received ${signal} — shutting down gracefully...`);
    botState.isRunning = false;

    try {
        if (tradingEngine) {
            await tradingEngine.shutdown();
        }
        if (settingsManager) {
            await settingsManager.stop();
        }
        if (dashboard) {
            dashboard.stop();
        }

        const uptime = Math.floor((Date.now() - botState.startedAt) / 1000);
        log('info', '');
        log('info', '📊 Session Summary:');
        log('info', `   Uptime:    ${Math.floor(uptime / 60)}m ${uptime % 60}s`);
        log('info', `   Trades:    ${botState.stats.trades}`);
        log('info', `   Wins:      ${botState.stats.wins}`);
        log('info', `   Losses:    ${botState.stats.losses}`);
        log('info', `   P&L:       $${botState.stats.pnl.toFixed(2)} (${((botState.stats.pnl / botState.initialCapital) * 100).toFixed(2)}%)`);
        log('info', '');
        log('success', '✅ Shutdown complete. Goodbye!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during shutdown:', err);
        process.exit(1);
    }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ============================================
// START THE BOT
// ============================================
initializeBot().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});

// Export for testing
module.exports = { botState, tradingEngine, settingsManager };
