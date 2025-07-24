#!/usr/bin/env node

/**
 * CLI entry point for the Mermaid processor
 */

import { run } from './index';

const main = async () => {
  const args = process.argv.slice(2);
  const configPath = args.find(arg => arg.startsWith('--config='))?.split('=')[1];
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Mermaid Processor - Functional TypeScript library for processing Mermaid diagrams

Usage:
  mermaid-processor [options]

Options:
  --config=<path>    Path to configuration file
  --help, -h         Show this help message

Examples:
  mermaid-processor
  mermaid-processor --config=./mermaid.config.js
    `);
    process.exit(0);
  }
  
  await run(configPath);
};

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});