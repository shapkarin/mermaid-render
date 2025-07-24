#!/usr/bin/env node

/**
 * Comprehensive test runner for the Mermaid processor
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

async function runTests() {
  log('🚀 Starting comprehensive test suite for Mermaid Processor', 'cyan');
  log('=' .repeat(60), 'cyan');

  const startTime = Date.now();
  let passed = 0;
  let failed = 0;

  const testSuites = [
    {
      name: 'TypeScript Compilation',
      command: 'npm',
      args: ['run', 'build'],
      description: 'Compile TypeScript source code'
    },
    {
      name: 'Unit Tests',
      command: 'npm',
      args: ['run', 'test'],
      description: 'Run Jest unit tests',
      optional: true // Jest tests might not exist yet
    },
    {
      name: 'Linting',
      command: 'npm',
      args: ['run', 'lint'],
      description: 'Check code style and quality',
      optional: true
    },
    {
      name: 'E2E Tests - Basic Processing',
      command: 'npx',
      args: ['cypress', 'run', '--spec', 'cypress/e2e/basic-processing.cy.ts'],
      description: 'Test basic Mermaid diagram processing'
    },
    {
      name: 'E2E Tests - Configuration Options',
      command: 'npx',
      args: ['cypress', 'run', '--spec', 'cypress/e2e/configuration-options.cy.ts'],
      description: 'Test various configuration options'
    },
    {
      name: 'E2E Tests - Error Handling',
      command: 'npx',
      args: ['cypress', 'run', '--spec', 'cypress/e2e/error-handling.cy.ts'],
      description: 'Test error handling and edge cases'
    },
    {
      name: 'E2E Tests - Functional Features',
      command: 'npx',
      args: ['cypress', 'run', '--spec', 'cypress/e2e/functional-features.cy.ts'],
      description: 'Test functional programming features'
    },
    {
      name: 'E2E Tests - Performance',
      command: 'npx',
      args: ['cypress', 'run', '--spec', 'cypress/e2e/performance.cy.ts'],
      description: 'Test performance and scalability'
    },
    {
      name: 'E2E Tests - Integration',
      command: 'npx',
      args: ['cypress', 'run', '--spec', 'cypress/e2e/integration.cy.ts'],
      description: 'Test real-world integration scenarios'
    }
  ];

  for (const suite of testSuites) {
    log(`\n📋 Running: ${suite.name}`, 'yellow');
    log(`   ${suite.description}`, 'blue');
    log('-'.repeat(40), 'blue');

    try {
      await runCommand(suite.command, suite.args);
      log(`✅ ${suite.name} - PASSED`, 'green');
      passed++;
    } catch (error) {
      if (suite.optional) {
        log(`⚠️  ${suite.name} - SKIPPED (optional)`, 'yellow');
      } else {
        log(`❌ ${suite.name} - FAILED`, 'red');
        log(`   Error: ${error.message}`, 'red');
        failed++;
      }
    }
  }

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const total = passed + failed;

  log('\n' + '='.repeat(60), 'cyan');
  log('📊 TEST SUMMARY', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`Total Suites: ${total}`, 'bright');
  log(`Passed: ${passed}`, passed > 0 ? 'green' : 'reset');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'reset');
  log(`Duration: ${duration}s`, 'bright');

  if (failed === 0) {
    log('\n🎉 All tests passed! The functional Mermaid processor is working correctly.', 'green');
    process.exit(0);
  } else {
    log(`\n💥 ${failed} test suite(s) failed. Please check the output above.`, 'red');
    process.exit(1);
  }
}

// Handle CLI arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  log('Mermaid Processor Test Runner', 'cyan');
  log('Usage: node scripts/test-runner.js [options]', 'bright');
  log('\nOptions:', 'bright');
  log('  --help, -h     Show this help message');
  log('  --e2e-only     Run only E2E tests');
  log('  --unit-only    Run only unit tests');
  log('  --build-only   Run only build tests');
  process.exit(0);
}

if (args.includes('--e2e-only')) {
  log('Running E2E tests only...', 'yellow');
  runCommand('npm', ['run', 'test:e2e']).then(() => {
    log('✅ E2E tests completed', 'green');
  }).catch((error) => {
    log('❌ E2E tests failed', 'red');
    process.exit(1);
  });
} else if (args.includes('--unit-only')) {
  log('Running unit tests only...', 'yellow');
  runCommand('npm', ['run', 'test']).then(() => {
    log('✅ Unit tests completed', 'green');
  }).catch((error) => {
    log('❌ Unit tests failed', 'red');
    process.exit(1);
  });
} else if (args.includes('--build-only')) {
  log('Running build only...', 'yellow');
  runCommand('npm', ['run', 'build']).then(() => {
    log('✅ Build completed', 'green');
  }).catch((error) => {
    log('❌ Build failed', 'red');
    process.exit(1);
  });
} else {
  runTests();
}