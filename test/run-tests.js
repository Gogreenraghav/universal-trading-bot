#!/usr/bin/env node

/**
 * Universal Trading Bot - Test Runner
 * Run comprehensive tests for the trading bot
 */

const SystemTester = require('./system-test');

async function runTests() {
  console.log('🚀 Universal Trading Bot - Test Suite');
  console.log('='.repeat(60));
  
  const tester = new SystemTester();
  
  try {
    const results = await tester.runAllTests();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    if (results.failed === 0) {
      console.log('✅ ALL TESTS PASSED!');
      console.log(`📊 ${results.passed}/${results.total} tests passed`);
      console.log('🎉 System is ready for production!');
      return 0;
    } else {
      console.log('⚠️ SOME TESTS FAILED');
      console.log(`✅ Passed: ${results.passed}`);
      console.log(`❌ Failed: ${results.failed}`);
      console.log(`📋 Total: ${results.total}`);
      console.log('\n🚨 Please fix the failed tests before deployment.');
      return 1;
    }
    
  } catch (error) {
    console.error('❌ Test suite crashed:', error);
    return 1;
  }
}

// Run tests
runTests().then(exitCode => {
  process.exit(exitCode);
});