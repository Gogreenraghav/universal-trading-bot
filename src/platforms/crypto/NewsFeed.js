/**
 * Crypto News Feed — Aggregates news from multiple crypto sources
 * Sources: CoinGecko, CryptoCompare, Reddit, Twitter sentiment
 */
const EventEmitter = require('events');
const https = require('https');

class CryptoNewsFeed extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      apiKey: config.apiKey || process.env.CRYPTOCompare_KEY || '',
      coinGeckoKey: config.coinGeckoKey || '',
      pollInterval: config.pollInterval || 60000, // 1 minute
      sentimentEnabled: config.sentimentEnabled ?? true,
      ...config,
    };

    this.news = [];
    this.sentiment = new Map(); // symbol -> score
    this.trending = [];
    this.fearGreedIndex = null;
    this.pollTimer = null;
    this.maxNewsItems = 100;
    this.initialized = false;

    console.log(`📰 Crypto News Feed initialized`);
    console.log(`   Poll interval: ${this.config.pollInterval / 1000}s`);
    console.log(`   Sentiment analysis: ${this.config.sentimentEnabled ? '✅' : '❌'}`);
  }

  _fetch(url) {
    return new Promise((resolve, reject) => {
      const req = https.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch { resolve([]); }
        });
      });
      req.on('error', reject);
      req.setTimeout(8000, () => { req.destroy(); resolve([]); });
    });
  }

  // ── Initialize ──────────────────────────────────────────
  async initialize() {
    console.log(`📰 Fetching initial crypto news...`);
    await Promise.allSettled([
      this.fetchCryptoCompareNews(),
      this.fetchTrendingCoins(),
      this.fetchFearGreedIndex(),
      this.analyzeTopCoinsSentiment(),
    ]);
    this.startPolling();
    this.initialized = true;
    console.log(`✅ Crypto news feed initialized — ${this.news.length} articles loaded`);
    return { news: this.news.length, trending: this.trending.length };
  }

  // ── Poll for new news ────────────────────────────────────
  startPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(async () => {
      try {
        await Promise.allSettled([
          this.fetchCryptoCompareNews(),
          this.fetchTrendingCoins(),
          this.fetchFearGreedIndex(),
        ]);
        this.emit('update', { news: this.news, trending: this.trending });
      } catch (e) {
        console.error('📰 News poll error:', e.message);
      }
    }, this.config.pollInterval);
  }

  // ── CryptoCompare News ───────────────────────────────────
  async fetchCryptoCompareNews() {
    try {
      let url = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN';
      if (this.config.apiKey) {
        url = `https://min-api.cryptocompare.com/data/v2/news/?lang=EN&api_key=${this.config.apiKey}`;
      }
      const data = await this._fetch(url);
      if (data?.Data) {
        const articles = data.Data.slice(0, 30).map(n => ({
          id: n.id,
          title: n.title,
          body: n.body?.slice(0, 300) || '',
          url: n.url,
          source: n.source,
          image: n.image,
          categories: n.categories || '',
          published_at: new Date(n.published_on * 1000).toISOString(),
          symbols: n.categories?.split('|').filter(s => s.length > 0 && s.length < 10) || [],
          sentiment: this._analyzeSentiment(n.title + ' ' + (n.body || '')),
          coins: n.coinlist?.split(';') || [],
        }));
        this.news = [...articles, ...this.news].slice(0, this.maxNewsItems);
        this._emitBreaking(articles);
      }
    } catch (e) {
      // Silently fail - news is non-critical
    }
  }

  // ── Trending Coins ─────────────────────────────────────
  async fetchTrendingCoins() {
    try {
      const data = await this._fetch('https://api.coingecko.com/api/v3/search/trending');
      if (data?.coins) {
        this.trending = data.coins.slice(0, 10).map(c => ({
          symbol: c.item?.symbol?.toUpperCase(),
          name: c.item?.name,
          marketCapRank: c.item?.market_cap_rank,
          score: c.item?.score,
          price: c.item?.thumb?.includes('price') ? null : c.item?.data?.price,
          image: c.item?.large,
          sparkline: c.item?.sparkline_in_7d?.price,
        }));
      }
    } catch (e) {}
  }

  // ── Fear & Greed Index ─────────────────────────────────
  async fetchFearGreedIndex() {
    try {
      const data = await this._fetch('https://api.alternative.me/fng/?limit=1');
      if (data?.data?.[0]) {
        this.fearGreedIndex = {
          value: parseInt(data.data[0].fng_value),
          classification: data.data[0].fng_classification,
          timestamp: data.data[0].time_until_update,
        };
        this.emit('fearGreed', this.fearGreedIndex);
      }
    } catch (e) {}
  }

  // ── Coin Sentiment ──────────────────────────────────────
  async analyzeTopCoinsSentiment() {
    const coins = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'DOT'];
    for (const symbol of coins) {
      await this.getCoinSentiment(symbol);
    }
  }

  async getCoinSentiment(symbol) {
    try {
      const data = await this._fetch(`https://min-api.cryptocompare.com/data/coins/${symbol}/social/stats`);
      if (data?.Data) {
        const stats = data.Data;
        const score = this._calculateSentimentScore(stats);
        this.sentiment.set(symbol, {
          score,
          followers: stats.Twitter?.followers || 0,
          redditSubscribers: stats.Reddit?.subscribers || 0,
          twitterfollowers: stats.Twitter?.followers || 0,
          facebookLikes: stats.Facebook?.likes || 0,
        });
      }
    } catch (e) {}
    return this.sentiment.get(symbol) || { score: 50 };
  }

  _calculateSentimentScore(stats) {
    // Simplified sentiment calculation
    let score = 50;
    const tw = stats.Twitter || {};
    if (tw.followers > 1000000) score += 20;
    else if (tw.followers > 100000) score += 10;
    if (tw.Posts_24h > 1000) score += 15;
    return Math.min(100, Math.max(0, score));
  }

  // ── Sentiment Analysis ─────────────────────────────────
  _analyzeSentiment(text) {
    const pos = ['moon', 'surge', 'pump', 'bull', 'growth', 'gain', 'rally', 'soar', 'high', 'up', 'adopt', 'partnership', 'launch', 'upgrade', 'breakout', 'all-time'];
    const neg = ['crash', 'dump', 'drop', 'bear', 'hack', 'ban', 'scam', 'fall', 'down', 'warn', 'risk', 'fear', 'sell', 'loss', 'liquidation', 'regulation'];
    const words = text.toLowerCase().split(/\s+/);
    let score = 50;
    words.forEach(w => {
      if (pos.includes(w)) score += 2;
      if (neg.includes(w)) score -= 2;
    });
    return Math.min(100, Math.max(0, score));
  }

  _emitBreaking(articles) {
    articles.slice(0, 3).forEach(a => {
      if (a.sentiment > 70 || a.sentiment < 30) {
        this.emit('breaking', a);
      }
    });
  }

  // ── Get Methods ────────────────────────────────────────
  getNews(category = null, limit = 20) {
    let items = this.news;
    if (category) {
      items = items.filter(n => n.categories?.toLowerCase().includes(category.toLowerCase()));
    }
    return items.slice(0, limit);
  }

  getNewsBySymbol(symbol, limit = 10) {
    return this.news.filter(n =>
      n.symbols?.map(s => s.toUpperCase()).includes(symbol.toUpperCase())
    ).slice(0, limit);
  }

  getSentiment(symbol) {
    return this.sentiment.get(symbol.toUpperCase()) || { score: 50 };
  }

  getAllSentiments() {
    return Object.fromEntries(this.sentiment);
  }

  getTrending() { return this.trending; }
  getFearGreed() { return this.fearGreedIndex; }

  getMarketSentiment() {
    if (!this.fearGreedIndex) return 'neutral';
    const v = this.fearGreedIndex.value;
    if (v >= 75) return 'extreme_greed';
    if (v >= 60) return 'greed';
    if (v >= 40) return 'neutral';
    if (v >= 25) return 'fear';
    return 'extreme_fear';
  }

  // ── Filter Signals by News ─────────────────────────────
  async filterByNews(symbol, signal) {
    const news = this.getNewsBySymbol(symbol, 5);
    const sentiment = this.getSentiment(symbol);
    const fearGreed = this.getFearGreedIndex?.value || 50;

    // Reduce conviction if sentiment contradicts signal
    let convictionMod = 1.0;
    if (signal.action === 'BUY' && sentiment.score < 35) convictionMod *= 0.7;
    if (signal.action === 'SELL' && sentiment.score > 65) convictionMod *= 0.7;
    if (fearGreed < 25 && signal.action === 'BUY') convictionMod *= 0.8; // Don't buy in extreme fear
    if (fearGreed > 75 && signal.action === 'SELL') convictionMod *= 0.8; // Don't sell in extreme greed

    // News headline check
    const relevantNews = news[0];
    if (relevantNews) {
      signal.newsHeadline = relevantNews.title;
      signal.newsSentiment = relevantNews.sentiment;
    }

    return { ...signal, conviction: (signal.conviction || 0.7) * convictionMod };
  }

  // ── Cleanup ─────────────────────────────────────────────
  destroy() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    console.log('🧹 Crypto news feed destroyed');
  }
}

module.exports = CryptoNewsFeed;
