/**
 * Binance Futures Trading Integration
 * Supports: USDT-M perpetual futures, 125x leverage, long/short positions
 */
const BinanceExchange = require('./BinanceExchange');

class BinanceFutures extends BinanceExchange {
  constructor(config = {}) {
    super({ ...config, mode: config.mode || 'paper' });
    this.name = 'Binance Futures';
    this.isFutures = true;
    this.futuresBaseURL = this.config.futuresTestnet
      ? 'https://testnet.binancefuture.com'
      : 'https://fapi.binance.com';
    this.futuresWSURL = this.config.futuresTestnet
      ? 'wss://stream.binance.com:9443/ws'
      : 'wss://fstream.binance.com/ws';
    this.fundingRates = new Map();
    this.longShortRatio = new Map();
    this.takerLongShortRatio = new Map();
    console.log(`📊 Binance Futures initialized`);
    console.log(`   URL: ${this.futuresBaseURL}`);
  }

  // ── Futures HTTP Request ──────────────────────────────────
  _futuresRequest(method, endpoint, params = {}) {
    return new Promise((resolve, reject) => {
      if (!this.config.apiKey) {
        return reject(new Error('API key required for futures'));
      }

      const timestamp = Date.now();
      const queryString = Object.entries({ ...params, timestamp })
        .map(([k, v]) => `${k}=${v}`).join('&');

      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', this.config.apiSecret)
        .update(queryString)
        .digest('hex');

      const options = {
        hostname: new URL(this.futuresBaseURL + endpoint).hostname,
        path: endpoint + '?' + queryString + '&signature=' + signature,
        method,
        headers: { 'X-MBX-APIKEY': this.config.apiKey },
      };

      const req = require('https').request(options, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.code || json.msg) return reject(new Error(json.msg || json.code));
            resolve(json);
          } catch { resolve(data); }
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => { req.destroy(); reject(new Error('Futures request timeout')); });
      req.end();
    });
  }

  // ── Set Leverage ───────────────────────────────────────
  async setLeverage(symbol, leverage = 10) {
    if (this.config.mode === 'paper') {
      console.log(`📊 [PAPER] Set ${symbol} leverage to ${leverage}x`);
      return { symbol, leverage, mode: 'paper' };
    }
    try {
      const data = await this._futuresRequest('POST', '/fapi/v1/leverage', {
        symbol: symbol.toUpperCase(),
        leverage: Math.min(Math.max(1, leverage), 125),
      });
      return { symbol, leverage: data.leverage, mode: 'live' };
    } catch (e) {
      return { error: e.message };
    }
  }

  // ── Open Futures Position ────────────────────────────────
  async openPosition(symbol, side, quantity, entryPrice = null, leverage = 10, stopLoss = null, takeProfit = null) {
    const side_upper = side.toUpperCase();
    const isLong = side_upper === 'LONG';
    const quantityStr = parseFloat(quantity).toFixed(3);

    // Set leverage first
    await this.setLeverage(symbol, leverage);

    if (this.config.mode === 'paper') {
      const pnl = isLong ? (Math.random() - 0.3) * 500 : (Math.random() - 0.7) * 500;
      return {
        orderId: `FUTURE-DEMO-${Date.now()}`,
        symbol: symbol.toUpperCase(),
        side: side_upper,
        type: entryPrice ? 'LIMIT' : 'MARKET',
        quantity: quantityStr,
        leverage,
        entryPrice: entryPrice || (this.priceCache.get(symbol.toUpperCase())?.price || 100),
        status: 'OPEN',
        stopLoss,
        takeProfit,
        mode: 'paper',
        unrealizedPnL: 0,
        createdAt: new Date().toISOString(),
      };
    }

    try {
      // Place main order
      const params = {
        symbol: symbol.toUpperCase(),
        side: isLong ? 'BUY' : 'SELL',
        type: entryPrice ? 'LIMIT' : 'MARKET',
        quantity: quantityStr,
        reduceOnly: false,
      };

      if (entryPrice) params.price = parseFloat(entryPrice).toFixed(8);
      const order = await this._futuresRequest('POST', '/fapi/v1/order', params);

      // Place stop-loss if provided
      if (stopLoss) {
        const slSide = isLong ? 'SELL' : 'BUY';
        await this._futuresRequest('POST', '/fapi/v1/order', {
          symbol: symbol.toUpperCase(),
          side: slSide,
          type: 'STOP_MARKET',
          quantity: quantityStr,
          stopPrice: parseFloat(stopLoss).toFixed(8),
          reduceOnly: true,
        });
      }

      // Place take-profit if provided
      if (takeProfit) {
        const tpSide = isLong ? 'SELL' : 'BUY';
        await this._futuresRequest('POST', '/fapi/v1/order', {
          symbol: symbol.toUpperCase(),
          side: tpSide,
          type: 'TAKE_PROFIT_MARKET',
          quantity: quantityStr,
          stopPrice: parseFloat(takeProfit).toFixed(8),
          reduceOnly: true,
        });
      }

      return {
        orderId: order.orderId,
        symbol: order.symbol,
        side: order.side,
        status: order.status,
        quantity: order.origQty,
        leverage,
        mode: 'live',
      };
    } catch (e) {
      console.error(`❌ Futures order failed: ${e.message}`);
      return { error: e.message };
    }
  }

  // ── Close Futures Position ────────────────────────────────
  async closePosition(symbol, quantity = null) {
    const positions = await this.getFuturesPositions();
    const pos = positions.find(p => p.symbol === symbol.toUpperCase());

    if (!pos) return { error: 'No open position found' };

    const closeQty = quantity || pos.quantity;
    const closeSide = pos.side === 'LONG' ? 'SELL' : 'BUY';

    if (this.config.mode === 'paper') {
      return {
        orderId: `CLOSE-${Date.now()}`,
        symbol: pos.symbol,
        closedQty: closeQty,
        realizedPnL: pos.unrealizedPnL,
        status: 'CLOSED',
        mode: 'paper',
      };
    }

    try {
      const order = await this._futuresRequest('POST', '/fapi/v1/order', {
        symbol: symbol.toUpperCase(),
        side: closeSide,
        type: 'MARKET',
        quantity: parseFloat(closeQty).toFixed(3),
        reduceOnly: true,
      });
      return {
        orderId: order.orderId,
        symbol: order.symbol,
        status: order.status,
        mode: 'live',
      };
    } catch (e) {
      return { error: e.message };
    }
  }

  // ── Get Futures Positions ────────────────────────────────
  async getFuturesPositions() {
    if (this.config.mode === 'paper') return this._paperPositions || [];

    if (!this.config.apiKey) return [];

    try {
      const data = await this._futuresRequest('GET', '/fapi/v2/positionRisk');
      return data
        .filter(p => parseFloat(p.positionAmt) !== 0)
        .map(p => ({
          symbol: p.symbol,
          side: parseFloat(p.positionAmt) > 0 ? 'LONG' : 'SHORT',
          quantity: Math.abs(parseFloat(p.positionAmt)),
          entryPrice: parseFloat(p.entryPrice),
          markPrice: parseFloat(p.markPrice),
          unrealizedPnL: parseFloat(p.unRealizedProfit),
          leverage: parseInt(p.leverage),
          liquidationPrice: parseFloat(p.liquidationPrice),
          margin: parseFloat(p.isolatedMargin || p.maintMargin),
          roe: parseFloat(p.roe), // Return on Equity
        }));
    } catch { return []; }
  }

  // ── Funding Rate ───────────────────────────────────────
  async getFundingRate(symbol) {
    if (this.fundingRates.has(symbol.toUpperCase())) {
      return this.fundingRates.get(symbol.toUpperCase());
    }
    try {
      const data = await this._futuresRequest('GET', '/fapi/v1/premiumIndex', { symbol: symbol.toUpperCase() });
      const rate = {
        symbol: data.symbol,
        fundingRate: parseFloat(data.lastFundingRate) * 100,
        nextFundingTime: new Date(data.nextFundingTime).toISOString(),
        markPrice: parseFloat(data.markPrice),
        indexPrice: parseFloat(data.indexPrice),
      };
      this.fundingRates.set(symbol.toUpperCase(), rate);
      return rate;
    } catch { return null; }
  }

  // ── Long/Short Ratio ───────────────────────────────────
  async getLongShortRatio(symbol) {
    try {
      const data = await this._futuresRequest('GET', '/fapi/futuresData/topLongShortPositionRatio', {
        symbol: symbol.toUpperCase(),
        period: '1h',
        limit: 1,
      });
      if (data?.length > 0) {
        const r = data[data.length - 1];
        const ratio = { symbol: symbol.toUpperCase(), longShortRatio: parseFloat(r.longShortRatio), timestamp: r.updateTime };
        this.longShortRatio.set(symbol.toUpperCase(), ratio);
        return ratio;
      }
    } catch {}
    return null;
  }

  // ── Taker Long/Short ───────────────────────────────────
  async getTakerLongShort(symbol) {
    try {
      const data = await this._futuresRequest('GET', '/fapi/futuresData/topLongShortAccountRatio', {
        symbol: symbol.toUpperCase(),
        period: '1h',
        limit: 1,
      });
      if (data?.length > 0) {
        const r = data[data.length - 1];
        return {
          symbol: symbol.toUpperCase(),
          takerLongRatio: parseFloat(r.longAccount),
          takerShortRatio: parseFloat(r.shortAccount),
          timestamp: r.updateTime,
        };
      }
    } catch {}
    return null;
  }

  // ── Open Interest ─────────────────────────────────────
  async getOpenInterest(symbol) {
    try {
      const data = await this._futuresRequest('GET', '/fapi/volumefuturesData/openInterest', {
        symbol: symbol.toUpperCase(),
      });
      return {
        symbol: data.symbol,
        openInterest: parseFloat(data.openInterest),
        pair: data.pair,
      };
    } catch { return null; }
  }

  // ── Liquidations ───────────────────────────────────────
  async getRecentLiquidations(symbol = null, limit = 50) {
    // Note: Binance doesn't have a public API for liquidations
    // This would need a third-party provider like Glassnode or Coinglass
    return [];
  }

  // ── Futures Health ─────────────────────────────────────
  getFuturesHealth() {
    return {
      connected: this.isConnected,
      exchange: 'Binance Futures',
      mode: this.config.mode,
      leverageSupported: '1x-125x',
      orderTypes: ['MARKET', 'LIMIT', 'STOP', 'STOP_MARKET', 'TAKE_PROFIT', 'TAKE_PROFIT_MARKET'],
    };
  }
}

module.exports = BinanceFutures;
