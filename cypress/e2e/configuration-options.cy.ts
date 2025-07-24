/**
 * Configuration options e2e tests
 */

describe('Configuration Options', () => {
  const testDir = 'cypress/temp/config';
  const outputDir = 'cypress/temp/config/output';
  
  beforeEach(() => {
    cy.cleanupTestFiles('cypress/temp/config/**/*');
  });

  after(() => {
    cy.cleanupTestFiles('cypress/temp/config/**/*');
  });

  it('should include source code when includeSourceCode is true', () => {
    const markdownContent = `# Source Code Test

\`\`\`mermaid
graph TD
    A[Start] --> B[End]
\`\`\``;

    const inputPath = `${testDir}/source-code.md`;
    
    cy.createTestMarkdown(inputPath, markdownContent);
    
    cy.runMermaidProcessor({
      inputDir: testDir,
      outputDir: outputDir,
      baseUrl: '/output',
      includeSourceCode: true,
      sourceCodeStyle: 'inline'
    }).then((result) => {
      expect(result.success).to.be.true;
    });
    
    // Verify markdown includes both image and source code
    cy.task('readFile', inputPath).then((content) => {
      expect(content).to.include('![Mermaid diagram 1](/output/source-code-0.svg)');
      expect(content).to.include('```mermaid\ngraph TD\n    A[Start] --> B[End]\n```');
    });
  });

  it('should use details style for source code', () => {
    const markdownContent = `# Details Style Test

\`\`\`mermaid
sequenceDiagram
    Alice->>Bob: Hello
\`\`\``;

    const inputPath = `${testDir}/details-style.md`;
    
    cy.createTestMarkdown(inputPath, markdownContent);
    
    cy.runMermaidProcessor({
      inputDir: testDir,
      outputDir: outputDir,
      baseUrl: '/output',
      includeSourceCode: true,
      sourceCodeStyle: 'details'
    });
    
    cy.task('readFile', inputPath).then((content) => {
      expect(content).to.include('<details>');
      expect(content).to.include('<summary>View source</summary>');
      expect(content).to.include('```mermaid');
      expect(content).to.include('</details>');
    });
  });

  it('should not include source code when includeSourceCode is false', () => {
    const markdownContent = `# No Source Code Test

\`\`\`mermaid
pie title Test
    "A" : 50
    "B" : 50
\`\`\``;

    const inputPath = `${testDir}/no-source.md`;
    
    cy.createTestMarkdown(inputPath, markdownContent);
    
    cy.runMermaidProcessor({
      inputDir: testDir,
      outputDir: outputDir,
      baseUrl: '/output',
      includeSourceCode: false
    });
    
    cy.task('readFile', inputPath).then((content) => {
      expect(content).to.include('![Mermaid diagram 1](/output/no-source-0.svg)');
      expect(content).not.to.include('```mermaid');
    });
  });

  it('should handle different themes', () => {
    const markdownContent = `# Theme Test

\`\`\`mermaid
graph LR
    A --> B --> C
\`\`\``;

    const inputPath = `${testDir}/theme-test.md`;
    
    cy.createTestMarkdown(inputPath, markdownContent);
    
    // Test with light theme
    cy.runMermaidProcessor({
      inputDir: testDir,
      outputDir: outputDir,
      baseUrl: '/output',
      defaultTheme: 'light'
    }).then((result) => {
      expect(result.success).to.be.true;
    });
    
    cy.task('fileExists', `${outputDir}/theme-test-0.svg`).should('be.true');
  });

  it('should respect concurrent processing limit', () => {
    // Create multiple files
    const files = Array.from({ length: 5 }, (_, i) => ({
      path: `${testDir}/concurrent-${i}.md`,
      content: `# File ${i}\n\`\`\`mermaid\ngraph TD\n    A${i} --> B${i}\n\`\`\``
    }));

    files.forEach(({ path, content }) => {
      cy.createTestMarkdown(path, content);
    });
    
    const startTime = Date.now();
    
    cy.runMermaidProcessor({
      inputDir: testDir,
      outputDir: outputDir,
      baseUrl: '/output',
      concurrent: 2 // Limit concurrency
    }).then((result) => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result.success).to.be.true;
      expect(result.stats.filesProcessed).to.equal(5);
      expect(result.stats.diagramsGenerated).to.equal(5);
      
      // With concurrency limit, it should take longer than processing all at once
      // This is a rough check - in real scenarios you'd have more precise timing
      expect(duration).to.be.greaterThan(100);
    });
  });

  it('should handle custom base URL', () => {
    const markdownContent = `# Custom Base URL

\`\`\`mermaid
graph TD
    Start --> End
\`\`\``;

    const inputPath = `${testDir}/custom-url.md`;
    
    cy.createTestMarkdown(inputPath, markdownContent);
    
    cy.runMermaidProcessor({
      inputDir: testDir,
      outputDir: outputDir,
      baseUrl: '/custom/path/images',
      defaultTheme: 'dark'
    });
    
    cy.task('readFile', inputPath).then((content) => {
      expect(content).to.include('![Mermaid diagram 1](/custom/path/images/custom-url-0.svg)');
    });
  });

  it('should handle blockquote source code style', () => {
    const markdownContent = `# Blockquote Style

\`\`\`mermaid
graph LR
    A --> B
\`\`\``;

    const inputPath = `${testDir}/blockquote.md`;
    
    cy.createTestMarkdown(inputPath, markdownContent);
    
    cy.runMermaidProcessor({
      inputDir: testDir,
      outputDir: outputDir,
      baseUrl: '/output',
      includeSourceCode: true,
      sourceCodeStyle: 'blockquote'
    });
    
    cy.task('readFile', inputPath).then((content) => {
      expect(content).to.include('> ```mermaid');
      expect(content).to.include('> graph LR');
      expect(content).to.include('> A --> B');
      expect(content).to.include('> ```');
    });
  });
});