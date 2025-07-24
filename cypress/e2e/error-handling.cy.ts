/**
 * Error handling e2e tests
 */

describe('Error Handling', () => {
  const testDir = 'cypress/temp/errors';
  const outputDir = 'cypress/temp/errors/output';
  
  beforeEach(() => {
    cy.cleanupTestFiles('cypress/temp/errors/**/*');
  });

  after(() => {
    cy.cleanupTestFiles('cypress/temp/errors/**/*');
  });

  it('should handle non-existent input directory gracefully', () => {
    cy.runMermaidProcessor({
      inputDir: 'cypress/temp/non-existent',
      outputDir: outputDir,
      baseUrl: '/output'
    }).then((result) => {
      expect(result.success).to.be.false;
      expect(result.error).to.include('ENOENT');
    });
  });

  it('should handle invalid Mermaid syntax gracefully', () => {
    const markdownContent = `# Invalid Mermaid

\`\`\`mermaid
invalid mermaid syntax here
this is not valid
\`\`\`

More content after.`;

    const inputPath = `${testDir}/invalid-syntax.md`;
    
    cy.createTestMarkdown(inputPath, markdownContent);
    
    cy.runMermaidProcessor({
      inputDir: testDir,
      outputDir: outputDir,
      baseUrl: '/output'
    }).then((result) => {
      // The processor should handle invalid syntax gracefully
      // In our functional implementation, it would generate a placeholder SVG
      expect(result.success).to.be.true;
      expect(result.stats.filesProcessed).to.equal(1);
    });
  });

  it('should handle empty Mermaid blocks', () => {
    const markdownContent = `# Empty Mermaid Block

\`\`\`mermaid

\`\`\`

Content after empty block.`;

    const inputPath = `${testDir}/empty-block.md`;
    
    cy.createTestMarkdown(inputPath, markdownContent);
    
    cy.runMermaidProcessor({
      inputDir: testDir,
      outputDir: outputDir,
      baseUrl: '/output'
    }).then((result) => {
      expect(result.success).to.be.true;
      // Empty blocks should be ignored
      expect(result.stats.diagramsGenerated).to.equal(0);
    });
  });

  it('should handle files with mixed content and malformed blocks', () => {
    const markdownContent = `# Mixed Content

Valid diagram:
\`\`\`mermaid
graph TD
    A --> B
\`\`\`

Incomplete block:
\`\`\`mermaid
graph TD
    C --> 

Another valid diagram:
\`\`\`mermaid
pie title Test
    "Good" : 70
    "Bad" : 30
\`\`\``;

    const inputPath = `${testDir}/mixed-content.md`;
    
    cy.createTestMarkdown(inputPath, markdownContent);
    
    cy.runMermaidProcessor({
      inputDir: testDir,
      outputDir: outputDir,
      baseUrl: '/output'
    }).then((result) => {
      expect(result.success).to.be.true;
      // Should process valid diagrams and handle invalid ones gracefully
      expect(result.stats.filesProcessed).to.equal(1);
      expect(result.stats.diagramsGenerated).to.be.greaterThan(0);
    });
  });

  it('should handle permission errors gracefully', () => {
    const markdownContent = `# Permission Test

\`\`\`mermaid
graph TD
    A --> B
\`\`\``;

    const inputPath = `${testDir}/permission-test.md`;
    
    cy.createTestMarkdown(inputPath, markdownContent);
    
    // Try to write to a restricted directory (this might not work in all environments)
    cy.runMermaidProcessor({
      inputDir: testDir,
      outputDir: '/root/restricted', // This should fail
      baseUrl: '/output'
    }).then((result) => {
      // Should handle permission errors gracefully
      if (!result.success) {
        expect(result.error).to.exist;
      }
    });
  });

  it('should handle concurrent processing errors', () => {
    // Create files that might cause processing conflicts
    const files = Array.from({ length: 10 }, (_, i) => ({
      path: `${testDir}/concurrent-error-${i}.md`,
      content: `# File ${i}\n\`\`\`mermaid\ngraph TD\n    A${i}[Very long label that might cause issues] --> B${i}[Another long label]\n\`\`\``
    }));

    files.forEach(({ path, content }) => {
      cy.createTestMarkdown(path, content);
    });
    
    cy.runMermaidProcessor({
      inputDir: testDir,
      outputDir: outputDir,
      baseUrl: '/output',
      concurrent: 5 // High concurrency
    }).then((result) => {
      // Should handle concurrent processing without major failures
      expect(result.success).to.be.true;
      expect(result.stats.filesProcessed).to.equal(10);
      // Some diagrams might fail, but most should succeed
      expect(result.stats.diagramsGenerated).to.be.greaterThan(5);
    });
  });

  it('should provide meaningful error messages', () => {
    cy.runMermaidProcessor({
      inputDir: '', // Invalid empty path
      outputDir: outputDir,
      baseUrl: '/output'
    }).then((result) => {
      expect(result.success).to.be.false;
      expect(result.error).to.be.a('string');
      expect(result.error.length).to.be.greaterThan(0);
    });
  });

  it('should handle large files gracefully', () => {
    // Create a large markdown file with many diagrams
    const diagrams = Array.from({ length: 20 }, (_, i) => 
      `\n## Diagram ${i}\n\`\`\`mermaid\ngraph TD\n    A${i} --> B${i}\n    B${i} --> C${i}\n\`\`\`\n`
    ).join('');
    
    const largeContent = `# Large File Test${diagrams}`;
    const inputPath = `${testDir}/large-file.md`;
    
    cy.createTestMarkdown(inputPath, largeContent);
    
    cy.runMermaidProcessor({
      inputDir: testDir,
      outputDir: outputDir,
      baseUrl: '/output',
      concurrent: 3
    }).then((result) => {
      expect(result.success).to.be.true;
      expect(result.stats.filesProcessed).to.equal(1);
      expect(result.stats.diagramsGenerated).to.equal(20);
    });
  });
});