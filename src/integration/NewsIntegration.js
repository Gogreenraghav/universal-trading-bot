    for (const keyword of mediumImpactKeywords) {
      if (text.includes(keyword)) return 'medium';
    }
    
    // Check source credibility
    const credibleSources = ['coindesk', 'cointelegraph', 'bloomberg', 'reuters', 'financial times'];
    for (const source of credibleSources) {
      if (article.sourceName && article.sourceName.toLowerCase().includes(source)) {
        return 'medium';
      }
    }
    
    return 'low';
  }
  
  /**
   * Update statistics
   */
  updateStatistics(articles) {
    this.state.stats.totalArticles = articles.length;
    this.state.stats.positiveArticles = articles.filter(a => a.sentiment > 0.3).length;
    this.state.stats.negativeArticles = articles.filter(a => a.sentiment < -0.3).length;
    this.state.stats.neutralArticles = articles.filter(a => a.sentiment >= -0.3 && a.sentiment <= 0.3).length;
  }
  
  /**
   * Calculate overall sentiment
   */
  calculateOverallSentiment(articles) {
    if (articles.length === 0) {
      this.newsCache.overallSentiment = 0;
      return;
    }
    
    // Weighted average by impact
    const impactWeights = { high: 3, medium: 2, low: 1 };
    let totalWeight = 0;
    let weightedSum = 0;
    
    articles.forEach(article => {
      const weight = impactWeights[article.impact] || 1;
      weightedSum += article.sentiment * weight;
      totalWeight += weight;
    });
    
    this.newsCache.overallSentiment = weightedSum / totalWeight;
  }
  
  /**
   * Categorize articles
   */
  categorizeArticles(articles) {
    this.newsCache.byCategory.clear();
    this.newsCache.bySentiment.clear();
    
    articles.forEach(article => {
      // By category
      if (!this.newsCache.byCategory.has(article.category)) {
        this.newsCache.byCategory.set(article.category, []);
      }
      this.newsCache.byCategory.get(article.category).push(article);
      
      // By sentiment
      let sentimentCategory;
      if (article.sentiment > 0.3) {
        sentimentCategory = 'positive';
      } else if (article.sentiment < -0.3) {
        sentimentCategory = 'negative';
      } else {
        sentimentCategory = 'neutral';
      }
      
      if (!this.newsCache.bySentiment.has(sentimentCategory)) {
        this.newsCache.bySentiment.set(sentimentCategory, []);
      }
      this.newsCache.bySentiment.get(sentimentCategory).push(article);
    });
  }
  
  /**
   * Get news summary for dashboard
   */
  getNewsSummary() {
    return {
      latest: this.newsCache.latest.slice(0, 10).map(article => ({
        title: article.title,
        source: article.sourceName,
        time: this.formatTimeAgo(article.publishedAt),
        sentiment: article.sentiment,
        impact: article.impact,
        category: article.category,
        url: article.url
      })),
      overallSentiment: this.newsCache.overallSentiment,
      statistics: this.state.stats,
      lastUpdate: this.newsCache.lastUpdate,
      categories: Array.from(this.newsCache.byCategory.entries()).map(([category, articles]) => ({
        category,
        count: articles.length,
        avgSentiment: articles.reduce((sum, a) => sum + a.sentiment, 0) / articles.length
      })),
      sentimentBreakdown: {
        positive: this.newsCache.bySentiment.get('positive')?.length || 0,
        negative: this.newsCache.bySentiment.get('negative')?.length || 0,
        neutral: this.newsCache.bySentiment.get('neutral')?.length || 0
      }
    };
  }
  
  /**
   * Format time ago
   */
  formatTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }
  
  /**
   * Start periodic news updates
   */
  startPeriodicUpdates() {
    // Initial update
    this.fetchAllNews().catch(error => {
      console.error('Initial news fetch failed:', error.message);
    });
    
    // Periodic updates
    this.updateInterval = setInterval(() => {
      this.fetchAllNews().catch(error => {
        console.error('Periodic news fetch failed:', error.message);
      });
    }, this.config.updateInterval);
    
    console.log(`🔄 News updates scheduled every ${this.config.updateInterval / 60000} minutes`);
  }
  
  /**
   * Get news-based trading signals
   */
  getTradingSignals() {
    const signals = [];
    const recentNews = this.newsCache.latest.filter(
      article => Date.now() - article.publishedAt < 3600000 // Last hour
    );
    
    if (recentNews.length === 0) {
      return signals;
    }
    
    // Calculate average sentiment of recent news
    const avgSentiment = recentNews.reduce((sum, article) => sum + article.sentiment, 0) / recentNews.length;
    
    // Generate signals based on sentiment
    if (avgSentiment > 0.7) {
      signals.push({
        type: 'strong_buy',
        confidence: 0.8,
        reason: `Very positive news sentiment (${avgSentiment.toFixed(2)})`,
        articles: recentNews.filter(a => a.sentiment > 0.5).slice(0, 3)
      });
    } else if (avgSentiment > 0.3) {
      signals.push({
        type: 'buy',
        confidence: 0.6,
        reason: `Positive news sentiment (${avgSentiment.toFixed(2)})`,
        articles: recentNews.filter(a => a.sentiment > 0.2).slice(0, 2)
      });
    } else if (avgSentiment < -0.7) {
      signals.push({
        type: 'strong_sell',
        confidence: 0.8,
        reason: `Very negative news sentiment (${avgSentiment.toFixed(2)})`,
        articles: recentNews.filter(a => a.sentiment < -0.5).slice(0, 3)
      });
    } else if (avgSentiment < -0.3) {
      signals.push({
        type: 'sell',
        confidence: 0.6,
        reason: `Negative news sentiment (${avgSentiment.toFixed(2)})`,
        articles: recentNews.filter(a => a.sentiment < -0.2).slice(0, 2)
      });
    }
    
    // Check for high-impact news
    const highImpactNews = recentNews.filter(article => article.impact === 'high');
    if (highImpactNews.length > 0) {
      signals.push({
        type: 'high_impact_alert',
        confidence: 0.9,
        reason: `${highImpactNews.length} high-impact news articles`,
        articles: highImpactNews.slice(0, 3)
      });
    }
    
    return signals;
  }
  
  /**
   * Search news by keyword
   */
  searchNews(keyword, limit = 10) {
    const lowerKeyword = keyword.toLowerCase();
    
    return this.newsCache.latest
      .filter(article => {
        const text = `${article.title} ${article.description || ''} ${article.content || ''}`.toLowerCase();
        return text.includes(lowerKeyword);
      })
      .slice(0, limit)
      .map(article => ({
        title: article.title,
        source: article.sourceName,
        time: this.formatTimeAgo(article.publishedAt),
        sentiment: article.sentiment,
        snippet: this.getSnippet(article, keyword),
        url: article.url
      }));
  }
  
  /**
   * Get snippet with keyword highlighted
   */
  getSnippet(article, keyword) {
    const text = `${article.title}. ${article.description || ''}`;
    const lowerText = text.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();
    
    const index = lowerText.indexOf(lowerKeyword);
    if (index === -1) {
      return text.substring(0, 100) + '...';
    }
    
    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + keyword.length + 50);
    
    let snippet = text.substring(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    
    return snippet;
  }
  
  /**
   * Get news for specific category
   */
  getNewsByCategory(category, limit = 10) {
    const articles = this.newsCache.byCategory.get(category) || [];
    return articles.slice(0, limit).map(article => ({
      title: article.title,
      source: article.sourceName,
      time: this.formatTimeAgo(article.publishedAt),
      sentiment: article.sentiment,
      impact: article.impact,
      url: article.url
    }));
  }
  
  /**
   * Get sentiment trend over time
   */
  getSentimentTrend(hours = 24) {
    const now = Date.now();
    const cutoff = now - (hours * 3600000);
    
    const recentArticles = this.newsCache.latest.filter(
      article => article.publishedAt.getTime() > cutoff
    );
    
    if (recentArticles.length === 0) {
      return { trend: 'stable', change: 0, data: [] };
    }
    
    // Group by hour
    const hourlyData = {};
    recentArticles.forEach(article => {
      const hour = new Date(article.publishedAt).getHours();
      if (!hourlyData[hour]) {
        hourlyData[hour] = { sum: 0, count: 0 };
      }
      hourlyData[hour].sum += article.sentiment;
      hourlyData[hour].count += 1;
    });
    
    // Calculate trend
    const hoursArray = Object.keys(hourlyData).map(Number).sort((a, b) => a - b);
    if (hoursArray.length < 2) {
      return { trend: 'stable', change: 0, data: [] };
    }
    
    const firstHour = hoursArray[0];
    const lastHour = hoursArray[hoursArray.length - 1];
    const firstAvg = hourlyData[firstHour].sum / hourlyData[firstHour].count;
    const lastAvg = hourlyData[lastHour].sum / hourlyData[lastHour].count;
    const change = lastAvg - firstAvg;
    
    let trend = 'stable';
    if (change > 0.2) trend = 'improving';
    else if (change < -0.2) trend = 'deteriorating';
    
    // Prepare data for chart
    const data = hoursArray.map(hour => ({
      hour,
      sentiment: hourlyData[hour].sum / hourlyData[hour].count,
      count: hourlyData[hour].count
    }));
    
    return { trend, change, data };
  }
  
  /**
   * Stop news integration
   */
  async stop() {
    console.log('🛑 Stopping News Integration...');
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.state.connected = false;
    
    console.log('✅ News Integration stopped');
  }
}

module.exports = NewsIntegration;