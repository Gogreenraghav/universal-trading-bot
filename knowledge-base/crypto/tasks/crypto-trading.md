# Task: Crypto News-Based Trading

## Objective
Monitor cryptocurrency news and execute trades automatically based on sentiment analysis and market conditions.

## Platform: Cryptocurrency
- **Market Type:** Decentralized, 24/7 trading
- **Volatility:** High (5% typical daily moves)
- **Risk Profile:** High
- **Trading Hours:** 24/7

## Data Sources
### Primary Sources
1. **NewsAPI** - General crypto news
2. **CryptoPanic** - Aggregated crypto news with sentiment
3. **CoinDesk** - Professional crypto journalism
4. **Cointelegraph** - Market analysis and news

### Market Data Sources
1. **Binance API** - Real-time prices, order books
2. **CoinGecko** - Market caps, volumes, trends
3. **Glassnode** - On-chain analytics
4. **Santiment** - Social sentiment data

## Analysis Steps

### Step 1: News Monitoring (Every 5 minutes)
1. Fetch latest crypto news from all sources
2. Filter for relevance (keywords: Bitcoin, Ethereum, regulation, adoption, hack, partnership)
3. Analyze sentiment using AI model
4. Score sentiment from -1.0 (very negative) to +1.0 (very positive)

### Step 2: Market Condition Check
1. Check Bitcoin dominance (> 50% = market leader influence)
2. Check total market cap trend (up/down/sideways)
3. Check volatility index (high/low)
4. Check trading volume (increasing/decreasing)

### Step 3: Trading Decision Matrix

#### BUY Conditions (ALL must be true):
1. **Sentiment Score:** > +0.7 (70% positive)
2. **Bitcoin Price:** Above 200-day moving average
3. **Market Trend:** Uptrend confirmed (higher highs, higher lows)
4. **Volume:** Increasing volume on up days
5. **Risk Check:** Within daily loss limits

#### SELL Conditions (ANY can trigger):
1. **Sentiment Score:** < -0.6 (60% negative)
2. **Stop Loss Hit:** -5% from entry price
3. **Take Profit Hit:** +15% from entry price
4. **Market Reversal:** Trend change confirmed
5. **Risk Limit:** Daily loss limit reached

### Step 4: Order Execution
#### For BUY Signals:
1. **Position Size:** 2% of portfolio maximum
2. **Order Type:** Limit order at current price
3. **Stop Loss:** -5% from entry
4. **Take Profit:** +15% from entry
5. **Time in Force:** Good Till Cancelled (GTC)

#### For SELL Signals:
1. **Close Position:** 100% of position
2. **Order Type:** Market order for immediate execution
3. **Reason:** Document reason for sell (sentiment, stop loss, take profit)

## Risk Management Rules

### Position Sizing
- **Maximum per trade:** 2% of total portfolio
- **Maximum daily loss:** 10% of portfolio
- **Maximum open positions:** 5 positions
- **Minimum trade value:** $100 equivalent

### Stop Loss Rules
- **Initial Stop Loss:** 5% below entry
- **Trailing Stop:** Activate after +10% profit, trail at 5%
- **Breakeven Stop:** Move to breakeven after +8% profit

### Take Profit Rules
- **Primary Target:** 15% profit
- **Secondary Target:** 25% profit (scale out 50% at 15%, 50% at 25%)
- **Time-based Exit:** Close after 7 days if no target hit

### Market Condition Adjustments
#### High Volatility (> 10% daily move):
- Reduce position size by 50%
- Widen stop loss to 8%
- Increase take profit to 20%

#### Low Volatility (< 2% daily move):
- Normal position sizing
- Normal stop loss (5%)
- Normal take profit (15%)

## Portfolio Allocation

### Asset Classes
1. **Blue-chip (60%):** Bitcoin, Ethereum
2. **Large-cap (20%):** BNB, SOL, XRP
3. **Mid-cap (10%):** ADA, DOT, MATIC
4. **Small-cap (10%):** High-conviction altcoins

### Rebalancing Rules
1. **Weekly rebalance:** Every Sunday 00:00 UTC
2. **Deviation trigger:** If any asset class moves ±5% from target
3. **Profit taking:** Take 50% profits when asset doubles in value

## News Event Handling

### Major Events (High Impact)
1. **Bitcoin Halving:** Accumulate 3 months before, hold 6 months after
2. **ETF Approval:** Buy on rumor, sell on news
3. **Regulatory Announcements:** Avoid trading 1 hour before/after
4. **Exchange Hacks:** Sell affected tokens immediately

### Scheduled Events
1. **FOMC Meetings:** Reduce position size day before
2. **CPI Data Releases:** Avoid trading during release
3. **Coinbase Earnings:** Monitor for market sentiment

## Performance Metrics to Track

### Trading Metrics
- Win rate (target: > 55%)
- Average win/loss ratio (target: > 2:1)
- Maximum drawdown (limit: < 20%)
- Sharpe ratio (target: > 1.5)
- Total return (target: > 30% annually)

### Risk Metrics
- Value at Risk (VaR) 95% (limit: < 5% daily)
- Conditional VaR (CVaR) (limit: < 8% daily)
- Sortino ratio (target: > 2.0)
- Calmar ratio (target: > 1.0)

## Learning and Adaptation

### Pattern Recognition
1. **Successful patterns:** Document and reinforce
2. **Failed patterns:** Document and avoid
3. **Market regime detection:** Adjust strategies for bull/bear/sideways markets

### Continuous Improvement
1. **Weekly review:** Analyze all trades
2. **Monthly optimization:** Adjust parameters based on performance
3. **Quarterly strategy review:** Add/remove strategies based on results

## Emergency Procedures

### Market Crash (> 20% drop in 24 hours)
1. Close all positions immediately
2. Move to 100% stablecoins (USDT, USDC)
3. Wait for market stabilization (> 3 days of sideways movement)
4. Gradually re-enter with 50% reduced position sizes

### Exchange Issues
1. If Binance has issues, switch to Coinbase/Kraken
2. If all exchanges have issues, pause trading
3. Monitor exchange status pages

### API Failures
1. Retry 3 times with exponential backoff
2. If persistent, switch to backup data source
3. Log all failures for analysis

## Compliance and Reporting

### Daily Reports
1. Trade summary (wins/losses, P&L)
2. Risk exposure report
3. News sentiment summary
4. Market condition update

### Weekly Reports
1. Performance vs benchmarks
2. Strategy effectiveness
3. Risk metrics review
4. Learning insights

### Monthly Reports
1. Comprehensive performance analysis
2. Strategy optimization recommendations
3. Market outlook
4. System health check

---

## Knowledge Base Updates

This document should be updated:
1. **Weekly:** With new patterns learned
2. **Monthly:** With strategy adjustments
3. **Quarterly:** With major market changes
4. **Annually:** With complete strategy review

Last Updated: April 3, 2026
Next Review: April 10, 2026