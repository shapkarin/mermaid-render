/**
 * Functional programming features e2e tests
 */

describe('Functional Programming Features', () => {
  const testDir = 'cypress/temp/functional';
  const outputDir = 'cypress/temp/functional/output';
  
  beforeEach(() => {
    cy.cleanupTestFiles('cypress/temp/functional/**/*');
  });

  after(() => {
    cy.cleanupTestFiles('cypress/temp/functional/**/*');
  });

  it('should demonstrate immutable configuration', () => {
    const markdownContent = `# Immutable Config Test

\`\`\`mermaid
graph TD
    A --> B
\`\`\``;

    const inputPath = `${testDir}/immutable.md`;
    
    cy.createTestMarkdown(inputPath, markdownContent);
    
    // First run with one configuration
    cy.runMermaidProcessor({
      inputDir: testDir,
      outputDir: outputDir,
      baseUrl: '/output',
      defaultTheme: 'dark',
      includeSourceCode: false
    }).then((result1) => {
      expect(result1.success).to.be.true;
      
      // Verify first result
      cy.task('readFile', inputPath).then((content1) => {
        expect(content1).to.include('![Mermaid diagram 1](/output/immutable-0.svg)');
        expect(content1).not.to.include('```mermaid');
        
        // Reset file for second test
        cy.createTestMarkdown(inputPath, markdownContent);
        
        // Second run with different configuration
        cy.runMermaidProcessor({
          inputDir: testDir,
          outputDir: outputDir,
          baseUrl: '/different',
          defaultTheme: 'light',
          includeSourceCode: true,
          sourceCodeStyle: 'inline'
        }).then((result2) => {
          expect(result2.success).to.be.true;
          
          // Verify second result is different
          cy.task('readFile', inputPath).then((content2) => {
            expect(content2).to.include('![Mermaid diagram 1](/different/immutable-0.svg)');
            expect(content2).to.include('```mermaid');
            expect(content2).not.to.equal(content1);
          });
        });
      });
    });
  });

  it('should handle Either monad error cases', () => {
    // Test successful case (Right)
    const validContent = `# Valid Content\n\`\`\`mermaid\ngraph TD\n    A --> B\n\`\`\``;
    const validPath = `${testDir}/valid.md`;
    
    cy.createTestMarkdown(validPath, validContent);
    
    cy.runMermaidProcessor({
      inputDir: testDir,
      outputDir: outputDir,
      baseUrl: '/output'
    }).then((result) => {
      // This should be a Right (success) case
      expect(result.success).to.be.true;
      expect(result.stats).to.exist;
      expect(result.error).to.be.undefined;
    });
    
    // Test error case (Left)
    cy.runMermaidProcessor({
      inputDir: 'non-existent-directory',
      outputDir: outputDir,
      baseUrl: '/output'
    }).then((result) => {
      // This should be a Left (error) case
      expect(result.success).to.be.false;
      expect(result.error).to.exist;
      expect(result.stats).to.be.undefined;
    });
  });

  it('should demonstrate pure function behavior', () => {
    const markdownContent = `# Pure Function Test

\`\`\`mermaid
sequenceDiagram
    Alice->>Bob: Hello
    Bob-->>Alice: Hi
\`\`\``;

    const inputPath = `${testDir}/pure-function.md`;
    
    cy.createTestMarkdown(inputPath, markdownContent);
    
    const config = {
      inputDir: testDir,
      outputDir: outputDir,
      baseUrl: '/output',
      defaultTheme: 'neutral'
    };
    
    // Run the same configuration multiple times
    cy.runMermaidProcessor(config).then((result1) => {
      expect(result1.success).to.be.true;
      
      // Reset the file to original state
      cy.createTestMarkdown(inputPath, markdownContent);
      
      cy.runMermaidProcessor(config).then((result2) => {
        expect(result2.success).to.be.true;
        
        // Results should be identical (pure function behavior)
        expect(result1.stats.filesProcessed).to.equal(result2.stats.filesProcessed);
        expect(result1.stats.diagramsGenerated).to.equal(result2.stats.diagramsGenerated);
      });
    });
  });

  it('should handle composition of operations', () => {
    // Create multiple files to test composition
    const files = [
      { path: `${testDir}/compose1.md`, content: `# File 1\n\`\`\`mermaid\ngraph TD\n    A1 --> B1\n\`\`\`` },
      { path: `${testDir}/compose2.md`, content: `# File 2\n\`\`\`mermaid\nsequenceDiagram\n    A->>B: Msg\n\`\`\`` },
      { path: `${testDir}/compose3.md`, content: `# File 3\n\`\`\`mermaid\npie title Data\n    "X": 60\n    "Y": 40\n\`\`\`` }
    ];
    
    files.forEach(({ path, content }) => {
      cy.createTestMarkdown(path, content);
    });
    
    // Test composition by processing with different configurations
    const baseConfig = {
      inputDir: testDir,
      outputDir: outputDir,
      baseUrl: '/output'
    };
    
    // First composition: basic processing
    cy.runMermaidProcessor({
      ...baseConfig,
      includeSourceCode: false
    }).then((result1) => {
      expect(result1.success).to.be.true;
      expect(result1.stats.filesProcessed).to.equal(3);
      expect(result1.stats.diagramsGenerated).to.equal(3);
      
      // Verify composition worked
      files.forEach(({ path }) => {
        cy.task('readFile', path).then((content) => {
          expect(content).to.include('![Mermaid diagram 1]');
          expect(content).not.to.include('```mermaid');
        });
      });
    });
  });

  it('should demonstrate functional error recovery', () => {
    // Mix of valid and problematic files
    const files = [
      { 
        path: `${testDir}/good1.md`, 
        content: `# Good File 1\n\`\`\`mermaid\ngraph TD\n    A --> B\n\`\`\`` 
      },
      { 
        path: `${testDir}/problematic.md`, 
        content: `# Problematic File\n\`\`\`mermaid\ninvalid syntax here\n\`\`\`` 
      },
      { 
        path: `${testDir}/good2.md`, 
        content: `# Good File 2\n\`\`\`mermaid\nsequenceDiagram\n    A->>B: Test\n\`\`\`` 
      }
    ];
    
    files.forEach(({ path, content }) => {
      cy.createTestMarkdown(path, content);
    });
    
    cy.runMermaidProcessor({
      inputDir: testDir,
      outputDir: outputDir,
      baseUrl: '/output'
    }).then((result) => {
      // Functional error recovery should allow processing to continue
      expect(result.success).to.be.true;
      expect(result.stats.filesProcessed).to.equal(3);
      
      // Good files should be processed successfully
      expect(result.stats.diagramsGenerated).to.be.greaterThan(0);
      
      // Verify good files were processed
      cy.task('readFile', `${testDir}/good1.md`).then((content) => {
        expect(content).to.include('![Mermaid diagram 1]');
      });
      
      cy.task('readFile', `${testDir}/good2.md`).then((content) => {
        expect(content).to.include('![Mermaid diagram 1]');
      });
    });
  });

  it('should maintain referential transparency', () => {
    const markdownContent = `# Referential Transparency Test

\`\`\`mermaid
graph LR
    Start --> Process --> End
\`\`\``;

    const inputPath = `${testDir}/referential.md`;
    
    cy.createTestMarkdown(inputPath, markdownContent);
    
    const config = {
      inputDir: testDir,
      outputDir: outputDir,
      baseUrl: '/output',
      defaultTheme: 'dark',
      includeSourceCode: true,
      sourceCodeStyle: 'inline'
    };
    
    // Multiple calls with same input should produce same output
    cy.runMermaidProcessor(config).then((result1) => {
      cy.task('readFile', inputPath).then((content1) => {
        // Reset file
        cy.createTestMarkdown(inputPath, markdownContent);
        
        cy.runMermaidProcessor(config).then((result2) => {
          cy.task('readFile', inputPath).then((content2) => {
            // Results should be identical (referential transparency)
            expect(content1).to.equal(content2);
            expect(result1.stats.diagramsGenerated).to.equal(result2.stats.diagramsGenerated);
          });
        });
      });
    });
  });
});