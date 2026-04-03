/**
 * Knowledge Base Manager
 * Intelligent system for reading, writing, and learning from task instructions
 */

const fs = require('fs').promises;
const path = require('path');
const natural = require('natural');

class KnowledgeBaseManager {
  constructor(config) {
    this.config = {
      basePath: config.basePath || path.join(__dirname, '../../../knowledge-base'),
      platforms: config.platforms || ['crypto', 'forex', 'stocks'],
      learningEnabled: config.learningEnabled !== false,
      updateFrequency: config.updateFrequency || 3600000, // 1 hour
      ...config
    };
    
    // Knowledge storage
    this.knowledge = {
      tasks: new Map(),
      patterns: new Map(),
      strategies: new Map(),
      rules: new Map(),
      learnings: []
    };
    
    // NLP tools
    this.nlp = {
      tokenizer: new natural.WordTokenizer(),
      stemmer: natural.PorterStemmer,
      tfidf: new natural.TfIdf(),
      sentiment: new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn')
    };
    
    // Learning system
    this.learning = {
      memory: new Map(),
      insights: [],
      patterns: new Map(),
      lastLearning: null,
      learningRate: 0.1
    };
    
    // State
    this.state = {
      initialized: false,
      lastUpdate: null,
      platformKnowledge: {},
      stats: {
        tasksLoaded: 0,
        patternsLoaded: 0,
        strategiesLoaded: 0,
        learningsRecorded: 0
      }
    };
    
    console.log('🧠 Knowledge Base Manager initialized');
  }
  
  /**
   * Initialize knowledge base
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Knowledge Base...');
      
      // Create knowledge base directory if it doesn't exist
      await this.ensureDirectoryExists(this.config.basePath);
      
      // Load knowledge for all platforms
      await this.loadAllPlatformKnowledge();
      
      // Initialize learning system
      await this.initializeLearningSystem();
      
      // Build search index
      await this.buildSearchIndex();
      
      this.state.initialized = true;
      this.state.lastUpdate = Date.now();
      
      console.log('✅ Knowledge Base initialized successfully');
      console.log(`📚 Tasks: ${this.state.stats.tasksLoaded}`);
      console.log(`🎯 Patterns: ${this.state.stats.patternsLoaded}`);
      console.log(`📈 Strategies: ${this.state.stats.strategiesLoaded}`);
      console.log(`🧠 Learnings: ${this.state.stats.learningsRecorded}`);
      
      return { success: true, stats: this.state.stats };
      
    } catch (error) {
      console.error('❌ Failed to initialize knowledge base:', error);
      throw error;
    }
  }
  
  /**
   * Ensure directory exists
   */
  async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`📁 Created directory: ${dirPath}`);
    }
  }
  
  /**
   * Load knowledge for all platforms
   */
  async loadAllPlatformKnowledge() {
    for (const platform of this.config.platforms) {
      await this.loadPlatformKnowledge(platform);
    }
  }
  
  /**
   * Load knowledge for a specific platform
   */
  async loadPlatformKnowledge(platform) {
    const platformPath = path.join(this.config.basePath, platform);
    
    try {
      await fs.access(platformPath);
    } catch {
      console.log(`📁 Platform ${platform} directory doesn't exist, creating...`);
      await this.createPlatformStructure(platform);
      return;
    }
    
    console.log(`📚 Loading ${platform} knowledge...`);
    
    // Load tasks
    await this.loadTasks(platform);
    
    // Load patterns
    await this.loadPatterns(platform);
    
    // Load strategies
    await this.loadStrategies(platform);
    
    // Load rules
    await this.loadRules(platform);
    
    console.log(`✅ ${platform} knowledge loaded`);
  }
  
  /**
   * Create platform directory structure
   */
  async createPlatformStructure(platform) {
    const structure = {
      tasks: [
        `${platform}-trading.md`,
        `${platform}-risk-management.md`,
        `${platform}-news-analysis.md`
      ],
      patterns: [
        `${platform}-market-patterns.md`,
        `${platform}-technical-patterns.md`
      ],
      strategies: [
        `${platform}-trading-strategies.md`,
        `${platform}-arbitrage-strategies.md`
      ],
      rules: [
        `${platform}-trading-rules.md`,
        `${platform}-risk-rules.md`
      ]
    };
    
    const platformPath = path.join(this.config.basePath, platform);
    await this.ensureDirectoryExists(platformPath);
    
    // Create subdirectories
    for (const [category, files] of Object.entries(structure)) {
      const categoryPath = path.join(platformPath, category);
      await this.ensureDirectoryExists(categoryPath);
      
      // Create template files
      for (const file of files) {
        const filePath = path.join(categoryPath, file);
        const template = this.getTemplate(category, platform, file);
        await fs.writeFile(filePath, template, 'utf8');
        console.log(`📄 Created: ${filePath}`);
      }
    }
  }
  
  /**
   * Get template for knowledge file
   */
  getTemplate(category, platform, filename) {
    const templates = {
      tasks: {
        [`${platform}-trading.md`]: `# Task: ${this.capitalize(platform)} Trading\n\n## Objective\nAutomated trading for ${platform} markets\n\n## Platform: ${this.capitalize(platform)}\n- **Market Type:** [Describe market type]\n- **Volatility:** [High/Medium/Low]\n- **Risk Profile:** [High/Medium/Low]\n- **Trading Hours:** [Specify hours]\n\n## Data Sources\n1. [Source 1]\n2. [Source 2]\n3. [Source 3]\n\n## Analysis Steps\n1. Step 1\n2. Step 2\n3. Step 3\n\n## Risk Management\n- Max position size: 2%\n- Stop loss: 5%\n- Take profit: 15%\n\n## Performance Tracking\n- Win rate target: > 55%\n- Risk/reward target: > 2:1\n- Max drawdown: < 20%\n\nLast Updated: ${new Date().toISOString().split('T')[0]}`,
        
        [`${platform}-risk-management.md`]: `# Risk Management: ${this.capitalize(platform)}\n\n## Risk Limits\n- Daily loss limit: 10%\n- Max open positions: 5\n- Position size limit: 2%\n- Leverage limit: [Specify]\n\n## Stop Loss Rules\n- Initial stop: 5%\n- Trailing stop: 3% after 10% profit\n- Breakeven stop: At 8% profit\n\n## Take Profit Rules\n- Primary target: 15%\n- Secondary target: 25%\n- Time exit: 7 days\n\n## Market Condition Adjustments\n### High Volatility:\n- Reduce position size by 50%\n- Widen stops to 8%\n- Increase targets to 20%\n\n### Low Volatility:\n- Normal sizing\n- Normal stops (5%)\n- Normal targets (15%)`
      },
      
      patterns: {
        [`${platform}-market-patterns.md`]: `# Market Patterns: ${this.capitalize(platform)}\n\n## Trend Patterns\n### Uptrend Pattern\n- Description: Higher highs, higher lows\n- Confidence: 70%\n- Trading Implication: Buy dips\n\n### Downtrend Pattern\n- Description: Lower highs, lower lows\n- Confidence: 70%\n- Trading Implication: Sell rallies\n\n## Reversal Patterns\n### Double Top/Bottom\n- Description: M-shaped/W-shaped formation\n- Confidence: 65%\n- Trading Implication: Reverse position\n\n## Consolidation Patterns\n### Triangle\n- Description: Converging price action\n- Confidence: 60%\n- Trading Implication: Wait for breakout`
      },
      
      strategies: {
        [`${platform}-trading-strategies.md`]: `# Trading Strategies: ${this.capitalize(platform)}\n\n## Trend Following\n- **Description:** Follow established trends\n- **Win Rate:** 55-65%\n- **Risk/Reward:** 1:2\n- **Holding Period:** Days to weeks\n- **Indicators:** Moving averages, MACD, ADX\n\n## Mean Reversion\n- **Description:** Trade deviations from mean\n- **Win Rate:** 60-70%\n- **Risk/Reward:** 1:1.5\n- **Holding Period:** Hours to days\n- **Indicators:** Bollinger Bands, RSI, Stochastic\n\n## Breakout Trading\n- **Description:** Trade breakouts from consolidation\n- **Win Rate:** 40-50%\n- **Risk/Reward:** 1:3\n- **Holding Period:** Minutes to hours\n- **Indicators:** Support/resistance, volume spikes`
      }
    };
    
    return templates[category]?.[filename] || `# ${filename}\n\nContent for ${category}/${filename}`;
  }
  
  /**
   * Capitalize string
   */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  /**
   * Load tasks for a platform
   */
  async loadTasks(platform) {
    const tasksPath = path.join(this.config.basePath, platform, 'tasks');
    
    try {
      const files = await fs.readdir(tasksPath);
      const taskFiles = files.filter(f => f.endsWith('.md'));
      
      for (const file of taskFiles) {
        const filePath = path.join(tasksPath, file);
        const content = await fs.readFile(filePath, 'utf8');
        
        const task = {
          platform,
          filename: file,
          content,
          parsed: this.parseTaskContent(content),
          metadata: this.extractMetadata(content),
          lastModified: await this.getFileModifiedTime(filePath)
        };
        
        const key = `${platform}:tasks:${file.replace('.md', '')}`;
        this.knowledge.tasks.set(key, task);
        this.state.stats.tasksLoaded++;
      }
      
      console.log(`📋 Loaded ${taskFiles.length} tasks for ${platform}`);
      
    } catch (error) {
      console.error(`Failed to load tasks for ${platform}:`, error.message);
    }
  }
  
  /**
   * Parse task content
   */
  parseTaskContent(content) {
    const lines = content.split('\n');
    const sections = {};
    let currentSection = null;
    
    for (const line of lines) {
      if (line.startsWith('## ')) {
        currentSection = line.substring(3).trim();
        sections[currentSection] = [];
      } else if (line.startsWith('### ')) {
        const subsection = line.substring(4).trim();
        if (!sections[currentSection]) {
          sections[currentSection] = {};
        }
        if (typeof sections[currentSection] === 'object') {
          sections[currentSection][subsection] = [];
        }
      } else if (currentSection && line.trim()) {
        if (typeof sections[currentSection] === 'object' && !Array.isArray(sections[currentSection])) {
          // Find last subsection
          const lastSubsection = Object.keys(sections[currentSection]).pop();
          sections[currentSection][lastSubsection].push(line.trim());
        } else if (Array.isArray(sections[currentSection])) {
          sections[currentSection].push(line.trim());
        }
      }
    }
    
    return sections;
  }
  
  /**
   * Extract metadata from content
   */
  extractMetadata(content) {
    const metadata = {
      hasRiskManagement: content.includes('Risk Management'),
      hasTradingRules: content.includes('Trading Rules') || content.includes('Risk Rules'),
      hasPerformanceMetrics: content.includes('Performance') || content.includes('Metrics'),
      lastUpdated: this.extractLastUpdated(content),
      platform: this.extractPlatform(content),
      complexity: this.assessComplexity(content)
    };
    
    return metadata;
  }
  
  /**
   * Extract last updated date
   */
  extractLastUpdated(content) {
    const lastUpdatedMatch = content.match(/Last Updated:\s*(.+)/i);
    const nextReviewMatch = content.match(/Next Review:\s*(.+)/i);
    
    return {
      lastUpdated: lastUpdatedMatch ? lastUpdatedMatch[1].trim() : null,
      nextReview: nextReviewMatch ? nextReviewMatch[1].trim() : null
    };
  }
  
  /**
   * Extract platform from content
   */
  extractPlatform(content) {
    const platformMatch = content.match(/Platform:\s*(\w+)/i);
    return platformMatch ? platformMatch[1].toLowerCase() : null;
  }
  
  /**
   * Assess content complexity
   */
  assessComplexity(content) {
    const lines = content.split('\n').filter(l => l.trim());
    const sections = content.split('## ').length - 1;
    const bulletPoints = (content.match(/[-*•]/g) || []).length;
    
    let complexity = 'low';
    if (lines.length > 100 || sections > 10 || bulletPoints > 50) {
      complexity = 'high';
    } else if (lines.length > 50 || sections > 5 || bulletPoints > 20) {
      complexity = 'medium';
    }
    
    return complexity;
  }
  
  /**
   * Get file modified time
   */
  async getFileModifiedTime(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.mtime;
    } catch {
      return new Date();
    }
  }
  
  /**
   * Load patterns for a platform
   */
  async loadPatterns(platform) {
    // Implementation similar to loadTasks
    console.log(`📊 Loading patterns for ${platform}...`);
    // Actual implementation would read pattern files
  }
  
  /**
   * Load strategies for a platform
   */
  async loadStrategies(platform) {
    // Implementation similar to loadTasks
    console.log(`🎯 Loading strategies for ${platform}...`);
    // Actual implementation would read strategy files
  }
  
  /**
   * Load rules for a platform
   */
  async loadRules(platform) {
    // Implementation similar to loadTasks
    console.log(`📜 Loading rules for ${platform}...`);
    // Actual implementation would read rule files
  }
  
  /**
   * Initialize learning system
   */
  async initializeLearningSystem() {
    if (!this.config.learningEnabled) {
      console.log('🧠 Learning system disabled');
      return;
    }
    
    console.log('🧠 Initializing learning system...');
    
    // Load previous learnings if they exist
    await this.loadPreviousLearnings();
    
    // Initialize pattern memory
    this.initializePatternMemory();
    
    this.learning.lastLearning = Date.now();
    console.log('✅ Learning system ready');
  }
  
  /**
   * Load previous learnings
   */
  async loadPreviousLearnings() {
    const learningsPath = path.join(this.config.basePath, 'learnings.json');
    
    try {
      const data = await fs.readFile(learningsPath, 'utf8');
      const learnings = JSON.parse(data);
      
      learnings.forEach(learning => {
        this.knowledge.learnings.push(learning);
        this.state.stats.learningsRecorded++;
      });
      
      console.log(`📖 Loaded ${learnings.length} previous learnings`);
      
    } catch (error) {
      console.log('No previous learnings found, starting fresh');
    }
  }
  
  /**
   * Initialize pattern memory
   */
  initializePatternMemory() {
    // Initialize with common patterns
    const commonPatterns = {
      'successful_buy': { count: 0, successRate: 0 },
      'successful_sell': { count: 0, successRate: 0 },
      'failed_buy': { count: 0, failureRate: 0 },
      'failed_sell': { count: 0, failureRate: 0 },
      'high_volatility_pattern': { count: 0, accuracy: 0 },
      'low_volatility_pattern': { count: 0, accuracy: 0 }
    };
    
    Object.entries(commonPatterns).forEach(([pattern, data]) => {
      this.learning.patterns.set(pattern, data);
    });
  }
  
  /**
   * Build search index
   */
  async buildSearchIndex() {
    console.log('🔍 Building search index...');
    
    // Add all task content to TF-IDF
    this.knowledge.tasks.forEach((task, key) => {
      this.nlp.tfidf.addDocument(task.content);
    });
    
    console.log(`✅ Search index built with ${this.knowledge.tasks.size} documents`);
  }
  
  /**
   * Search knowledge base
   */
  search(query, platform = null, category = null) {
    const results = [];
    
    // Use TF-IDF for relevance scoring
    this.nlp.tfidf.tfidfs(query, (i, measure) => {
      if (measure > 0.1) { // Minimum relevance threshold
        // Get document by index (this is simplified)
        // In production, would map index to document
        results.push({
          relevance: measure,
          document: `Document ${i}`,
          excerpt: this.getExcerpt(query, i)
        });
      }
    });
    
    // Filter by platform if specified
    if (platform) {
      return results.filter(r => 
        r.document.includes(platform) || 
        (this.knowledge.tasks.get(r.document)?.platform === platform)
      );
    }
    
    // Filter by category if specified
    if (category) {
      return results.filter(r => 
        r.document.includes(category) || 
        (this.knowledge.tasks.get(r.document)?.filename.includes(category))
      );
    }
    
    return results.sort((a,