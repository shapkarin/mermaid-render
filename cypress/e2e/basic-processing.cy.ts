/**
 * Basic Mermaid processing e2e tests
 */

describe('Basic Mermaid Processing', () => {
  const testDir = 'cypress/temp/basic';
  const outputDir = 'cypress/temp/basic/output';
  
  beforeEach(() => {
    // Clean up before each test
    cy.cleanupTestFiles('cypress/temp/basic/**/*');
  });

  after(() => {
    // Clean up after all tests
    cy.cleanupTestFiles('cypress/temp/basic/**/*');
  });

  it('should process a simple markdown file with one Mermaid diagram', () => {
    const markdownContent = `# Test Document

This is a test document with a Mermaid diagram.

\`\`\`mermaid
graph TD
    A[Start] --> B[Process]
    B --> C[End]
\`\`\`

End of document.`;

    const inputPath = `${testDir}/simple.md`;
    
    // Create test file
    cy.createTestMarkdown(inputPath, markdownContent);
    
    // Run processor
    cy.runMermaidProcessor({
      inputDir: testDir,
      outputDir: outputDir,
      baseUrl: '/output',
      defaultTheme: 'dark',
      verbose: false
    }).then((result) => {
      expect(result.success).to.be.true;
      expect(result.stats.filesProcessed).to.equal(1);
      expect(result.stats.diagramsGenerated).to.equal(1);
      expect(result.stats.errors).to.equal(0);
    });
    
    // Verify SVG was generated
    cy.task('fileExists', `${outputDir}/simple-0.svg`).should('be.true');
    
    // Verify markdown was updated
    cy.task('readFile', inputPath).then((content) => {
      expect(content).to.include('![Mermaid diagram 1](/output/simple-0.svg)');
      expect(content).not.to.include('```mermaid');
    });
  });

  it('should process multiple Mermaid diagrams in one file', () => {
    const markdownContent = `# Multiple Diagrams

First diagram:

\`\`\`mermaid
graph LR
    A --> B
    B --> C
\`\`\`

Second diagram:

\`\`\`mermaid
sequenceDiagram
    Alice->>Bob: Hello
    Bob-->>Alice: Hi
\`\`\`

Third diagram:

\`\`\`mermaid
pie title Pets
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15
\`\`\``;

    const inputPath = `${testDir}/multiple.md`;
    
    cy.createTestMarkdown(inputPath, markdownContent);
    
    cy.runMermaidProcessor({
      inputDir: testDir,
      outputDir: outputDir,
      baseUrl: '/output',
      defaultTheme: 'neutral'
    }).then((result) => {
      expect(result.success).to.be.true;
      expect(result.stats.diagramsGenerated).to.equal(3);
    });
    
    // Verify all SVGs were generated
    cy.verifySvgGenerated([
      `${outputDir}/multiple-0.svg`,
      `${outputDir}/multiple-1.svg`,
      `${outputDir}/multiple-2.svg`
    ]);
    
    // Verify markdown contains all image references
    cy.task('readFile', inputPath).then((content) => {
      expect(content).to.include('![Mermaid diagram 1](/output/multiple-0.svg)');
      expect(content).to.include('![Mermaid diagram 2](/output/multiple-1.svg)');
      expect(content).to.include('![Mermaid diagram 3](/output/multiple-2.svg)');
    });
  });

  it('should handle files with no Mermaid diagrams', () => {
    const markdownContent = `# No Diagrams

This file has no Mermaid diagrams.

Just regular markdown content.

## Section

Some more content.`;

    const inputPath = `${testDir}/no-diagrams.md`;
    
    cy.createTestMarkdown(inputPath, markdownContent);
    
    cy.runMermaidProcessor({
      inputDir: testDir,
      outputDir: outputDir,
      baseUrl: '/output'
    }).then((result) => {
      expect(result.success).to.be.true;
      expect(result.stats.filesProcessed).to.equal(1);
      expect(result.stats.diagramsGenerated).to.equal(0);
    });
    
    // Verify content unchanged
    cy.task('readFile', inputPath).then((content) => {
      expect(content).to.equal(markdownContent);
    });
  });

  it('should process multiple files in a directory', () => {
    const file1Content = `# File 1
\`\`\`mermaid
graph TD
    A --> B
\`\`\``;

    const file2Content = `# File 2
\`\`\`mermaid
sequenceDiagram
    A->>B: Message
\`\`\``;

    const file3Content = `# File 3 - No diagrams
Just text content.`;

    cy.createTestMarkdown(`${testDir}/file1.md`, file1Content);
    cy.createTestMarkdown(`${testDir}/file2.md`, file2Content);
    cy.createTestMarkdown(`${testDir}/file3.md`, file3Content);
    
    cy.runMermaidProcessor({
      inputDir: testDir,
      outputDir: outputDir,
      baseUrl: '/output',
      concurrent: 2
    }).then((result) => {
      expect(result.success).to.be.true;
      expect(result.stats.filesProcessed).to.equal(3);
      expect(result.stats.diagramsGenerated).to.equal(2);
    });
    
    // Verify SVGs generated for files with diagrams
    cy.verifySvgGenerated([
      `${outputDir}/file1-0.svg`,
      `${outputDir}/file2-0.svg`
    ]);
    
    // Verify no SVG for file without diagrams
    cy.task('fileExists', `${outputDir}/file3-0.svg`).should('be.false');
  });
});