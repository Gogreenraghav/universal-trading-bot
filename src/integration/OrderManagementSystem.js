/**
 * Order Management System
 * Complete order tracking, history, and performance analytics
 */

class OrderManagementSystem {
  constructor(config) {
    this.config = {
      tradingIntegration: config.tradingIntegration,
      dashboard: config.dashboard,
      maxHistoryDays: config.maxHistoryDays || 90,
      performanceMetrics: config.performanceMetrics || true,
      ...config
    };
    
    // Order storage
    this.orders = {
      open: new Map(),      // orderId -> order
      closed: new Map(),    // orderId -> order
      cancelled: new Map(), // orderId -> order
      history: []           // chronological history
    };
    
    // Performance metrics
    this.metrics = {
      daily: {
        trades: 0,
        volume: 0,
        pnl: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0
      },
      weekly: {
        trades: 0,
        volume: 0,
        pnl: 0,
        winRate: 0
      },
      monthly: {
        trades: 0,
        volume: 0,
        pnl: 0,
        winRate: 0
      },
      allTime: {
        trades: 0,
        volume: 0,
        pnl: 0,
        winRate: 0,
        bestTrade: 0,
        worstTrade: 0,
        maxDrawdown: 0,
        sharpeRatio: 0
      }
    };
    
    // State
    this.state = {
      initialized: false,
      lastUpdate: null,
      stats: {
        totalOrders: 0,
        openOrders: 0,
        closedOrders: 0,
        cancelledOrders: 0
      }
    };
    
    console.log('📊 Order Management System initialized');
  }
  
  /**
   * Initialize order management system
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Order Management System...');
      
      // Load existing orders from trading integration
      await this.loadExistingOrders();
      
      // Calculate initial metrics
      await this.calculateMetrics();
      
      // Start periodic updates
      this.startPeriodicUpdates();
      
      this.state.initialized = true;
      this.state.lastUpdate = Date.now();
      
      console.log('✅ Order Management System ready');
      console.log(`📈 Orders loaded: ${this.state.stats.totalOrders}`);
      console.log(`📊 Open orders: ${this.state.stats.openOrders}`);
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Failed to initialize order management:', error);
      throw error;
    }
  }
  
  /**
   * Load existing orders from trading integration
   */
  async loadExistingOrders() {
    if (!this.config.tradingIntegration) {
      console.log('⚠️ No trading integration, starting with empty order history');
      return;
    }
    
    try {
      // Load open orders
      const openOrders = this.config.tradingIntegration.state.openOrders || [];
      openOrders.forEach(order => {
        this.orders.open.set(order.orderId, this.normalizeOrder(order));
      });
      
      // Load order history
      const history = await this.config.tradingIntegration.getOrderHistory('BTCUSDT', 100);
      history.forEach(order => {
        if (order.status === 'FILLED' || order.status === 'PARTIALLY_FILLED') {
          this.orders.closed.set(order.orderId, this.normalizeOrder(order));
          this.orders.history.push(this.normalizeOrder(order));
        } else if (order.status === 'CANCELED' || order.status === 'EXPIRED') {
          this.orders.cancelled.set(order.orderId, this.normalizeOrder(order));
          this.orders.history.push(this.normalizeOrder(order));
        }
      });
      
      // Update statistics
      this.updateStatistics();
      
      console.log(`📥 Loaded ${openOrders.length} open orders`);
      console.log(`📥 Loaded ${this.orders.closed.size} closed orders`);
      console.log(`📥 Loaded ${this.orders.cancelled.size} cancelled orders`);
      
    } catch (error) {
      console.error('Failed to load existing orders:', error.message);
      // Start with mock data
      this.loadMockOrders();
    }
  }
  
  /**
   * Load mock orders for testing
   */
  loadMockOrders() {
    console.log('📝 Loading mock orders for testing...');
    
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    // Mock open orders
    const mockOpenOrders = [
      {
        orderId: 'mock_open_1',
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 0.01,
        price: 62000,
        status: 'NEW',
        time: now - 3600000, // 1 hour ago
        updateTime: now - 3600000
      },
      {
        orderId: 'mock_open_2',
        symbol: 'ETHUSDT',
        side: 'SELL',
        type: 'LIMIT',
        quantity: 0.5,
        price: 3600,
        status: 'NEW',
        time: now - 7200000, // 2 hours ago
        updateTime: now - 7200000
      }
    ];
    
    mockOpenOrders.forEach(order => {
      this.orders.open.set(order.orderId, this.normalizeOrder(order));
    });
    
    // Mock closed orders (last 7 days)
    for (let i = 0; i < 20; i++) {
      const time = now - (i * dayMs / 2);
      const isBuy = Math.random() > 0.5;
      const symbol = isBuy ? 'BTCUSDT' : 'ETHUSDT';
      const price = isBuy ? 60000 + Math.random() * 5000 : 3000 + Math.random() * 1000;
      const quantity = 0.001 + Math.random() * 0.01;
      const pnl = (Math.random() - 0.3) * 1000; // -300 to +700
      
      const order = {
        orderId: `mock_closed_${i}`,
        symbol,
        side: isBuy ? 'BUY' : 'SELL',
        type: 'MARKET',
        quantity,
        price,
        executedPrice: price * (1 + (Math.random() - 0.5) * 0.01), // ±0.5%
        status: 'FILLED',
        time,
        updateTime: time + 1000,
        pnl,
        pnlPercent: (pnl / (quantity * price)) * 100
      };
      
      this.orders.closed.set(order.orderId, this.normalizeOrder(order));
      this.orders.history.push(this.normalizeOrder(order));
    }
    
    // Update statistics
    this.updateStatistics();
    
    console.log('✅ Mock orders loaded for testing');
  }
  
  /**
   * Normalize order data structure
   */
  normalizeOrder(order) {
    return {
      orderId: order.orderId || `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: order.symbol || 'BTCUSDT',
      side: order.side || 'BUY',
      type: order.type || 'MARKET',
      quantity: parseFloat(order.quantity) || 0,
      price: parseFloat(order.price) || 0,
      executedPrice: parseFloat(order.executedPrice) || parseFloat(order.price) || 0,
      status: order.status || 'NEW',
      time: order.time || Date.now(),
      updateTime: order.updateTime || Date.now(),
      pnl: parseFloat(order.pnl) || 0,
      pnlPercent: parseFloat(order.pnlPercent) || 0,
      commission: parseFloat(order.commission) || 0,
      commissionAsset: order.commissionAsset || 'BNB',
      clientOrderId: order.clientOrderId,
      origQty: parseFloat(order.origQty) || parseFloat(order.quantity) || 0,
      executedQty: parseFloat(order.executedQty) || parseFloat(order.quantity) || 0,
      cummulativeQuoteQty: parseFloat(order.cummulativeQuoteQty) || (parseFloat(order.quantity) * parseFloat(order.price)) || 0,
      timeInForce: order.timeInForce || 'GTC',
      icebergQty: parseFloat(order.icebergQty) || 0,
      isWorking: order.isWorking !== undefined ? order.isWorking : true,
      origQuoteOrderQty: parseFloat(order.origQuoteOrderQty) || 0,
      paper: order.paper || false,
      raw: order
    };
  }
  
  /**
   * Update order statistics
   */
  updateStatistics() {
    this.state.stats.totalOrders = 
      this.orders.open.size + 
      this.orders.closed.size + 
      this.orders.cancelled.size;
    
    this.state.stats.openOrders = this.orders.open.size;
    this.state.stats.closedOrders = this.orders.closed.size;
    this.state.stats.cancelledOrders = this.orders.cancelled.size;
    
    this.state.lastUpdate = Date.now();
  }
  
  /**
   * Add a new order
   */
  addOrder(order) {
    const normalizedOrder = this.normalizeOrder(order);
    
    switch (normalizedOrder.status) {
      case 'NEW':
      case 'PARTIALLY_FILLED':
        this.orders.open.set(normalizedOrder.orderId, normalizedOrder);
        break;
        
      case 'FILLED':
        this.orders.open.delete(normalizedOrder.orderId);
        this.orders.closed.set(normalizedOrder.orderId, normalizedOrder);
        break;
        
      case 'CANCELED':
      case 'EXPIRED':
      case 'REJECTED':
        this.orders.open.delete(normalizedOrder.orderId);
        this.orders.cancelled.set(normalizedOrder.orderId, normalizedOrder);
        break;
    }
    
    // Add to history
    this.orders.history.push(normalizedOrder);
    
    // Update statistics
    this.updateStatistics();
    
    // Calculate metrics
    this.calculateMetrics();
    
    // Update dashboard
    if (this.config.dashboard) {
      this.config.dashboard.updateOrderData(this.getOrderSummary());
    }
    
    console.log(`📝 Order ${normalizedOrder.orderId} added: ${normalizedOrder.side} ${normalizedOrder.symbol}`);
    
    return normalizedOrder;
  }
  
  /**
   * Update an existing order
   */
  updateOrder(orderId, updates) {
    let order = this.orders.open.get(orderId);
    
    if (!order) {
      order = this.orders.closed.get(orderId) || this.orders.cancelled.get(orderId);
    }
    
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }
    
    const updatedOrder = {
      ...order,
      ...updates,
      updateTime: Date.now()
    };
    
    // Move between maps if status changed
    if (updates.status && updates.status !== order.status) {
      this.orders.open.delete(orderId);
      this.orders.closed.delete(orderId);
      this.orders.cancelled.delete(orderId);
      
      switch (updates.status) {
        case 'NEW':
        case 'PARTIALLY_FILLED':
          this.orders.open.set(orderId, updatedOrder);
          break;
          
        case 'FILLED':
          this.orders.closed.set(orderId, updatedOrder);
          break;
          
        case 'CANCELED':
        case 'EXPIRED':
        case 'REJECTED':
          this.orders.cancelled.set(orderId, updatedOrder);
          break;
      }
    } else {
      // Update in current map
      if (this.orders.open.has(orderId)) {
        this.orders.open.set(orderId, updatedOrder);
      } else if (this.orders.closed.has(orderId)) {
        this.orders.closed.set(orderId, updatedOrder);
      } else if (this.orders.cancelled.has(orderId)) {
        this.orders.cancelled.set(orderId, updatedOrder);
      }
    }
    
    // Update in history
    const historyIndex = this.orders.history.findIndex(o => o.orderId === orderId);
    if (historyIndex !== -1) {
      this.orders.history[historyIndex] = updatedOrder;
    }
    
    // Update statistics
    this.updateStatistics();
    
    // Calculate metrics
    this.calculateMetrics();
    
    // Update dashboard
    if (this.config.dashboard) {
      this.config.dashboard.updateOrderData(this.getOrderSummary());
    }
    
    console.log(`📝 Order ${orderId} updated: ${updates.status || 'no status change'}`);
    
    return updatedOrder;
  }
  
  /**
   * Cancel an order
   */
  cancelOrder(orderId, reason = 'manual') {
    const order = this.orders.open.get(orderId);
    
    if (!order) {
      throw new Error(`Order ${orderId} not found or not open`);
    }
    
    const cancelledOrder = {
      ...order,
      status: 'CANCELED',
      updateTime: Date.now(),
      cancelReason: reason
    };
    
    // Move from open to cancelled
    this.orders.open.delete(orderId);
    this.orders.cancelled.set(orderId, cancelledOrder);
    
    // Update in history
    const historyIndex = this.orders.history.findIndex(o => o.orderId === orderId);
    if (historyIndex !== -1) {
      this.orders.history[historyIndex] = cancelledOrder;
    }
    
    // Update statistics
    this.updateStatistics();
    
    // Update dashboard
    if (this.config.dashboard) {
      this.config.dashboard.updateOrderData(this.getOrderSummary());
    }
    
    console.log(`❌ Order ${orderId} cancelled: ${reason}`);
    
    return cancelledOrder;
  }
  
  /**
   * Get order by ID
   */
  getOrder(orderId) {
    return (
      this.orders.open.get(orderId) ||
      this.orders.closed.get(orderId) ||
      this.orders.cancelled.get(orderId) ||
      null
    );
  }
  
  /**
   * Get all open orders
   */
  getOpenOrders() {
    return Array.from(this.orders.open.values());
  }
  
  /**
   * Get all closed orders
   */
  getClosedOrders(limit = 50) {
    const closedOrders = Array.from(this.orders.closed.values());
    return closedOrders
      .sort((a, b) => b.time - a.time)
      .slice(0, limit);
  }
  
  /**
   * Get order history
   */
  getOrderHistory(limit = 100) {
    return this.orders.history
      .sort((a, b) => b.time - a.time)
      .slice(0, limit);
  }
  
  /**
   * Get orders by symbol
   */
  getOrdersBySymbol(symbol, limit = 50) {
    return this.orders.history
      .filter(order => order.symbol === symbol)
      .sort((a, b) => b.time - a.time)
      .slice(0, limit);
  }
  
  /**
   * Get orders by side (BUY/SELL)
   */
  getOrdersBySide(side, limit = 50) {
    return this.orders.history
      .filter(order => order.side === side)
      .sort((a, b) => b.time - a.time)
      .slice(0, limit);
  }
  
  /**
   * Get orders by date range
   */
  getOrdersByDateRange(startDate, endDate = new Date()) {
    const startTime = new Date(startDate).getTime();
    const endTime = new Date(endDate).getTime();
    
    return this.orders.history.filter(order => {
      const orderTime = order.time;
      return orderTime >= startTime && orderTime <= endTime;
    });
  }
  
  /**
   * Calculate performance metrics
   */
  async calculateMetrics() {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;
    const monthMs = 30 * dayMs;
    
    // Get orders for different time periods
    const allOrders = Array.from(this.orders.closed.values());
    const dailyOrders = allOrders.filter(order => now - order.time < dayMs);
    const weeklyOrders = allOrders.filter(order => now - order.time < weekMs);
    const monthlyOrders = allOrders.filter(order => now - order.time < monthMs);
    
    // Calculate daily metrics
    this.metrics.daily = this.calculatePeriodMetrics(dailyOrders);
    
    // Calculate weekly metrics
    this.metrics.weekly = this.calculatePeriodMetrics(weeklyOrders);
    
    // Calculate monthly metrics
    this.metrics.monthly = this.calculatePeriodMetrics(monthlyOrders);
    
    // Calculate all-time metrics
    this.metrics.allTime = this.calculatePeriodMetrics(allOrders);
    
    // Calculate advanced metrics
    this.calculateAdvancedMetrics(allOrders);
    
    this.state.lastUpdate = Date.now();
    
    return this.metrics;
  }
  
  /**
   * Calculate metrics for a period
   */
  calculatePeriodMetrics(orders) {
    if (orders.length === 0) {
      return {
        trades: 0,
        volume: 0,
        pnl: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0
      };
    }
    
    const winningTrades = orders.filter(order => order.pnl > 0);
    const losingTrades = orders.filter(order => order.pnl < 0);
    
    const totalVolume = orders.reduce((sum, order) => sum + (order.quantity * order.executedPrice), 0);
    const totalPnl = orders.reduce((sum, order) => sum + order.pnl, 0);
    const totalWins = winningTrades.reduce((sum, order) => sum + order.pnl, 0);
