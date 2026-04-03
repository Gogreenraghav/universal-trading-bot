/**
 * Dashboard Server
 * Web interface for Universal Trading Bot
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const UnifiedTradingIntegration = require('../../integration/UnifiedTradingIntegration');
const RiskDashboard = require('../../integration/RiskDashboard');
const SettingsManager = require('../../integration/SettingsManager');

class DashboardServer {
  constructor(config) {
    this.config = {
      port: config.port || 3000,
      host: config.host || '0.0.0.0',
      botEngine: config.botEngine,
      tradingConfig: config.tradingConfig || {
        apiKey: '',
        apiSecret: '',
        testnet: true,
        mode: 'paper'
      },
      ...config
    };
    
    // Unified trading integration (supports demo + live modes)
    this.tradingIntegration = new UnifiedTradingIntegration({
      defaultMode: 'demo', // Start in demo mode by default
      demoConfig: {
        initialBalance: 10000,
        defaultCurrency: 'USDT',
        dashboard: this
      },
      liveConfig: {
        ...this.config.tradingConfig,
        dashboard: this
      }
    });
    
    // Settings manager
    this.settingsManager = new SettingsManager({
      dashboard: this
    });
    
    // Risk dashboard (uses settings from settings manager)
    this.riskDashboard = new RiskDashboard({
      tradingIntegration: this.tradingIntegration,
      dashboard: this,
      riskLimits: this.settingsManager.settings.risk
    });
    
    // Express app
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });
    
    // WebSocket clients
    this.clients = new Set();
    
    // State
    this.state = {
      started: false,
      connections: 0,
      lastBroadcast: null,
      botStatus: 'offline'
    };
    
    // Setup middleware and routes
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    
    console.log('📊 Dashboard Server initialized');
  }
  
  /**
   * Setup middleware
   */
  setupMiddleware() {
    // Static files
    this.app.use(express.static(path.join(__dirname, 'public')));
    
    // JSON parsing
    this.app.use(express.json());
    
    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });
  }
  
  /**
   * Setup routes
   */
  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        dashboard: this.state.started,
        connections: this.state.connections,
        botStatus: this.state.botStatus,
        uptime: process.uptime()
      });
    });
    
    // Dashboard data
    this.app.get('/api/dashboard', (req, res) => {
      res.json(this.getDashboardData());
    });
    
    // Bot control
    this.app.post('/api/bot/start', (req, res) => {
      if (this.config.botEngine) {
        this.config.botEngine.start();
        this.state.botStatus = 'running';
        this.broadcast({ type: 'bot_status', status: 'running' });
        res.json({ success: true, message: 'Bot started' });
      } else {
        res.status(500).json({ error: 'Bot engine not available' });
      }
    });
    
    this.app.post('/api/bot/stop', (req, res) => {
      if (this.config.botEngine) {
        this.config.botEngine.stop();
        this.state.botStatus = 'stopped';
        this.broadcast({ type: 'bot_status', status: 'stopped' });
        res.json({ success: true, message: 'Bot stopped' });
      } else {
        res.status(500).json({ error: 'Bot engine not available' });
      }
    });
    
    // Trading control
    this.app.post('/api/trade/buy', async (req, res) => {
      try {
        const { symbol, quantity, price, orderType = 'MARKET' } = req.body;
        
        const result = await this.tradingIntegration.placeBuyOrder({
          symbol,
          quantity,
          price,
          orderType
        });
        
        res.json({
          success: true,
          message: `Buy order placed${result.paper ? ' (paper trading)' : ''}`,
          ...result
        });
        
      } catch (error) {
        console.error('Buy order failed:', error);
        res.status(400).json({
          success: false,
          error: error.message,
          message: 'Failed to place buy order'
        });
      }
    });
    
    this.app.post('/api/trade/sell', async (req, res) => {
      try {
        const { symbol, quantity, price, orderType = 'MARKET' } = req.body;
        
        const result = await this.tradingIntegration.placeSellOrder({
          symbol,
          quantity,
          price,
          orderType
        });
        
        res.json({
          success: true,
          message: `Sell order placed${result.paper ? ' (paper trading)' : ''}`,
          ...result
        });
        
      } catch (error) {
        console.error('Sell order failed:', error);
        res.status(400).json({
          success: false,
          error: error.message,
          message: 'Failed to place sell order'
        });
      }
    });
    
    // Order management
    this.app.delete('/api/trade/order/:orderId', async (req, res) => {
      try {
        const { orderId } = req.params;
        const { symbol } = req.body;
        
        const result = await this.tradingIntegration.cancelOrder(symbol, orderId);
        
        res.json({
          success: true,
          message: 'Order cancelled',
          ...result
        });
        
      } catch (error) {
        console.error('Cancel order failed:', error);
        res.status(400).json({
          success: false,
          error: error.message,
          message: 'Failed to cancel order'
        });
      }
    });
    
    // Portfolio data
    this.app.get('/api/portfolio', async (req, res) => {
      try {
        const portfolio = this.tradingIntegration.getPaperPortfolio();
        const positions = await this.tradingIntegration.getPositions();
        const stats = await this.tradingIntegration.getTradingStats();
        
        res.json({
          success: true,
          portfolio: {
            ...portfolio,
            positions,
            stats
          }
        });
        
      } catch (error) {
        console.error('Failed to get portfolio:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          message: 'Failed to get portfolio data'
        });
      }
    });
    
    // Order history
    this.app.get('/api/trade/history', async (req, res) => {
      try {
        const { symbol = 'BTCUSDT', limit = 50 } = req.query;
        
        const orders = await this.tradingIntegration.getOrderHistory(symbol, parseInt(limit));
        const trades = await this.tradingIntegration.getTradeHistory(symbol, parseInt(limit));
        
        res.json({
          success: true,
          orders,
          trades
        });
        
      } catch (error) {
        console.error('Failed to get trade history:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          message: 'Failed to get trade history'
        });
      }
    });
    
    // Serve main page
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
    
    // Demo mode endpoints
    this.app.get('/api/demo/info', async (req, res) => {
      try {
        const modeInfo = this.tradingIntegration.getModeInfo();
        
        res.json({
          success: true,
          modeInfo,
          message: 'Demo mode information retrieved'
        });
      } catch (error) {
        console.error('Failed to get demo info:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          message: 'Failed to get demo mode information'
        });
      }
    });
    
    this.app.post('/api/demo/switch', async (req, res) => {
      try {
        const { mode } = req.body;
        
        if (!mode || !['demo', 'live'].includes(mode)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid mode. Use "demo" or "live"'
          });
        }
        
        const result = await this.tradingIntegration.switchMode(mode);
        
        res.json(result);
      } catch (error) {
        console.error('Failed to switch mode:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          message: 'Failed to switch trading mode'
        });
      }
    });
    
    this.app.post('/api/demo/reset', async (req, res) => {
      try {
        const result = await this.tradingIntegration.resetDemoAccount();
        
        res.json(result);
      } catch (error) {
        console.error('Failed to reset demo account:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          message: 'Failed to reset demo account'
        });
      }
    });
    
    this.app.get('/api/demo/performance', async (req, res) => {
      try {
        const performance = await this.tradingIntegration.getPerformance();
        
        res.json(performance);
      } catch (error) {
        console.error('Failed to get demo performance:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          message: 'Failed to get demo performance'
        });
      }
    });
  }
  
  /**
   * Setup WebSocket
   */
  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      console.log('🔌 New WebSocket connection');
      this.clients.add(ws);
      this.state.connections = this.clients.size;
      
      // Send initial data
      ws.send(JSON.stringify({
        type: 'init',
        data: this.getDashboardData(),
        timestamp: Date.now()
      }));
      
      // Handle messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleWebSocketMessage(ws, data);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      });
      
      // Handle disconnect
      ws.on('close', () => {
        console.log('🔌 WebSocket disconnected');
        this.clients.delete(ws);
        this.state.connections = this.clients.size;
      });
      
      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }
  
  /**
   * Handle WebSocket messages
   */
  handleWebSocketMessage(ws, data) {
    switch (data.type) {
      case 'subscribe':
        // Subscribe to specific data streams
        if (data.channels) {
          ws.subscriptions = data.channels;
        }
        break;
        
      case 'unsubscribe':
        // Unsubscribe from channels
        ws.subscriptions = [];
        break;
        
      case 'ping':
        // Respond to ping
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
        
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  }
  
  /**
   * Get dashboard data
   */
  getDashboardData() {
    // Get portfolio data from trading integration
    let portfolioData = {
      totalValue: 10000,
      availableBalance: 5000,
      invested: 5000,
      pnl: 250,
      pnlPercent: 5,
      positions: [
        { symbol: 'BTCUSDT', quantity: 0.05, entry: 60000, current: 65000, pnl: 250 },
        { symbol: 'ETHUSDT', quantity: 1, entry: 3400, current: 3500, pnl: 100 }
      ]
    };
    
    // Try to get real portfolio data
    try {
      const paperPortfolio = this.tradingIntegration.getPaperPortfolio();
      if (paperPortfolio) {
        portfolioData = {
          totalValue: paperPortfolio.totalValue,
          availableBalance: paperPortfolio.availableBalance,
          invested: paperPortfolio.totalValue - paperPortfolio.availableBalance,
          pnl: 250, // Will be calculated from positions
          pnlPercent: 5,
          positions: paperPortfolio.positions || []
        };
      }
    } catch (error) {
      console.error('Failed to get portfolio data:', error.message);
    }
    
    return {
      bot: {
        status: this.state.botStatus,
        platform: 'crypto',
        exchange: 'binance',
        mode: this.config.tradingConfig.mode || 'paper',
        version: '1.0.0'
      },
      
      market: {
        btcPrice: 65000,
        ethPrice: 3500,
        totalMarketCap: '2.5T',
        btcDominance: '52%',
        fearGreedIndex: 65
      },
      
      portfolio: portfolioData,
      
      trading: {
        todayTrades: 5,
        todayVolume: 5000,
        winRate: 60,
        avgWin: 200,
        avgLoss: 100
      },
      
      risk: {
        dailyLossLimit: 1000,
        dailyLossUsed: 250,
        maxPositionSize: 2000,
        currentExposure: portfolioData.invested,
        riskScore: 35
      },
      
      news: {
        latest: [
          { title: 'Bitcoin ETF inflows continue', sentiment: 0.8, impact: 'high' },
          { title: 'Fed interest rate decision pending', sentiment: -0.3, impact: 'medium' }
        ],
        overallSentiment: 0.65
      },
      
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        lastUpdate: this.state.lastBroadcast,
        connections: this.state.connections
      }
    };
  }
  
  /**
   * Broadcast data to all clients
   */
  broadcast(data) {
    const message = JSON.stringify({
      ...data,
      timestamp: Date.now()
    });
    
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
    
    this.state.lastBroadcast = Date.now();
  }
  
  /**
   * Update market data
   */
  updateMarketData(data) {
    this.broadcast({
      type: 'market_update',
      data
    });
  }
  
  /**
   * Update portfolio data
   */
  updatePortfolioData(data) {
    this.broadcast({
      type: 'portfolio_update',
      data
    });
  }
  
  /**
   * Update trade data
   */
  updateTrade(data) {
    this.broadcast({
      type: 'trade_update',
      data
    });
  }
  
  /**
   * Update open orders
   */
  updateOpenOrders(orders) {
    this.broadcast({
      type: 'open_orders_update',
      data: { orders }
    });
  }
  
  /**
   * Update market data
   */
  updateMarketData(data) {
    this.broadcast({
      type: 'market_update',
      data
    });
  }
  
  /**
   * Update trade data
   */
  updateTradeData(data) {
    this.broadcast({
      type: 'trade_update',
      data
    });
  }
  
  /**
   * Update news data
   */
  updateNewsData(data) {
    this.broadcast({
      type: 'news_update',
      data
    });
  }
  
  /**
   * Start server
   */
  async start() {
    return new Promise((resolve, reject) => {
      this.server.listen(this.config.port, this.config.host, async () => {
        this.state.started = true;
        console.log(`✅ Dashboard server running at http://${this.config.host}:${this.config.port}`);
        
        // Initialize trading integration
        try {
          await this.tradingIntegration.initialize();
          this.state.botStatus = 'ready';
          console.log('✅ Trading integration initialized');
        } catch (error) {
          console.warn('⚠️ Trading integration failed, running in paper mode:', error.message);
          this.state.botStatus = 'paper_mode';
        }
        
        // Initialize settings manager
        try {
          await this.settingsManager.initialize();
          console.log('✅ Settings manager initialized');
        } catch (error) {
          console.warn('⚠️ Settings manager failed:', error.message);
        }
        
        // Initialize risk dashboard (with updated settings)
        try {
          this.riskDashboard.config.riskLimits = this.settingsManager.settings.risk;
          await this.riskDashboard.initialize();
          console.log('✅ Risk dashboard initialized');
        } catch (error) {
          console.warn('⚠️ Risk dashboard failed:', error.message);
        }
        
        resolve();
      });
      
      this.server.on('error', (error) => {
        console.error('Failed to start dashboard server:', error);
        reject(error);
      });
    });
  }
  
  /**
   * Stop server
   */
  stop() {
    return new Promise((resolve) => {
      // Close WebSocket connections
      this.clients.forEach(client => {
        client.close();
      });
      this.clients.clear();
      
      // Close server
      this.server.close(() => {
        this.state.started = false;
        console.log('Dashboard server stopped');
        resolve();
      });
    });
  }
}

module.exports = DashboardServer;