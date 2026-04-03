/**
 * Dashboard Server
 * Web interface for Universal Trading Bot
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

class DashboardServer {
  constructor(config) {
    this.config = {
      port: config.port || 3000,
      host: config.host || '0.0.0.0',
      botEngine: config.botEngine,
      ...config
    };
    
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
    this.app.post('/api/trade/buy', (req, res) => {
      const { symbol, quantity, price } = req.body;
      // In production, this would call the trading engine
      res.json({ 
        success: true, 
        message: 'Buy order placed (simulated)',
        orderId: `order_${Date.now()}`,
        symbol,
        quantity,
        price
      });
    });
    
    this.app.post('/api/trade/sell', (req, res) => {
      const { symbol, quantity, price } = req.body;
      // In production, this would call the trading engine
      res.json({ 
        success: true, 
        message: 'Sell order placed (simulated)',
        orderId: `order_${Date.now()}`,
        symbol,
        quantity,
        price
      });
    });
    
    // Serve main page
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
    return {
      bot: {
        status: this.state.botStatus,
        platform: 'crypto',
        exchange: 'binance',
        mode: 'paper',
        version: '1.0.0'
      },
      
      market: {
        btcPrice: 65000, // Example data
        ethPrice: 3500,
        totalMarketCap: '2.5T',
        btcDominance: '52%',
        fearGreedIndex: 65
      },
      
      portfolio: {
        totalValue: 10000,
        availableBalance: 5000,
        invested: 5000,
        pnl: 250,
        pnlPercent: 5,
        positions: [
          { symbol: 'BTCUSDT', quantity: 0.05, entry: 60000, current: 65000, pnl: 250 },
          { symbol: 'ETHUSDT', quantity: 1, entry: 3400, current: 3500, pnl: 100 }
        ]
      },
      
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
        currentExposure: 5000,
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
  start() {
    return new Promise((resolve, reject) => {
      this.server.listen(this.config.port, this.config.host, () => {
        this.state.started = true;
        console.log(`✅ Dashboard server running at http://${this.config.host}:${this.config.port}`);
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