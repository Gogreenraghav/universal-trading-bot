/**
 * Universal Trading Bot - Demo Trading Engine
 * Complete paper trading system with virtual balance for customer demos
 */

class DemoTradingEngine {
  constructor(config) {
    this.config = {
      initialBalance: config.initialBalance || 10000,
      defaultCurrency: config.defaultCurrency || 'USDT',
      minBalance: config.minBalance || 100,     // Minimum $100
      maxBalance: config.maxBalance || 1000000, // Maximum $1,000,000
      supportedPairs: config.supportedPairs || [
        'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT',
        'SOLUSDT', 'DOTUSDT', 'DOGEUSDT', 'MATICUSDT', 'LTCUSDT'
      ],
      commissionRate: config.commissionRate || 0.001, // 0.1% commission
      slippage: config.slippage || 0.001, // 0.1% slippage
      marketDataDelay: config.marketDataDelay || 1000, // 1 second delay
      enableReset: config.enableReset || true,
      enableCustomBalance: config.enableCustomBalance || true,
      ...config
    };
    
    // Demo state
    this.state = {
      mode: 'demo',
      balance: {
        [this.config.defaultCurrency]: this.config.initialBalance
      },
      portfolio: {},
      openOrders: [],
      closedOrders: [],
      tradeHistory: [],
      positions: {},
      performance: {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        totalProfitLoss: 0,
        maxDrawdown: 0,
        sharpeRatio: 0
      },
      marketData: {},
      startedAt: Date.now()
    };
    
    // Market data simulation
    this.marketSimulator = null;
    
    console.log('🎮 Demo Trading Engine initialized');
    console.log(`💰 Initial demo balance: ${this.config.initialBalance} ${this.config.defaultCurrency}`);
  }
  
  /**
   * Initialize demo engine
   */
  async initialize() {
    try {
      console.log('🚀 Initializing demo trading engine...');
      
      // Initialize market data
      await this.initializeMarketData();
      
      // Start market simulator
      this.startMarketSimulator();
      
      // Initialize empty portfolio for all supported pairs
      this.config.supportedPairs.forEach(pair => {
        const baseCurrency = pair.replace('USDT', '');
        this.state.portfolio[baseCurrency] = 0;
        this.state.positions[pair] = {
          quantity: 0,
          averagePrice: 0,
          unrealizedProfitLoss: 0,
          realizedProfitLoss: 0
        };
      });
      
      this.state.initialized = true;
      console.log('✅ Demo trading engine ready');
      
      return { success: true, mode: 'demo', balance: this.getBalance() };
      
    } catch (error) {
      console.error('❌ Failed to initialize demo engine:', error);
      throw error;
    }
  }
  
  /**
   * Initialize market data
   */
  async initializeMarketData() {
    // Simulate initial market prices
    const basePrices = {
      'BTCUSDT': 65000,
      'ETHUSDT': 3500,
      'BNBUSDT': 600,
      'ADAUSDT': 0.5,
      'XRPUSDT': 0.6,
      'SOLUSDT': 150,
      'DOTUSDT': 7,
      'DOGEUSDT': 0.15,
      'MATICUSDT': 0.8,
      'LTCUSDT': 80
    };
    
    this.config.supportedPairs.forEach(pair => {
      const basePrice = basePrices[pair] || 100;
      const spread = basePrice * 0.001; // 0.1% spread
      
      this.state.marketData[pair] = {
        symbol: pair,
        bid: basePrice - spread,
        ask: basePrice + spread,
        last: basePrice,
        volume: Math.random() * 1000,
        change24h: (Math.random() - 0.5) * 0.1, // -5% to +5%
        high24h: basePrice * (1 + Math.random() * 0.05),
        low24h: basePrice * (1 - Math.random() * 0.05),
        timestamp: Date.now()
      };
    });
    
    console.log('📈 Demo market data initialized');
  }
  
  /**
   * Start market simulator
   */
  startMarketSimulator() {
    this.marketSimulator = setInterval(() => {
      this.updateMarketPrices();
    }, this.config.marketDataDelay);
    
    console.log('🔄 Market simulator started');
  }
  
  /**
   * Update market prices with random walk
   */
  updateMarketPrices() {
    Object.keys(this.state.marketData).forEach(symbol => {
      const data = this.state.marketData[symbol];
      const volatility = 0.001; // 0.1% volatility per update
      
      // Random walk with slight mean reversion
      const randomChange = (Math.random() - 0.5) * 2 * volatility;
      const meanReversion = (data.last - (data.high24h + data.low24h) / 2) * 0.01;
      const totalChange = randomChange + meanReversion;
      
      const newPrice = data.last * (1 + totalChange);
      const spread = newPrice * 0.001;
      
      data.bid = newPrice - spread;
      data.ask = newPrice + spread;
      data.last = newPrice;
      data.timestamp = Date.now();
      
      // Update 24h high/low
      if (newPrice > data.high24h) data.high24h = newPrice;
      if (newPrice < data.low24h) data.low24h = newPrice;
      
      // Update positions
      this.updatePositionProfitLoss(symbol);
    });
  }
  
  /**
   * Update position profit/loss
   */
  updatePositionProfitLoss(symbol) {
    const position = this.state.positions[symbol];
    if (position.quantity > 0) {
      const currentPrice = this.state.marketData[symbol].last;
      position.unrealizedProfitLoss = (currentPrice - position.averagePrice) * position.quantity;
    }
  }
  
  /**
   * Execute demo buy order
   */
  async buy(symbol, quantity, orderType = 'MARKET', price = null) {
    try {
      console.log(`🛒 Demo BUY order: ${quantity} ${symbol} (${orderType})`);
      
      // Validate symbol
      if (!this.config.supportedPairs.includes(symbol)) {
        throw new Error(`Unsupported trading pair: ${symbol}`);
      }
      
      // Get market data
      const marketData = this.state.marketData[symbol];
      if (!marketData) {
        throw new Error(`No market data for ${symbol}`);
      }
      
      // Calculate execution price
      let executionPrice;
      if (orderType === 'LIMIT' && price) {
        executionPrice = price;
      } else {
        executionPrice = marketData.ask; // Buy at ask price
      }
      
      // Calculate total cost
      const baseCurrency = symbol.replace('USDT', '');
      const totalCost = executionPrice * quantity;
      const commission = totalCost * this.config.commissionRate;
      const totalWithCommission = totalCost + commission;
      
      // Check balance
      if (this.state.balance.USDT < totalWithCommission) {
        throw new Error(`Insufficient balance. Need ${totalWithCommission} USDT, have ${this.state.balance.USDT} USDT`);
      }
      
      // Execute order
      const order = {
        id: `demo-buy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        symbol,
        side: 'BUY',
        type: orderType,
        quantity,
        price: executionPrice,
        commission,
        totalCost: totalWithCommission,
        status: 'FILLED',
        filledQuantity: quantity,
        filledPrice: executionPrice,
        timestamp: Date.now(),
        demo: true
      };
      
      // Update balance
      this.state.balance.USDT -= totalWithCommission;
      
      // Update portfolio
      this.state.portfolio[baseCurrency] = (this.state.portfolio[baseCurrency] || 0) + quantity;
      
      // Update position
      const position = this.state.positions[symbol];
      const totalPositionValue = (position.quantity * position.averagePrice) + totalCost;
      position.quantity += quantity;
      position.averagePrice = totalPositionValue / position.quantity;
      
      // Add to trade history
      this.state.tradeHistory.push(order);
      this.state.closedOrders.push(order);
      
      // Update performance
      this.state.performance.totalTrades++;
      
      console.log(`✅ Demo BUY executed: ${quantity} ${symbol} @ ${executionPrice} USDT`);
      
      return {
        success: true,
        order,
        balance: this.getBalance(),
        portfolio: this.getPortfolio(),
        message: `Demo buy order executed successfully`
      };
      
    } catch (error) {
      console.error('❌ Demo buy failed:', error.message);
      return {
        success: false,
        error: error.message,
        message: `Demo buy failed: ${error.message}`
      };
    }
  }
  
  /**
   * Execute demo sell order
   */
  async sell(symbol, quantity, orderType = 'MARKET', price = null) {
    try {
      console.log(`🛒 Demo SELL order: ${quantity} ${symbol} (${orderType})`);
      
      // Validate symbol
      if (!this.config.supportedPairs.includes(symbol)) {
        throw new Error(`Unsupported trading pair: ${symbol}`);
      }
      
      // Get market data
      const marketData = this.state.marketData[symbol];
      if (!marketData) {
        throw new Error(`No market data for ${symbol}`);
      }
      
      // Calculate execution price
      let executionPrice;
      if (orderType === 'LIMIT' && price) {
        executionPrice = price;
      } else {
        executionPrice = marketData.bid; // Sell at bid price
      }
      
      // Calculate total revenue
      const baseCurrency = symbol.replace('USDT', '');
      const totalRevenue = executionPrice * quantity;
      const commission = totalRevenue * this.config.commissionRate;
      const totalAfterCommission = totalRevenue - commission;
      
      // Check portfolio
      if ((this.state.portfolio[baseCurrency] || 0) < quantity) {
        throw new Error(`Insufficient ${baseCurrency}. Need ${quantity}, have ${this.state.portfolio[baseCurrency] || 0}`);
      }
      
      // Execute order
      const order = {
        id: `demo-sell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        symbol,
        side: 'SELL',
        type: orderType,
        quantity,
        price: executionPrice,
        commission,
        totalRevenue: totalAfterCommission,
        status: 'FILLED',
        filledQuantity: quantity,
        filledPrice: executionPrice,
        timestamp: Date.now(),
        demo: true
      };
      
      // Calculate profit/loss
      const position = this.state.positions[symbol];
      const costBasis = position.averagePrice * quantity;
      const profitLoss = totalRevenue - costBasis - commission;
      
      order.profitLoss = profitLoss;
      
      // Update balance
      this.state.balance.USDT += totalAfterCommission;
      
      // Update portfolio
      this.state.portfolio[baseCurrency] -= quantity;
      if (this.state.portfolio[baseCurrency] < 0.00000001) {
        this.state.portfolio[baseCurrency] = 0;
      }
      
      // Update position
      position.quantity -= quantity;
      if (position.quantity < 0.00000001) {
        position.quantity = 0;
        position.averagePrice = 0;
      }
      
      // Update realized P&L
      position.realizedProfitLoss += profitLoss;
      
      // Add to trade history
      this.state.tradeHistory.push(order);
      this.state.closedOrders.push(order);
      
      // Update performance
      this.state.performance.totalTrades++;
      if (profitLoss > 0) {
        this.state.performance.winningTrades++;
      } else if (profitLoss < 0) {
        this.state.performance.losingTrades++;
      }
      this.state.performance.totalProfitLoss += profitLoss;
      
      console.log(`✅ Demo SELL executed: ${quantity} ${symbol} @ ${executionPrice} USDT, P&L: ${profitLoss.toFixed(2)} USDT`);
      
      return {
        success: true,
        order,
        profitLoss,
        balance: this.getBalance(),
        portfolio: this.getPortfolio(),
        message: `Demo sell order executed successfully`
      };
      
    } catch (error) {
      console.error('❌ Demo sell failed:', error.message);
      return {
        success: false,
        error: error.message,
        message: `Demo sell failed: ${error.message}`
      };
    }
  }
  
  /**
   * Get demo balance
   */
  getBalance() {
    const totalValue = this.getTotalPortfolioValue();
    
    return {
      mode: 'demo',
      currencies: this.state.balance,
      totalValue: this.state.balance.USDT + totalValue,
      available: this.state.balance.USDT,
      inPositions: totalValue,
      demo: true
    };
  }
  
  /**
   * Get portfolio
   */
  getPortfolio() {
    const portfolio = [];
    
    Object.keys(this.state.portfolio).forEach(currency => {
      const quantity = this.state.portfolio[currency];
      if (quantity > 0) {
        const symbol = `${currency}USDT`;
        const marketData = this.state.marketData[symbol];
        const currentPrice = marketData ? marketData.last : 0;
        const value = quantity * currentPrice;
        const position = this.state.positions[symbol];
        
        portfolio.push({
          symbol,
          currency,
          quantity,
          currentPrice,
          value,
          averagePrice: position ? position.averagePrice : 0,
          unrealizedProfitLoss: position ? position.unrealizedProfitLoss : 0,
          realizedProfitLoss: position ? position.realizedProfitLoss : 0
        });
      }
    });
    
    return {
      mode: 'demo',
      items: portfolio,
      totalValue: this.getTotalPortfolioValue(),
      demo: true
    };
  }
  
  /**
   * Get total portfolio value
   */
  getTotalPortfolioValue() {
    let total = 0;
    
    Object.keys(this.state.portfolio).forEach(currency => {
      const quantity = this.state.portfolio[currency];
      if (quantity > 0) {
        const symbol = `${currency}USDT`;
        const marketData = this.state.marketData[symbol];
        if (marketData) {
          total += quantity * marketData.last;
        }
      }
    });
    
    return total;
  }
  
  /**
   * Get market data
   */
  getMarketData(symbol = null) {
    if (symbol) {
      return this.state.marketData[symbol] || null;
    }
    
    return {
      mode: 'demo',
      data: this.state.marketData,
      timestamp: Date.now(),
      demo: true
    };
  }
  
  /**
   * Get trade history
   */
  getTradeHistory(limit = 50) {
    const history = this.state.tradeHistory
      .slice(-limit)
      .reverse();
    
    return {
      mode: 'demo',
      trades: history,
      total: this.state.tradeHistory.length,
      demo: true
    };
  }
  
  /**
   * Get performance metrics
   */
  getPerformance() {
    const winRate = this.state.performance.totalTrades > 0
      ? (this.state.performance.winningTrades / this.state.performance.totalTrades) * 100
      : 0;
    
    const avgProfit = this.state.performance.totalTrades > 0
      ? this.state.performance.totalProfitLoss / this.state.performance.totalTrades
      : 0;
    
    return {
      mode: 'demo',
      metrics: {
        totalTrades: this.state.performance.totalTrades,
        winningTrades: this.state.performance.winningTrades,
        losingTrades: this.state.performance.losingTrades,
        winRate: winRate.toFixed(2),
        totalProfitLoss: this.state.performance.totalProfitLoss,
        averageProfit: avgProfit.toFixed(2),
        balance: this.state.balance.USDT,
        portfolioValue: this.getTotalPortfolioValue(),
        totalValue: this.state.balance.USDT + this.getTotalPortfolioValue(),
        initialBalance: this.config.initialBalance,
        netProfit: (this.state.balance.USDT + this.getTotalPortfolioValue()) - this.config.initialBalance
      },
      demo: true
    };
  }
  
  /**
   * Set custom demo balance
   */
  setCustomBalance(amount, currency = 'USDT') {
    if (!this.config.enableCustomBalance) {
      throw new Error('Custom balance is disabled');
    }
    
    // Validate amount
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new Error('Invalid amount. Must be a number');
    }
    
    if (amount < this.config.minBalance) {
      throw new Error(`Minimum balance is ${this.config.minBalance}`);
    }
    
    if (amount > this.config.maxBalance) {
      throw new Error(`Maximum balance is ${this.config.maxBalance}`);
    }
    
    console.log(`💰 Setting custom demo balance: ${amount} ${currency}`);
    
    // Calculate difference from current balance
    const currentBalance = this.state.balance[this.config.defaultCurrency] || 0;
    const difference = amount - currentBalance;
    
    // Update balance
    this.state.balance = {
      [currency]: amount
    };
    
    // Update initial balance in config for future resets
    this.config.initialBalance = amount;
    this.config.defaultCurrency = currency;
    
    // If increasing balance, add to performance tracking
    if (difference > 0) {
      this.state.performance.totalProfitLoss += difference;
    }
    
    return {
      success: true,
      oldBalance: currentBalance,
      newBalance: amount,
      currency,
      difference,
      message: `Demo balance set to ${amount} ${currency}`
    };
  }
  
  /**
   * Get balance configuration options
   */
  getBalanceConfig() {
    return {
      currentBalance: this.state.balance[this.config.defaultCurrency] || this.config.initialBalance,
      currency: this.config.defaultCurrency,
      minBalance: this.config.minBalance,
      maxBalance: this.config.maxBalance,
      initialBalance: this.config.initialBalance,
      enableCustomBalance: this.config.enableCustomBalance,
      quickPresets: [100, 500, 1000, 5000, 10000, 50000, 100000],
      supportedCurrencies: ['USDT', 'INR', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF']
    };
  }
  
  /**
   * Reset demo account
   */
  resetDemoAccount() {
    if (!this.config.enableReset) {
      throw new Error('Demo account reset is disabled');
    }
    
    console.log('🔄 Resetting demo account...');
    
    // Reset balance
    this.state.balance = {
      [this.config.defaultCurrency]: this.config.initialBalance
    };
    
    // Reset portfolio
    this.config.supportedPairs.forEach(pair => {
      const baseCurrency = pair.replace('USDT', '');
      this.state.portfolio[baseCurrency] = 0;
      this.state.positions[pair] = {
        quantity: 0,
        averagePrice: 0,
        unrealizedProfitLoss: 0,
        realizedProfitLoss: 0
      };
    });
    
    // Reset orders and history
    this.state.openOrders = [];
    this.state.closedOrders = [];
    this.state.tradeHistory = [];
    
    // Reset performance
    this.state.performance = {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalProfitLoss: 0,
      maxDrawdown: 0,
      sharpeRatio: 0
    };
    
    this.state.startedAt = Date