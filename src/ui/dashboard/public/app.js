/**
 * Universal Trading Bot Dashboard - Frontend Application
 */

class DashboardApp {
    constructor() {
        this.ws = null;
        this.data = {};
        this.charts = {};
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        // Initialize
        this.init();
    }
    
    /**
     * Initialize the application
     */
    init() {
        console.log('🚀 Initializing Dashboard App...');
        
        // Connect to WebSocket
        this.connectWebSocket();
        
        // Initialize charts
        this.initCharts();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start periodic updates
        this.startPeriodicUpdates();
        
        console.log('✅ Dashboard App initialized');
    }
    
    /**
     * Connect to WebSocket server
     */
    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('🔌 WebSocket connected');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.updateConnectionStatus(true);
            
            // Subscribe to data channels
            this.ws.send(JSON.stringify({
                type: 'subscribe',
                channels: ['market', 'portfolio', 'trades', 'news']
            }));
        };
        
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };
        
        this.ws.onclose = () => {
            console.log('🔌 WebSocket disconnected');
            this.isConnected = false;
            this.updateConnectionStatus(false);
            this.handleReconnection();
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }
    
    /**
     * Handle WebSocket messages
     */
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'init':
                this.data = data.data;
                this.updateDashboard();
                break;
                
            case 'market_update':
                this.data.market = { ...this.data.market, ...data.data };
                this.updateMarketData();
                break;
                
            case 'portfolio_update':
                this.data.portfolio = { ...this.data.portfolio, ...data.data };
                this.updatePortfolioData();
                break;
                
            case 'trade_update':
                this.data.trading = { ...this.data.trading, ...data.data };
                this.updateTradingData();
                break;
                
            case 'news_update':
                this.data.news = { ...this.data.news, ...data.data };
                this.updateNewsData();
                break;
                
            case 'bot_status':
                this.updateBotStatus(data.status);
                break;
                
            case 'pong':
                // Keep-alive response
                break;
                
            default:
                console.log('Unknown message type:', data.type);
        }
        
        // Update last update time
        document.getElementById('lastUpdate').textContent = this.formatTime(data.timestamp);
    }
    
    /**
     * Handle reconnection
     */
    handleReconnection() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            
            console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
            
            setTimeout(() => {
                this.connectWebSocket();
            }, delay);
        } else {
            console.error('Max reconnection attempts reached');
        }
    }
    
    /**
     * Update connection status display
     */
    updateConnectionStatus(connected) {
        const indicator = document.querySelector('.status-indicator');
        const statusText = document.querySelector('.connection-status span');
        
        if (connected) {
            indicator.className = 'status-indicator online';
            statusText.textContent = 'Connected';
        } else {
            indicator.className = 'status-indicator offline';
            statusText.textContent = 'Disconnected';
        }
        
        // Update connections count
        document.getElementById('connections').textContent = 
            this.data.system?.connections || 1;
    }
    
    /**
     * Initialize charts
     */
    initCharts() {
        // Price chart
        const priceCtx = document.getElementById('priceChart').getContext('2d');
        this.charts.price = new Chart(priceCtx, {
            type: 'line',
            data: {
                labels: this.generateTimeLabels(24),
                datasets: [{
                    label: 'BTC/USDT',
                    data: this.generateRandomData(24, 64000, 66000),
                    borderColor: '#00a4f0',
                    backgroundColor: 'rgba(0, 164, 240, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#adb5bd'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#adb5bd',
                            callback: (value) => `$${value.toLocaleString()}`
                        }
                    }
                }
            }
        });
        
        // Volume chart
        const volumeCtx = document.getElementById('volumeChart').getContext('2d');
        this.charts.volume = new Chart(volumeCtx, {
            type: 'bar',
            data: {
                labels: this.generateTimeLabels(12),
                datasets: [{
                    label: 'Volume',
                    data: this.generateRandomData(12, 1000, 5000),
                    backgroundColor: 'rgba(0, 164, 240, 0.7)',
                    borderColor: '#00a4f0',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#adb5bd'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#adb5bd',
                            callback: (value) => `${(value / 1000).toFixed(1)}K`
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Generate time labels for charts
     */
    generateTimeLabels(count) {
        const labels = [];
        const now = new Date();
        
        for (let i = count - 1; i >= 0; i--) {
            const time = new Date(now.getTime() - i * 3600000);
            labels.push(time.getHours().toString().padStart(2, '0') + ':00');
        }
        
        return labels;
    }
    
    /**
     * Generate random data for charts
     */
    generateRandomData(count, min, max) {
        const data = [];
        let current = (min + max) / 2;
        
        for (let i = 0; i < count; i++) {
            const change = (Math.random() - 0.5) * (max - min) * 0.1;
            current = Math.max(min, Math.min(max, current + change));
            data.push(current);
        }
        
        return data;
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Bot control buttons
        document.getElementById('startBot').addEventListener('click', () => {
            this.startBot();
        });
        
        document.getElementById('stopBot').addEventListener('click', () => {
            this.stopBot();
        });
        
        // Trading buttons
        document.getElementById('buyBtn').addEventListener('click', () => {
            this.placeOrder('buy');
        });
        
        document.getElementById('sellBtn').addEventListener('click', () => {
            this.placeOrder('sell');
        });
        
        // Timeframe buttons
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.timeframe-btn').forEach(b => {
                    b.classList.remove('active');
                });
                e.target.classList.add('active');
                this.updateChartTimeframe(e.target.textContent);
            });
        });
        
        // Order type change
        document.getElementById('orderType').addEventListener('change', (e) => {
            const priceInput = document.getElementById('price');
            priceInput.disabled = e.target.value === 'market';
        });
        
        // Symbol change
        document.getElementById('symbolSelect').addEventListener('change', (e) => {
            this.updateSymbolPrice(e.target.value);
        });
        
        // Keep-alive ping
        setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000);
    }
    
    /**
     * Start bot
     */
    async startBot() {
        try {
            const response = await fetch('/api/bot/start', {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Bot started successfully', 'success');
            } else {
                this.showNotification('Failed to start bot: ' + result.error, 'error');
            }
        } catch (error) {
            this.showNotification('Failed to start bot: ' + error.message, 'error');
        }
    }
    
    /**
     * Stop bot
     */
    async stopBot() {
        try {
            const response = await fetch('/api/bot/stop', {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Bot stopped successfully', 'success');
            } else {
                this.showNotification('Failed to stop bot: ' + result.error, 'error');
            }
        } catch (error) {
            this.showNotification('Failed to stop bot: ' + error.message, 'error');
        }
    }
    
    /**
     * Place order
     */
    async placeOrder(side) {
        const symbol = document.getElementById('symbolSelect').value;
        const quantity = parseFloat(document.getElementById('quantity').value);
        const orderType = document.getElementById('orderType').value;
        const price = orderType === 'limit' ? 
            parseFloat(document.getElementById('price').value) : null;
        
        if (!quantity || quantity <= 0) {
            this.showNotification('Please enter a valid quantity', 'warning');
            return;
        }
        
        if (orderType === 'limit' && (!price || price <= 0)) {
            this.showNotification('Please enter a valid price for limit order', 'warning');
            return;
        }
        
        try {
            const response = await fetch(`/api/trade/${side}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    symbol,
                    quantity,
                    price,
                    orderType
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(
                    `${side.toUpperCase()} order placed: ${symbol} ${quantity}`,
                    'success'
                );
                
                // Clear form
                document.getElementById('quantity').value = '';
                if (orderType === 'limit') {
                    document.getElementById('price').value = '';
                }
            } else {
                this.showNotification('Failed to place order: ' + result.error, 'error');
            }
        } catch (error) {
            this.showNotification('Failed to place order: ' + error.message, 'error');
        }
    }
    
    /**
     * Update chart timeframe
     */
    updateChartTimeframe(timeframe) {
        // In production, this would fetch new data for the selected timeframe
        console.log('Updating chart timeframe to:', timeframe);
        
        // Update chart data based on timeframe
        let dataPoints;
        switch (timeframe) {
            case '1H': dataPoints = 24; break;
            case '4H': dataPoints = 24; break;
            case '1D': dataPoints = 30; break;
            case '1W': dataPoints = 52; break;
            default: dataPoints = 24;
        }
        
        this.charts.price.data.labels = this.generateTimeLabels(dataPoints);
        this.charts.price.data.datasets[0].data = 
            this.generateRandomData(dataPoints, 64000, 66000);
        this.charts.price.update();
    }
    
    /**
     * Update symbol price
     */
    updateSymbolPrice(symbol) {
        // In production, this would fetch current price for the symbol
        const prices = {
            'BTCUSDT': 65000,
            'ETHUSDT': 3500,
            'BNBUSDT': 600,
            'SOLUSDT': 180
        };
        
        const priceInput = document.getElementById('price');
        if (!priceInput.disabled) {
            priceInput.value = prices[symbol] || '';
            priceInput.placeholder = `Current: $${prices[symbol] || 'N/A'}`;
        }
    }
    
    /**
     * Update dashboard with latest data
     */
    updateDashboard() {
        this.updatePortfolioData();
        this.updateMarketData();
        this.updateTradingData();
        this.updateNewsData();
        this.updateBotStatus(this.data.bot?.status || 'offline');
        this.updateSystemInfo();
    }
    
    /**
     * Update portfolio data
     */
    updatePortfolioData() {
        const portfolio = this.data.portfolio;
        if (!portfolio) return;
        
        document.getElementById('portfolioValue').textContent = 
            `$${portfolio.totalValue?.toLocaleString() || '0'}`;
        
        document.getElementById('portfolioChange').textContent = 
            portfolio.pnlPercent >= 0 ? 
            `+${portfolio.pnlPercent?.toFixed(1)}%` : 
            `${portfolio.pnlPercent?.toFixed(1)}%`;
        
        document.getElementById('portfolioChange').className = 
            `stat-change ${portfolio.pnlPercent >= 0 ? 'positive' : 'negative'}`;
        
        document.getElementById('todayPnl').textContent = 
            `$${portfolio.pnl?.toLocaleString() || '0'}`;
        
        document.getElementById('todayPnlPercent').textContent = 
            portfolio.pnlPercent >= 0 ? 
            `+${portfolio.pnlPercent?.toFixed(1)}%` : 
            `${portfolio.pnlPercent?.toFixed(1)}%`;
        
        // Update positions table
        this.updatePositionsTable(portfolio.positions || []);
    }
    
    /**
     * Update positions table
     */
    updatePositionsTable(positions) {
        const tbody = document.getElementById('positionsBody');
        tbody.innerHTML = '';
        
        positions.forEach(position => {
            const pnl = position.pnl || 0;
            const pnlPercent = ((position.current - position.entry) / position.entry * 100);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${position.symbol}</td>
                <td>${position.quantity}</td>
                <td>$${position.entry?.toLocaleString()}</td>
                <td>$${position.current?.toLocaleString()}</td>
                <td class="${pnl >= 0 ? 'positive' : 'negative'}">
                    $${pnl.toLocaleString()} (${pnlPercent.toFixed(2)}%)
                </td>
                <td>
                    <button class="btn-close" data-symbol="${position.symbol}">
                        <i class="fas fa-times"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Add close position event listeners
        document.querySelectorAll('.btn-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const symbol = e.target.closest('.btn-close').dataset.symbol;
                this.closePosition(symbol);
            });
        });
    }
    
    /**
     * Close position
     */
    async closePosition(symbol) {
        // In production, this would close the position
        this.showNotification(`Closing position: ${symbol}`, 'info');
    }
    
    /**
     * Update market data
     */
    updateMarketData() {
        const market = this.data.market;
        if (!market) return;
        
        // Update BTC price in chart title
        const chartTitle = document.querySelector('.chart-header h3');
        if (chartTitle && market.btcPrice) {
            chartTitle.textContent = `BTC/USDT - $${market.btcPrice.toLocaleString()}`;
        }
        
        // Update fear & greed index if available
        if (market.fearGreedIndex) {
            document.getElementById('riskScore').textContent = 
                `${market.fearGreedIndex}/100`;
        }
    }
    
    /**
     * Update trading data
     */
    updateTradingData() {
        const trading = this.data.trading;
        if (!trading) return;
        
        document.getElementById('winRate').textContent = 
            `${trading.winRate || 0}%`;
    }
    
    /**
     * Update news data
     */
    updateNewsData() {
        const news = this.data.news;
        if (!news) return;
        
        // Update overall sentiment
        if (news.overallSentiment !== undefined) {
            const sentimentValue = document.querySelector('.score-value');
            const sentimentLabel = document.querySelector('.score-label');
            const indicatorFill = document.querySelector('.indicator-fill');
            
            sentimentValue.textContent = news.overallSentiment