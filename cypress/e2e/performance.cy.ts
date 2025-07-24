/**
 * Performance and scalability e2e tests
 */

describe('Performance and Scalability', () => {
  const testDir = 'cypress/temp/performance';
  const outputDir = 'cypress/temp/performance/output';
  
  beforeEach(() => {
    cy.cleanupTestFiles('cypress/temp/performance/**/*');
  });

  after(() => {
    cy.cleanupTestFiles('cypress/temp/performance/**/*');
  });

  it('should handle large number of files efficiently', () => {
    const fileCount = 50;
    const files = Array.from({ length: fileCount }, (_, i) => ({
      path: `${testDir}/file-${i.toString().padStart(3, '0')}.md`,
      content: `# File ${i}

This is file number ${i}.

\`\`\`mermaid
graph TD
    A${i}[Start ${i}] --> B${i}[Process ${i}]
    B${i} --> C${i}[End ${i}]
\`\`\`

End of file ${i}.`
    }));

    // Create all files
    files.forEach(({ path, content }) => {
      cy.createTestMarkdown(path, content);
    });

    const startTime = Date.now();
    
    cy.runMermaidProcessor({
      inputDir: testDir,
      outputDir: outputDir,
      baseUrl: '/output',
      concurrent: 5,
      verbose: false
    }).then((result) => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result.success).to.be.true;
      expect(result.stats.filesProcessed).to.equal(fileCount);
      expect(result.stats.diagramsGenerated).to.equal(fileCount);
      expect(result.stats.errors).to.equal(0);
      
      // Performance check - should complete within reasonable time
      expect(duration).to.be.lessThan(30000); // 30 seconds max
      
      console.log(`Processed ${fileCount} files in ${duration}ms`);
    });
  });

  it('should handle files with many diagrams efficiently', () => {
    const diagramCount = 20;
    const diagrams = Array.from({ length: diagramCount }, (_, i) => 
      `\n## Diagram ${i}\n\`\`\`mermaid\ngraph TD\n    A${i} --> B${i}\n    B${i} --> C${i}\n\`\`\`\n`
    ).join('');
    
    const content = `# Many Diagrams Test${diagrams}`;
    const inputPath = `${testDir}/many-diagrams.md`;
    
    cy.createTestMarkdown(inputPath, content);
    
    const startTime = Date.now();
    
    cy.runMermaidProcessor({
      inputDir: testDir,
      outputDir: outputDir,
      baseUrl: '/output',
      concurrent: 3
    }).then((result) => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result.success).to.be.true;
      expect(result.stats.filesProcessed).to.equal(1);
      expect(result.stats.diagramsGenerated).to.equal(diagramCount);
      
      // Should handle many diagrams in one file efficiently
      expect(duration).to.be.lessThan(15000); // 15 seconds max
      
      console.log(`Processed ${diagramCount} diagrams in ${duration}ms`);
    });
  });

  it('should scale with different concurrency levels', () => {
    const fileCount = 20;
    const files = Array.from({ length: fileCount }, (_, i) => ({
      path: `${testDir}/concurrent-${i}.md`,
      content: `# Concurrent File ${i}\n\`\`\`mermaid\ngraph TD\n    A${i} --> B${i}\n\`\`\``
    }));

    files.forEach(({ path, content }) => {
      cy.createTestMarkdown(path, content);
    });

    // Test with concurrency = 1
    const startTime1 = Date.now();
    
    cy.runMermaidProcessor({
      inputDir: testDir,
      outputDir: outputDir,
      baseUrl: '/output',
      concurrent: 1
    }).then((result1) => {
      const duration1 = Date.now() - startTime1;
      
      expect(result1.success).to.be.true;
      expect(result1.stats.filesProcessed).to.equal(fileCount);
      
      // Reset files for second test
      files.forEach(({ path, content }) => {
        cy.createTestMarkdown(path, content);
      });
      
      // Test with concurrency = 5
      const startTime2 = Date.now();
      
      cy.runMermaidProcessor({
        inputDir: testDir,
        outputDir: outputDir,
        baseUrl: '/output',
        concurrent: 5
      }).then((result2) => {
        const duration2 = Date.now() - startTime2;
        
        expect(result2.success).to.be.true;
        expect(result2.stats.filesProcessed).to.equal(fileCount);
        
        // Higher concurrency should generally be faster (though not always guaranteed)
        console.log(`Concurrency 1: ${duration1}ms, Concurrency 5: ${duration2}ms`);
        
        // Both should produce same results
        expect(result1.stats.diagramsGenerated).to.equal(result2.stats.diagramsGenerated);
      });
    });
  });

  it('should handle memory efficiently with large content', () => {
    // Create a file with large content
    const largeText = 'Lorem ipsum '.repeat(1000); // Large text block
    const diagrams = Array.from({ length: 10 }, (_, i) => 
      `\n${largeText}\n\n## Diagram ${i}\n\`\`\`mermaid\ngraph TD\n    A${i}[${largeText.substring(0, 20)}] --> B${i}\n\`\`\`\n\n${largeText}\n`
    ).join('');
    
    const largeContent = `# Large Content Test${diagrams}`;
    const inputPath = `${testDir}/large-content.md`;
    
    cy.createTestMarkdown(inputPath, largeContent);
    
    cy.runMermaidProcessor({
      inputDir: testDir,
      outputDir: outputDir,
      baseUrl: '/output'
    }).then((result) => {
      expect(result.success).to.be.true;
      expect(result.stats.filesProcessed).to.equal(1);
      expect(result.stats.diagramsGenerated).to.equal(10);
      
      // Verify the large file was processed correctly
      cy.task('readFile', inputPath).then((content) => {
        expect(content).to.include('![Mermaid diagram 1]');
        expect(content).to.include('![Mermaid diagram 10]');
      });
    });
  });

  it('should maintain performance with nested directories', () => {
    // Create nested directory structure
    const structure = [
      { path: `${testDir}/level1/file1.md`, content: `# L1F1\n\`\`\`mermaid\ngraph TD\n    A --> B\n\`\`\`` },
      { path: `${testDir}/level1/file2.md`, content: `# L1F2\n\`\`\`mermaid\nsequenceDiagram\n    A->>B: Hi\n\`\`\`` },
      { path: `${testDir}/level1/level2/file3.md`, content: `# L2F3\n\`\`\`mermaid\npie title Test\n    "A": 50\n    "B": 50\n\`\`\`` },
      { path: `${testDir}/level1/level2/file4.md`, content: `# L2F4\n\`\`\`mermaid\ngraph LR\n    X --> Y\n\`\`\`` },
      { path: `${testDir}/level1/level2/level3/file5.md`, content: `# L3F5\n\`\`\`mermaid\nflowchart TD\n    Start --> End\n\`\`\`` }
    ];

    structure.forEach(({ path, content }) => {
      cy.createTestMarkdown(path, content);
    });

    const startTime = Date.now();
    
    cy.runMermaidProcessor({
      inputDir: testDir,
      outputDir: outputDir,
      baseUrl: '/output',
      concurrent: 3
    }).then((result) => {
      const duration = Date.now() - startTime;
      
      expect(result.success).to.be.true;
      expect(result.stats.filesProcessed).to.equal(5);
      expect(result.stats.diagramsGenerated).to.equal(5);
      
      // Should handle nested directories efficiently
      expect(duration).to.be.lessThan(10000); // 10 seconds max
      
      console.log(`Processed nested structure in ${duration}ms`);
    });
  });

  it('should handle repeated processing efficiently', () => {
    const markdownContent = `# Repeated Processing Test

\`\`\`mermaid
graph TD
    A[Repeated] --> B[Processing]
    B --> C[Test]
\`\`\``;

    const inputPath = `${testDir}/repeated.md`;
    
    cy.createTestMarkdown(inputPath, markdownContent);
    
    // First run
    const startTime1 = Date.now();
    
    cy.runMermaidProcessor({
      inputDir: testDir,
      outputDir: outputDir,
      baseUrl: '/output'
    }).then((result1) => {
      const duration1 = Date.now() - startTime1;
      
      expect(result1.success).to.be.true;
      
      // Reset file for second run
      cy.createTestMarkdown(inputPath, markdownContent);
      
      // Second run (should be faster due to potential caching)
      const startTime2 = Date.now();
      
      cy.runMermaidProcessor({
        inputDir: testDir,
        outputDir: outputDir,
        baseUrl: '/output'
      }).then((result2) => {
        const duration2 = Date.now() - startTime2;
        
        expect(result2.success).to.be.true;
        
        console.log(`First run: ${duration1}ms, Second run: ${duration2}ms`);
        
        // Both runs should produce same results
        expect(result1.stats.diagramsGenerated).to.equal(result2.stats.diagramsGenerated);
      });
    });
  });
});