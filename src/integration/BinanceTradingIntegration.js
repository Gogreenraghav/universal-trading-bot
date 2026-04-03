/**
 * Binance Trading Integration
 * Connects dashboard trading controls to actual Binance API
 */

const crypto = require('crypto');
const axios = require('axios');

class BinanceTradingIntegration {
  constructor(config) {
    this.config = {
      apiKey: config.apiKey || '',
      apiSecret: config.apiSecret || '',
      testnet: config.testnet || false,
      mode: config.mode || 'paper', // paper, live
      dashboard: config.dashboard,
      ...config
    };
    
    // API endpoints
    this.baseURL = this.config.testnet 
      ? 'https://testnet.binance.vision' 
      : 'https://api.binance.com';
    
    // HTTP client
    this.httpClient = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'X-MBX-APIKEY': this.config.apiKey
      }
    });
    
    // Trading state
    this.state = {
      initialized: false,
      connected: false,
      tradingEnabled: false,
      lastTrade: null,
      accountInfo: null,
      openOrders: [],
      positions: []
    };
    
    // Cache
    this.cache = {
      symbols: new Map(),
      prices: new Map(),
      balances: new Map(),
      lastUpdate: null
    };
    
    console.log('💱 Binance Trading Integration initialized');
  }
  
  /**
   * Initialize trading integration
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Binance Trading Integration...');
      
      // Test connection
      await this.testConnection();
      
      // Load account info
      await this.loadAccountInfo();
      
      // Load exchange info
      await this.loadExchangeInfo();
      
      // Start market data updates
      await this.startMarketDataUpdates();
      
      this.state.initialized = true;
      this.state.connected = true;
      this.state.tradingEnabled = this.config.mode === 'live';
      
      console.log('✅ Binance Trading Integration ready');
      console.log(`📊 Mode: ${this.config.mode}`);
      console.log(`🔗 Testnet: ${this.config.testnet}`);
      console.log(`💰 Trading: ${this.state.tradingEnabled ? 'Enabled' : 'Disabled (Paper)'}`);
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Failed to initialize trading integration:', error);
      throw error;
    }
  }
  
  /**
   * Test API connection
   */
  async testConnection() {
    try {
      const response = await this.httpClient.get('/api/v3/ping');
      if (response.status === 200) {
        console.log('✅ Binance API connection test passed');
        return true;
      }
      throw new Error(`Unexpected status: ${response.status}`);
    } catch (error) {
      throw new Error(`Binance connection test failed: ${error.message}`);
    }
  }
  
  /**
   * Load account information
   */
  async loadAccountInfo() {
    if (!this.config.apiKey || !this.config.apiSecret) {
      console.log('⚠️ No API keys provided, running in paper mode');
      this.state.accountInfo = this.getMockAccountInfo();
      return this.state.accountInfo;
    }
    
    try {
      const timestamp = Date.now();
      const queryString = `timestamp=${timestamp}`;
      const signature = this.generateSignature(queryString);
      
      const response = await this.httpClient.get('/api/v3/account', {
        params: {
          timestamp,
          signature
        }
      });
      
      this.state.accountInfo = response.data;
      
      // Process balances
      this.cache.balances.clear();
      response.data.balances.forEach(balance => {
        if (parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0) {
          this.cache.balances.set(balance.asset, {
            free: parseFloat(balance.free),
            locked: parseFloat(balance.locked),
            total: parseFloat(balance.free) + parseFloat(balance.locked)
          });
        }
      });
      
      console.log(`💰 Account loaded: ${this.cache.balances.size} assets with balance`);
      return this.state.accountInfo;
      
    } catch (error) {
      console.error('Failed to load account info:', error.message);
      // Fallback to mock data for paper trading
      this.state.accountInfo = this.getMockAccountInfo();
      return this.state.accountInfo;
    }
  }
  
  /**
   * Get mock account info for paper trading
   */
  getMockAccountInfo() {
    return {
      makerCommission: 10,
      takerCommission: 10,
      buyerCommission: 0,
      sellerCommission: 0,
      canTrade: true,
      canWithdraw: false,
      canDeposit: false,
      updateTime: Date.now(),
      accountType: 'SPOT',
      balances: [
        { asset: 'BTC', free: '0.05', locked: '0' },
        { asset: 'ETH', free: '1', locked: '0' },
        { asset: 'USDT', free: '5000', locked: '0' },
        { asset: 'BNB', free: '10', locked: '0' }
      ],
      permissions: ['SPOT']
    };
  }
  
  /**
   * Load exchange information
   */
  async loadExchangeInfo() {
    try {
      const response = await this.httpClient.get('/api/v3/exchangeInfo');
      
      // Cache symbol information
      this.cache.symbols.clear();
      response.data.symbols.forEach(symbol => {
        if (symbol.status === 'TRADING') {
          this.cache.symbols.set(symbol.symbol, {
            symbol: symbol.symbol,
            baseAsset: symbol.baseAsset,
            quoteAsset: symbol.quoteAsset,
            filters: symbol.filters.reduce((acc, filter) => {
              acc[filter.filterType] = filter;
              return acc;
            }, {}),
            orderTypes: symbol.orderTypes
          });
        }
      });
      
      console.log(`📊 Loaded ${this.cache.symbols.size} trading symbols`);
      return this.cache.symbols;
      
    } catch (error) {
      console.error('Failed to load exchange info:', error.message);
      return new Map();
    }
  }
  
  /**
   * Start market data updates
   */
  async startMarketDataUpdates() {
    // Update prices every 5 seconds
    setInterval(async () => {
      await this.updatePrices();
    }, 5000);
    
    // Update account info every 30 seconds
    setInterval(async () => {
      await this.loadAccountInfo();
    }, 30000);
    
    // Update open orders every 10 seconds
    setInterval(async () => {
      await this.updateOpenOrders();
    }, 10000);
    
    console.log('📈 Market data updates started');
  }
  
  /**
   * Update prices for watched symbols
   */
  async updatePrices() {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
    
    try {
      const response = await this.httpClient.get('/api/v3/ticker/price');
      const prices = response.data;
      
      prices.forEach(price => {
        if (symbols.includes(price.symbol)) {
          this.cache.prices.set(price.symbol, parseFloat(price.price));
        }
      });
      
      this.cache.lastUpdate = Date.now();
      
      // Update dashboard
      if (this.config.dashboard) {
        this.config.dashboard.updateMarketData({
          prices: Object.fromEntries(this.cache.prices),
          lastUpdate: this.cache.lastUpdate
        });
      }
      
    } catch (error) {
      console.error('Failed to update prices:', error.message);
    }
  }
  
  /**
   * Update open orders
   */
  async updateOpenOrders() {
    if (!this.config.apiKey || !this.config.apiSecret) {
      // Mock data for paper trading
      this.state.openOrders = this.getMockOpenOrders();
      return;
    }
    
    try {
      const timestamp = Date.now();
      const queryString = `timestamp=${timestamp}`;
      const signature = this.generateSignature(queryString);
      
      const response = await this.httpClient.get('/api/v3/openOrders', {
        params: {
          timestamp,
          signature
        }
      });
      
      this.state.openOrders = response.data;
      
      // Update dashboard
      if (this.config.dashboard) {
        this.config.dashboard.updateOpenOrders(this.state.openOrders);
      }
      
    } catch (error) {
      console.error('Failed to update open orders:', error.message);
    }
  }
  
  /**
   * Get mock open orders for paper trading
   */
  getMockOpenOrders() {
    return [
      {
        symbol: 'BTCUSDT',
        orderId: 123456,
        orderListId: -1,
        clientOrderId: 'mock_order_1',
        price: '62000',
        origQty: '0.01',
        executedQty: '0',
        cummulativeQuoteQty: '0',
        status: 'NEW',
        timeInForce: 'GTC',
        type: 'LIMIT',
        side: 'BUY',
        stopPrice: '0',
        icebergQty: '0',
        time: Date.now(),
        updateTime: Date.now(),
        isWorking: true,
        origQuoteOrderQty: '0'
      }
    ];
  }
  
  /**
   * Generate HMAC SHA256 signature
   */
  generateSignature(queryString) {
    return crypto
      .createHmac('sha256', this.config.apiSecret)
      .update(queryString)
      .digest('hex');
  }
  
  /**
   * Place a buy order
   */
  async placeBuyOrder(orderData) {
    const { symbol, quantity, price, orderType = 'MARKET' } = orderData;
    
    console.log(`🟢 Placing BUY order: ${symbol} ${quantity} @ ${price || 'market'}`);
    
    // Validate order
    const validation = await this.validateOrder(symbol, quantity, price, 'BUY', orderType);
    if (!validation.valid) {
      throw new Error(`Order validation failed: ${validation.error}`);
    }
    
    if (this.config.mode === 'paper' || !this.config.apiKey || !this.config.apiSecret) {
      // Paper trading - simulate order
      return this.simulateOrder(symbol, quantity, price, 'BUY', orderType);
    }
    
    // Real trading
    try {
      const timestamp = Date.now();
      let params = {
        symbol,
        side: 'BUY',
        type: orderType,
        quantity,
        timestamp
      };
      
      if (orderType === 'LIMIT') {
        params.price = price;
        params.timeInForce = 'GTC';
      }
      
      const queryString = Object.keys(params)
        .map(key => `${key}=${params[key]}`)
        .join('&');
      
      const signature = this.generateSignature(queryString);
      params.signature = signature;
      
      const response = await this.httpClient.post('/api/v3/order', null, { params });
      
      this.state.lastTrade = {
        ...response.data,
        timestamp: Date.now()
      };
      
      console.log(`✅ BUY order placed: ${response.data.orderId}`);
      
      // Update dashboard
      if (this.config.dashboard) {
        this.config.dashboard.updateTrade({
          type: 'buy',
          symbol,
          quantity,
          price: response.data.price || price,
          orderId: response.data.orderId,
          timestamp: Date.now()
        });
      }
      
      return {
        success: true,
        orderId: response.data.orderId,
        symbol,
        quantity,
        price: response.data.price || price,
        status: response.data.status,
        side: 'BUY'
      };
      
    } catch (error) {
      console.error('Failed to place buy order:', error.message);
      throw error;
    }
  }
  
  /**
   * Place a sell order
   */
  async placeSellOrder(orderData) {
    const { symbol, quantity, price, orderType = 'MARKET' } = orderData;
    
    console.log(`🔴 Placing SELL order: ${symbol} ${quantity} @ ${price || 'market'}`);
    
    // Validate order
    const validation = await this.validateOrder(symbol, quantity, price, 'SELL', orderType);
    if (!validation.valid) {
      throw new Error(`Order validation failed: ${validation.error}`);
    }
    
    if (this.config.mode === 'paper' || !this.config.apiKey || !this.config.apiSecret) {
      // Paper trading - simulate order
      return this.simulateOrder(symbol, quantity, price, 'SELL', orderType);
    }
    
    // Real trading
    try {
      const timestamp = Date.now();
      let params = {
        symbol,
        side: 'SELL',
        type: orderType,
        quantity,
        timestamp
      };
      
      if (orderType === 'LIMIT') {
        params.price = price;
        params.timeInForce = 'GTC';
      }
      
      const queryString = Object.keys(params)
        .map(key => `${key}=${params[key]}`)
        .join('&');
      
      const signature = this.generateSignature(queryString);
      params.signature = signature;
      
      const response = await this.httpClient.post('/api/v3/order', null, { params });
      
      this.state.lastTrade = {
        ...response.data,
        timestamp: Date.now()
      };
      
      console.log(`✅ SELL order placed: ${response.data.orderId}`);
      
      // Update dashboard
      if (this.config.dashboard) {
        this.config.dashboard.updateTrade({
          type: 'sell',
          symbol,
          quantity,
          price: response.data.price || price,
          orderId: response.data.orderId,
          timestamp: Date.now()
        });
      }
      
      return {
        success: true,
        orderId: response.data.orderId,
        symbol,
        quantity,
        price: response.data.price || price,
        status: response.data.status,
        side: 'SELL'
      };
      
    } catch (error) {
      console.error('Failed to place sell order:', error.message);
      throw error;
    }
  }
  
  /**
   * Validate order parameters
   */
  async validateOrder(symbol, quantity, price, side, orderType) {
    const symbolInfo = this.cache.symbols.get(symbol);
    if (!symbolInfo) {
      return { valid: false, error: `Symbol ${symbol} not found` };
    }
    
    // Check if trading is enabled
    if (!this.state.tradingEnabled && this.config.mode !== 'paper') {
      return { valid: false, error: 'Trading is disabled' };
    }
    
    // Check quantity
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      return { valid: false, error: 'Invalid quantity' };
    }
    
    // Check price for limit orders
    if (orderType === 'LIMIT') {
      const priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum <= 0) {
        return { valid: false, error: 'Invalid price for limit order' };
      }
    }
    
    // Check balance (for real trading)
    if (this.config.mode === 'live' && this.config.apiKey && this.config.apiSecret) {
      const baseAsset = symbolInfo.baseAsset;
      const quoteAsset = symbolInfo.quoteAsset;
      
      if (side === 'BUY') {
        // Check if we have enough quote asset (e.g., USDT)
        const balance = this.cache.balances.get(quoteAsset);
        if (!balance || balance.free < qty * (price || this.cache.prices.get(symbol) || 0)) {
          return { valid: false, error: `Insufficient ${quoteAsset} balance` };
        }
      } else if (side === 'SELL') {
        // Check if we have enough base asset (e.g., BTC)
        const balance = this.cache.balances.get(baseAsset);
        if (!balance || balance.free < qty) {
          return { valid: false, error: `Insufficient ${baseAsset} balance` };
        }
      }
    }
    
    return { valid: true };
  }
  
  /**
   * Simulate order for paper trading
   */
  async simulateOrder(symbol, quantity, price, side, orderType) {
    const orderId = `paper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const currentPrice = this.cache.prices.get(symbol) || (price ? parseFloat(price) : 65000);
    const executedPrice = orderType === 'MARKET' ? currentPrice : parseFloat(price);
    
    // Simulate order execution
    const order = {
      orderId,
      symbol,
      side,
      type: orderType,
      quantity: parseFloat(quantity),
      price: executedPrice,
      status: 'FILLED',
      executedQty: parseFloat(quantity),
      cummulativeQuoteQty: parseFloat(quantity) * executedPrice,
      time: Date.now(),
      updateTime: Date.now(),
      isWorking: false
    };
    
    console.log(`📝 Paper trade: ${side} ${quantity} ${symbol} @ ${executedPrice}`);
    
    // Update mock portfolio
    this.updatePaperPortfolio(symbol, side, parseFloat(quantity), executedPrice);
    
    // Update dashboard
    if (this.config.dashboard) {
      this.config.dashboard.updateTrade({
        type: side.toLowerCase(),
        symbol,
        quantity: parseFloat(quantity),
        price: executedPrice,
        orderId,
        timestamp: Date.now(),
        paper: true
      });
      
      // Update portfolio on dashboard
      this.config.dashboard.updatePortfolioData(this.getPaperPortfolio());
    }
    
    return {
      success: true,
      orderId,
      symbol,
      quantity: parseFloat(quantity),
      price: executedPrice,
      status: 'FILLED',
      side,
      paper: true
    };
  }
  
  /**
   * Update paper trading portfolio
   */
  updatePaperPortfolio(symbol, side, quantity, price) {
    const symbolInfo = this.cache.symbols.get(symbol);
    if (!symbolInfo) return;
    
    const baseAsset = symbolInfo.baseAsset;
    const quoteAsset = symbolInfo.quoteAsset;
    const totalValue = quantity * price;
    
    // Get or create paper portfolio
    if (!this.paperPortfolio) {
      this.paperPortfolio = {
        BTC: { free: 0.05, locked: 0, total: 0.05 },
        ETH: { free: 1, locked: 0, total: 1 },
        USDT: { free: 5000, locked: 0, total: 5000 },
        BNB: { free: 10, locked: 0, total: 10 }
      };
    }
    
    if (side === 'BUY') {
      // Buy: Reduce quote asset, increase base asset
      this.paperPortfolio[quoteAsset].free -= totalValue;
      this.paperPortfolio[quoteAsset].total -= totalValue;
      
      if (!this.paperPortfolio[baseAsset]) {
        this.paperPortfolio[baseAsset] = { free: 0, locked: 0, total: 0 };
      }
      this.paperPortfolio[baseAsset].free += quantity;
      this.paperPortfolio[baseAsset].total += quantity;
      
    } else if (side === 'SELL') {
      // Sell: Reduce base asset, increase quote asset
      this.paperPortfolio[baseAsset].free -= quantity;
      this.paperPortfolio[baseAsset].total -= quantity;
      
      this.paperPortfolio[quoteAsset].free += totalValue;
      this.paperPortfolio[quoteAsset].total += totalValue;
    }
    
    // Update cache
    this.cache.balances = new Map(Object.entries(this.paperPortfolio));
    
    console.log(`📊 Paper portfolio updated: ${side} ${quantity} ${symbol}`);
  }
  
  /**
   * Get paper portfolio for dashboard
   */
  getPaperPortfolio() {
    if (!this.paperPortfolio) {
      this.paperPortfolio = {
        BTC: { free: 0.05, locked: 0, total: 0.05 },
        ETH: { free: 1, locked: 0, total: 1 },
        USDT: { free: 5000, locked: 0, total: 5000 },
        BNB: { free: 10, locked: 0, total: 10 }
      };
    }
    
    // Calculate total portfolio value
    let totalValue = 0;
    const positions = [];
    
    Object.entries(this.paperPortfolio).forEach(([asset, balance]) => {
      if (balance.total > 0) {
        if (asset === 'USDT' || asset === 'BUSD' || asset === 'USDC') {
          totalValue += balance.total;
        } else {
          // Get current price for crypto assets
          const symbol = `${asset}USDT`;
          const price = this.cache.prices.get(symbol) || this.getMockPrice(asset);
          const value = balance.total * price;
          totalValue += value;
          
          if (asset !== 'USDT') {
            positions.push({
              symbol,
              asset,
              quantity: balance.total,
              currentPrice: price,
              value: value
            });
          }
        }
      }
    });
    
    return {
      totalValue,
      availableBalance: this.paperPortfolio.USDT?.free || 0,
      positions,
      lastUpdate: Date.now()
    };
  }
  
  /**
   * Get mock price for assets
   */
  getMockPrice(asset) {
    const mockPrices = {
      BTC: 65000,
      ETH: 3500,
      BNB: 600,
      SOL: 180,
      XRP: 0.5,
      ADA: 0.45,
      DOT: 7,
      DOGE: 0.15,
      MATIC: 0.8,
      LTC: 80
    };
    
    return mockPrices[asset] || 1;
  }
  
  /**
   * Cancel an order
   */
  async cancelOrder(symbol, orderId) {
    console.log(`❌ Cancelling order: ${symbol} #${orderId}`);
    
    if (this.config.mode === 'paper' || !this.config.apiKey || !this.config.apiSecret) {
      // Paper trading - simulate cancellation
      this.state.openOrders = this.state.openOrders.filter(order => order.orderId !== orderId);
      return { success: true, orderId, symbol, status: 'CANCELED' };
    }
    
    // Real trading
    try {
      const timestamp = Date.now();
      const params = {
        symbol,
        orderId,
        timestamp
      };
      
      const queryString = Object.keys(params)
        .map(key => `${key}=${params[key]}`)
        .join('&');
      
      const signature = this.generateSignature(queryString);
      params.signature = signature;
      
      const response = await this.httpClient.delete('/api/v3/order', { params });
      
      // Update open orders
      this.state.openOrders = this.state.openOrders.filter(order => order.orderId !== orderId);
      
      console.log(`✅ Order cancelled: ${orderId}`);
      
      return {
        success: true,
        orderId: response.data.orderId,
        symbol,
        status: response.data.status
      };
      
    } catch (error) {
      console.error('Failed to cancel order:', error.message);
      throw error;
    }
  }
  
  /**
   * Get order history
   */
  async getOrderHistory(symbol, limit = 50) {
    if (!this.config.apiKey || !this.config.apiSecret) {
      // Return mock history for paper trading
      return this.getMockOrderHistory(symbol, limit);
    }
    
    try {
      const timestamp = Date.now();
      const params = {
        symbol,
        limit,
        timestamp
      };
      
      const queryString = Object.keys(params)
        .map(key => `${key}=${params[key]}`)
        .join('&');
      
      const signature = this.generateSignature(queryString);
      params.signature = signature;
      
      const response = await this.httpClient.get('/api/v3/allOrders', { params });
      
      return response.data;
      
    } catch (error) {
      console.error('Failed to get order history:', error.message);
      return this.getMockOrderHistory(symbol, limit);
    }
  }
  
  /**
   * Get mock order history for paper trading
   */
  getMockOrderHistory(symbol, limit) {
    const history = [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    for (let i = 0; i < limit; i++) {
      const time = now - (i * dayMs / 2);
      const price = this.cache.prices.get(symbol) || 65000;
      const quantity = 0.001 + Math.random() * 0.01;
      const side = Math.random() > 0.5 ? 'BUY' : 'SELL';
      const status = 'FILLED';
      
      history.push({
        symbol,
        orderId: `mock_${time}_${i}`,
        clientOrderId: `mock_client_${i}`,
        price: price.toString(),
        origQty: quantity.toString(),
        executedQty: quantity.toString(),
        cummulativeQuoteQty: (quantity * price).toString(),
        status,
        timeInForce: 'GTC',
        type: 'MARKET',
        side,
        stopPrice: '0',
        icebergQty: '0',
        time,
        updateTime: time,
        isWorking: false,
        origQuoteOrderQty: '0'
      });
    }
    
    return history;
  }
  
  /**
   * Get trade history
   */
  async getTradeHistory(symbol, limit = 50) {
    if (!this.config.apiKey || !this.config.apiSecret) {
      // Return mock trades for paper trading
      return this.getMockTradeHistory(symbol, limit);
    }
    
    try {
      const timestamp = Date.now();
      const params = {
        symbol,
        limit,
        timestamp
      };
      
      const queryString = Object.keys(params)
        .map(key => `${key}=${params[key]}`)
        .join('&');
      
      const signature = this.generateSignature(queryString);
      params.signature = signature;
      
      const response = await this.httpClient.get('/api/v3/myTrades', { params });
      
      return response.data;
      
    } catch (error) {
      console.error('Failed to get trade history:', error.message);
      return this.getMockTradeHistory(symbol, limit);
    }
  }
  
  /**
   * Get mock trade history for paper trading
   */
  getMockTradeHistory(symbol, limit) {
    const trades = [];
    const now = Date.now();
    const hourMs = 60 * 60 * 1000;
    
    for (let i = 0; i < limit; i++) {
      const time = now - (i * hourMs);
      const price = (this.cache.prices.get(symbol) || 65000) * (0.99 + Math.random() * 0.02);
      const quantity = 0.001 + Math.random() * 0.01;
      const isBuyer = Math.random() > 0.5;
      
      trades.push({
        symbol,
        id: i,
        orderId: `mock_order_${i}`,
        price: price.toString(),
        qty: quantity.toString(),
        quoteQty: (quantity * price).toString(),
        commission: '0',
        commissionAsset: 'BNB',
        time,
        isBuyer,
        isMaker: false,
        isBestMatch: true
      });
    }
    
    return trades;
  }
  
  /**
   * Get current positions
   */
  async getPositions() {
    const portfolio = this.getPaperPortfolio();
    return portfolio.positions.map(pos => ({
      symbol: pos.symbol,
      asset: pos.asset,
      quantity: pos.quantity,
      currentPrice: pos.currentPrice,
      value: pos.value,
      entryPrice: pos.currentPrice * 0.95, // Mock entry price
      pnl: pos.value * 0.05, // Mock P&L
      pnlPercent: 5 // Mock 5% profit
    }));
  }
  
  /**
   * Close a position
   */
  async closePosition(symbol, quantity) {
    const currentPrice = this.cache.prices.get(symbol);
    if (!currentPrice) {
      throw new Error(`No price available for ${symbol}`);
    }
    
    return this.placeSellOrder({
      symbol,
      quantity,
      price: currentPrice,
      orderType: 'MARKET'
    });
  }
  
  /**
   * Get trading statistics
   */
  async getTradingStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Mock statistics for paper trading
    return {
      todayTrades: Math.floor(Math.random() * 10) + 1,
      todayVolume: Math.random() * 10000 + 1000,
      winRate: 60 + Math.random() * 10,
      avgWin: 200 + Math.random() * 100,
      avgLoss: 100 + Math.random() * 50,
      totalTrades: Math.floor(Math.random() * 100) + 50,
      totalVolume: Math.random() * 100000 + 50000,
      bestTrade: 500 + Math.random() * 500,
      worstTrade: -200 - Math.random() * 100
    };
  }
  
  /**
   * Update dashboard with latest data
   */
  async updateDashboard() {
    if (!this.config.dashboard) return;
    
    try {
      const portfolio = this.getPaperPortfolio();
      const positions = await this.getPositions();
      const stats = await this.getTradingStats();
      
      this.config.dashboard.updatePortfolioData({
        ...portfolio,
        positions,
        stats
      });
      
    } catch (error) {
      console.error('Failed to update dashboard:', error.message);
    }
  }
  
  /**
   * Stop trading integration
   */
  async stop() {
    console.log('🛑 Stopping Binance Trading Integration...');
    
    // Cancel all open orders
    if (this.state.openOrders.length > 0 && this.config.mode === 'live') {
      console.log('Cancelling open orders...');
      for (const order of this.state.openOrders) {
        try {
          await this.cancelOrder(order.symbol, order.orderId);
        } catch (error) {
          console.error(`Failed to cancel order ${order.orderId}:`, error.message);
        }
      }
    }
    
    this.state.connected = false;
    this.state.tradingEnabled = false;
    
    console.log('✅ Binance Trading Integration stopped');
  }
}

module.exports = BinanceTradingIntegration;