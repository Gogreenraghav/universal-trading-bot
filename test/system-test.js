/**
 * Universal Trading Bot - System Integration Test
 * Comprehensive testing suite for all modules
 */

const DashboardServer = require('../src/ui/dashboard/server');

class SystemTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      tests: []
    };
    
    this.dashboard = null;
    this.testConfig = {
      port: 3001, // Different port for testing
      host: 'localhost',
      tradingConfig: {
        apiKey: '',
        apiSecret: '',
        testnet: true,
        mode: 'paper'
      }
    };
    
    console.log('🧪 System Tester initialized');
  }
  
  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting comprehensive system tests...');
    
    try {
      // 1. Module initialization tests
      await this.testModuleInitialization();
      
      // 2. API endpoint tests
      await this.testApiEndpoints();
      
      // 3. Trading functionality tests
      await this.testTradingFunctionality();
      
      // 4. Risk management tests
      await this.testRiskManagement();
      
      // 5. Settings management tests
      await this.testSettingsManagement();
      
      // 6. Performance tests
      await this.testPerformance();
      
      // 7. Error handling tests
      await this.testErrorHandling();
      
      // Print summary
      this.printSummary();
      
      return this.results;
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.addTestResult('test_suite', false, `Test suite failed: ${error.message}`);
      this.printSummary();
      throw error;
    } finally {
      // Cleanup
      await this.cleanup();
    }
  }
  
  /**
   * Test module initialization
   */
  async testModuleInitialization() {
    console.log('\n📦 Testing module initialization...');
    
    try {
      // Initialize dashboard server
      this.dashboard = new DashboardServer(this.testConfig);
      
      // Test dashboard server start
      await this.dashboard.start();
      this.addTestResult('dashboard_start', true, 'Dashboard server started successfully');
      
      // Test health endpoint
      const healthResponse = await this.fetchApi('/health');
      if (healthResponse.status === 'healthy') {
        this.addTestResult('health_endpoint', true, 'Health endpoint working');
      } else {
        this.addTestResult('health_endpoint', false, 'Health endpoint failed');
      }
      
      // Test dashboard data endpoint
      const dashboardResponse = await this.fetchApi('/api/dashboard');
      if (dashboardResponse.bot) {
        this.addTestResult('dashboard_data', true, 'Dashboard data endpoint working');
      } else {
        this.addTestResult('dashboard_data', false, 'Dashboard data endpoint failed');
      }
      
      console.log('✅ Module initialization tests completed');
      
    } catch (error) {
      console.error('❌ Module initialization tests failed:', error.message);
      this.addTestResult('module_initialization', false, `Initialization failed: ${error.message}`);
    }
  }
  
  /**
   * Test API endpoints
   */
  async testApiEndpoints() {
    console.log('\n🔗 Testing API endpoints...');
    
    const endpoints = [
      { path: '/api/portfolio', method: 'GET', name: 'portfolio_endpoint' },
      { path: '/api/trade/history', method: 'GET', name: 'trade_history_endpoint' },
      { path: '/api/risk/summary', method: 'GET', name: 'risk_summary_endpoint' },
      { path: '/api/risk/exposure', method: 'GET', name: 'risk_exposure_endpoint' },
      { path: '/api/settings', method: 'GET', name: 'settings_endpoint' },
      { path: '/api/settings/strategies', method: 'GET', name: 'strategies_endpoint' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await this.fetchApi(endpoint.path);
        if (response.success !== false) { // Allow success: true or no success field
          this.addTestResult(endpoint.name, true, `${endpoint.path} endpoint working`);
        } else {
          this.addTestResult(endpoint.name, false, `${endpoint.path} endpoint failed`);
        }
      } catch (error) {
        this.addTestResult(endpoint.name, false, `${endpoint.path} error: ${error.message}`);
      }
    }
    
    console.log('✅ API endpoint tests completed');
  }
  
  /**
   * Test trading functionality
   */
  async testTradingFunctionality() {
    console.log('\n💰 Testing trading functionality...');
    
    try {
      // Test paper trading buy order
      const buyOrder = {
        symbol: 'BTCUSDT',
        quantity: 0.001,
        orderType: 'MARKET'
      };
      
      const buyResponse = await this.postApi('/api/trade/buy', buyOrder);
      if (buyResponse.success) {
        this.addTestResult('paper_trading_buy', true, 'Paper trading buy order successful');
      } else {
        this.addTestResult('paper_trading_buy', false, 'Paper trading buy order failed');
      }
      
      // Test paper trading sell order
      const sellOrder = {
        symbol: 'BTCUSDT',
        quantity: 0.001,
        orderType: 'MARKET'
      };
      
      const sellResponse = await this.postApi('/api/trade/sell', sellOrder);
      if (sellResponse.success) {
        this.addTestResult('paper_trading_sell', true, 'Paper trading sell order successful');
      } else {
        this.addTestResult('paper_trading_sell', false, 'Paper trading sell order failed');
      }
      
      // Test order history
      const historyResponse = await this.fetchApi('/api/trade/history?symbol=BTCUSDT&limit=5');
      if (historyResponse.orders || historyResponse.trades) {
        this.addTestResult('order_history', true, 'Order history retrieval successful');
      } else {
        this.addTestResult('order_history', false, 'Order history retrieval failed');
      }
      
      console.log('✅ Trading functionality tests completed');
      
    } catch (error) {
      console.error('❌ Trading functionality tests failed:', error.message);
      this.addTestResult('trading_functionality', false, `Trading tests failed: ${error.message}`);
    }
  }
  
  /**
   * Test risk management
   */
  async testRiskManagement() {
    console.log('\n🛡️ Testing risk management...');
    
    try {
      // Test risk summary
      const riskSummary = await this.fetchApi('/api/risk/summary');
      if (riskSummary.summary && riskSummary.summary.metrics) {
        this.addTestResult('risk_summary', true, 'Risk summary retrieval successful');
      } else {
        this.addTestResult('risk_summary', false, 'Risk summary retrieval failed');
      }
      
      // Test exposure report
      const exposureReport = await this.fetchApi('/api/risk/exposure');
      if (exposureReport.exposure) {
        this.addTestResult('exposure_report', true, 'Exposure report retrieval successful');
      } else {
        this.addTestResult('exposure_report', false, 'Exposure report retrieval failed');
      }
      
      // Test risk recommendations
      const recommendations = await this.fetchApi('/api/risk/recommendations');
      if (recommendations.recommendations !== undefined) {
        this.addTestResult('risk_recommendations', true, 'Risk recommendations retrieval successful');
      } else {
        this.addTestResult('risk_recommendations', false, 'Risk recommendations retrieval failed');
      }
      
      console.log('✅ Risk management tests completed');
      
    } catch (error) {
      console.error('❌ Risk management tests failed:', error.message);
      this.addTestResult('risk_management', false, `Risk tests failed: ${error.message}`);
    }
  }
  
  /**
   * Test settings management
   */
  async testSettingsManagement() {
    console.log('\n⚙️ Testing settings management...');
    
    try {
      // Test settings retrieval
      const settings = await this.fetchApi('/api/settings');
      if (settings.settings) {
        this.addTestResult('settings_retrieval', true, 'Settings retrieval successful');
      } else {
        this.addTestResult('settings_retrieval', false, 'Settings retrieval failed');
      }
      
      // Test strategy retrieval
      const strategies = await this.fetchApi('/api/settings/strategies');
      if (strategies.strategies) {
        this.addTestResult('strategies_retrieval', true, 'Strategies retrieval successful');
      } else {
        this.addTestResult('strategies_retrieval', false, 'Strategies retrieval failed');
      }
      
      // Test settings update (non-destructive)
      const testUpdate = {
        dashboard: {
          theme: 'dark',
          autoRefresh: true
        }
      };
      
      const updateResponse = await this.putApi('/api/settings/dashboard', testUpdate);
      if (updateResponse.success) {
        this.addTestResult('settings_update', true, 'Settings update successful');
      } else {
        this.addTestResult('settings_update', false, 'Settings update failed');
      }
      
      console.log('✅ Settings management tests completed');
      
    } catch (error) {
      console.error('❌ Settings management tests failed:', error.message);
      this.addTestResult('settings_management', false, `Settings tests failed: ${error.message}`);
    }
  }
  
  /**
   * Test performance
   */
  async testPerformance() {
    console.log('\n⚡ Testing performance...');
    
    try {
      const iterations = 10;
      let totalTime = 0;
      
      // Test dashboard endpoint response time
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await this.fetchApi('/api/dashboard');
        const endTime = Date.now();
        totalTime += (endTime - startTime);
      }
      
      const avgResponseTime = totalTime / iterations;
      
      if (avgResponseTime < 1000) { // Less than 1 second
        this.addTestResult('response_time', true, `Average response time: ${avgResponseTime.toFixed(2)}ms`);
      } else {
        this.addTestResult('response_time', false, `Slow response time: ${avgResponseTime.toFixed(2)}ms`);
      }
      
      // Test concurrent requests
      const concurrentRequests = 5;
      const promises = [];
      
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(this.fetchApi('/health'));
      }
      
      await Promise.all(promises);
      this.addTestResult('concurrent_requests', true, `Handled ${concurrentRequests} concurrent requests`);
      
      console.log('✅ Performance tests completed');
      
    } catch (error) {
      console.error('❌ Performance tests failed:', error.message);
      this.addTestResult('performance', false, `Performance tests failed: ${error.message}`);
    }
  }
  
  /**
   * Test error handling
   */
  async testErrorHandling() {
    console.log('\n🚨 Testing error handling...');
    
    try {
      // Test invalid endpoint
      try {
        await this.fetchApi('/api/invalid-endpoint');
        this.addTestResult('invalid_endpoint', false, 'Invalid endpoint should return error');
      } catch (error) {
        this.addTestResult('invalid_endpoint', true, 'Invalid endpoint handled correctly');
      }
      
      // Test invalid trade order
      const invalidOrder = {
        symbol: 'INVALID',
        quantity: -1, // Invalid quantity
        orderType: 'INVALID'
      };
      
      const errorResponse = await this.postApi('/api/trade/buy', invalidOrder);
      if (!errorResponse.success) {
        this.addTestResult('error_handling', true, 'Invalid trade order handled correctly');
      } else {
        this.addTestResult('error_handling', false, 'Invalid trade order should have failed');
      }
      
      console.log('✅ Error handling tests completed');
      
    } catch (error) {
      console.error('❌ Error handling tests failed:', error.message);
      this.addTestResult('error_handling_suite', false, `Error handling tests failed: ${error.message}`);
    }
  }
  
  /**
   * Add test result
   */
  addTestResult(name, passed, message) {
    this.results.total++;
    if (passed) {
      this.results.passed++;
    } else {
      this.results.failed++;
    }
    
    this.results.tests.push({
      name,
      passed,
      message,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Print test summary
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📋 Total: ${this.results.total}`);
    console.log(`📈 Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(2)}%`);
    
    if (this.results.failed > 0) {
      console.log('\n🚨 FAILED TESTS:');
      this.results.tests
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`  ❌ ${test.name}: ${test.message}`);
        });
    }
    
    console.log('\n✅ PASSED TESTS:');
    this.results.tests
      .filter(test => test.passed)
      .slice(0, 10) // Show first 10 passed tests
      .forEach(test => {
        console.log(`  ✅ ${test.name}: ${test.message}`);
      });
    
    if (this.results.passed > 10) {
      console.log(`  ... and ${this.results.passed - 10} more passed tests`);
    }
    
    console.log('='.repeat(60));
  }
  
  /**
   * Fetch API helper
   */
  async fetchApi(endpoint) {
    const url = `http://${this.testConfig.host}:${this.testConfig.port}${endpoint}`;
    
    try {
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      throw new Error(`API call failed: ${error.message}`);
    }
  }
  
  /**
   * POST API helper
   */
  async postApi(endpoint, data) {
    const url = `http://${this.testConfig.host}:${this.testConfig.port}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (error) {
      throw new Error(`POST API call failed: ${error.message}`);
    }
  }
  
  /**
   * PUT API helper
   */
  async putApi(endpoint, data) {
    const url = `http://${this.testConfig.host}:${this.testConfig.port}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (error) {
      throw new Error(`PUT API call failed: ${error.message}`);
    }
  }
  
  /**
   * Cleanup
   */
  async cleanup() {
    if (this.dashboard) {
      try {
        await this.dashboard.stop();
        console.log('🧹 Test cleanup completed');
      } catch (error) {
        console.warn('⚠️ Cleanup failed:', error.message);
      }
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new SystemTester();
  
  tester.runAllTests()
    .then(results => {
      if (results.failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED!');
        process.exit(0);
      } else {
        console.log('\n⚠️ SOME TESTS FAILED');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Test suite crashed:', error);
      process.exit(1);
    });
}

module.exports = SystemTester;