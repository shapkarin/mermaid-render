// Cypress E2E support file

import './commands';

// Global configuration
Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevent Cypress from failing on uncaught exceptions
  return false;
});

// Custom commands type definitions
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Create a test markdown file with Mermaid diagrams
       */
      createTestMarkdown(path: string, content: string): Chainable<void>;
      
      /**
       * Run the Mermaid processor with given configuration
       */
      runMermaidProcessor(config: any): Chainable<any>;
      
      /**
       * Verify that SVG files were generated
       */
      verifySvgGenerated(paths: string[]): Chainable<void>;
      
      /**
       * Verify markdown content was updated
       */
      verifyMarkdownUpdated(path: string, expectedContent: string): Chainable<void>;
      
      /**
       * Clean up test files
       */
      cleanupTestFiles(pattern: string): Chainable<void>;
      
      /**
       * Wait for file to exist
       */
      waitForFile(path: string, timeout?: number): Chainable<void>;
    }
  }
}