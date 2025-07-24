/**
 * Integration tests using fixtures and real-world scenarios
 */

describe('Integration Tests', () => {
  const testDir = 'cypress/temp/integration';
  const outputDir = 'cypress/temp/integration/output';
  
  beforeEach(() => {
    cy.cleanupTestFiles('cypress/temp/integration/**/*');
  });

  after(() => {
    cy.cleanupTestFiles('cypress/temp/integration/**/*');
  });

  it('should process all diagram types from fixtures', () => {
    cy.fixture('sample-diagrams').then((diagrams) => {
      // Create markdown files for each diagram type
      const diagramTypes = Object.keys(diagrams);
      
      diagramTypes.forEach((type, index) => {
        const diagramData = diagrams[type];
        const diagramKeys = Object.keys(diagramData);
        
        const content = `# ${type.charAt(0).toUpperCase() + type.slice(1)} Diagrams

${diagramKeys.map((key, i) => `
## ${key.charAt(0).toUpperCase() + key.slice(1)} ${type}

\`\`\`mermaid
${diagramData[key]}
\`\`\`
`).join('')}`;

        cy.createTestMarkdown(`${testDir}/${type}-diagrams.md`, content);
      });
      
      // Process all files
      cy.runMermaidProcessor({
        inputDir: testDir,
        outputDir: outputDir,
        baseUrl: '/output',
        defaultTheme: 'dark',
        includeSourceCode: true,
        sourceCodeStyle: 'details',
        concurrent: 3
      }).then((result) => {
        expect(result.success).to.be.true;
        expect(result.stats.filesProcessed).to.equal(diagramTypes.length);
        
        // Calculate expected diagrams
        const expectedDiagrams = diagramTypes.reduce((total, type) => {
          return total + Object.keys(diagrams[type]).length;
        }, 0);
        
        expect(result.stats.diagramsGenerated).to.equal(expectedDiagrams);
        
        // Verify each file was processed
        diagramTypes.forEach((type) => {
          cy.task('readFile', `${testDir}/${type}-diagrams.md`).then((content) => {
            expect(content).to.include('![Mermaid diagram');
            expect(content).to.include('<details>');
            expect(content).to.include('<summary>View source</summary>');
          });
        });
      });
    });
  });

  it('should work with different configuration presets', () => {
    cy.fixture('test-configs').then((configs) => {
      const markdownContent = `# Configuration Test

\`\`\`mermaid
graph TD
    A[Config Test] --> B[Processing]
    B --> C[Success]
\`\`\``;

      const inputPath = `${testDir}/config-test.md`;
      
      // Test each configuration preset
      const configNames = Object.keys(configs);
      
      configNames.forEach((configName, index) => {
        cy.createTestMarkdown(inputPath, markdownContent);
        
        const config = {
          ...configs[configName],
          inputDir: testDir,
          outputDir: `${outputDir}/${configName}`
        };
        
        cy.runMermaidProcessor(config).then((result) => {
          expect(result.success).to.be.true;
          expect(result.stats.filesProcessed).to.equal(1);
          expect(result.stats.diagramsGenerated).to.equal(1);
          
          // Verify output based on configuration
          cy.task('readFile', inputPath).then((content) => {
            if (config.includeSourceCode) {
              expect(content).to.include('```mermaid');
            } else {
              expect(content).not.to.include('```mermaid');
            }
            
            if (config.baseUrl) {
              expect(content).to.include(config.baseUrl);
            }
          });
        });
      });
    });
  });

  it('should handle real-world documentation structure', () => {
    // Simulate a real documentation project structure
    const docStructure = [
      {
        path: `${testDir}/README.md`,
        content: `# Project Documentation

Welcome to our project!

## Architecture Overview

\`\`\`mermaid
graph TD
    A[Frontend] --> B[API Gateway]
    B --> C[Microservice 1]
    B --> D[Microservice 2]
    C --> E[Database 1]
    D --> F[Database 2]
\`\`\`

See individual service documentation for details.`
      },
      {
        path: `${testDir}/services/auth.md`,
        content: `# Authentication Service

## Flow Diagram

\`\`\`mermaid
sequenceDiagram
    participant U as User
    participant A as Auth Service
    participant D as Database
    
    U->>A: Login Request
    A->>D: Validate Credentials
    D-->>A: User Data
    A-->>U: JWT Token
\`\`\`

## State Machine

\`\`\`mermaid
stateDiagram-v2
    [*] --> Unauthenticated
    Unauthenticated --> Authenticated: login
    Authenticated --> Unauthenticated: logout
    Authenticated --> [*]
\`\`\``
      },
      {
        path: `${testDir}/services/payment.md`,
        content: `# Payment Service

## Payment Flow

\`\`\`mermaid
graph TD
    A[User Initiates Payment] --> B{Payment Method}
    B -->|Credit Card| C[Process Card]
    B -->|PayPal| D[Process PayPal]
    B -->|Bank Transfer| E[Process Transfer]
    C --> F[Payment Gateway]
    D --> F
    E --> F
    F --> G{Success?}
    G -->|Yes| H[Update Order]
    G -->|No| I[Handle Error]
    H --> J[Send Confirmation]
    I --> K[Retry Logic]
\`\`\``
      },
      {
        path: `${testDir}/deployment/infrastructure.md`,
        content: `# Infrastructure

## Deployment Pipeline

\`\`\`mermaid
gantt
    title Deployment Pipeline
    dateFormat  YYYY-MM-DD
    section Build
    Code Checkout    :done, checkout, 2024-01-01, 1d
    Unit Tests       :done, tests, after checkout, 1d
    Build Artifacts  :done, build, after tests, 1d
    section Deploy
    Staging Deploy   :active, staging, after build, 1d
    Integration Tests:        integration, after staging, 1d
    Production Deploy:        prod, after integration, 1d
\`\`\`

## System Architecture

\`\`\`mermaid
graph TB
    subgraph "Load Balancer"
        LB[NGINX]
    end
    
    subgraph "Application Tier"
        A1[App Server 1]
        A2[App Server 2]
        A3[App Server 3]
    end
    
    subgraph "Database Tier"
        DB1[(Primary DB)]
        DB2[(Replica DB)]
    end
    
    LB --> A1
    LB --> A2
    LB --> A3
    A1 --> DB1
    A2 --> DB1
    A3 --> DB1
    DB1 --> DB2
\`\`\``
      }
    ];

    // Create the documentation structure
    docStructure.forEach(({ path, content }) => {
      cy.createTestMarkdown(path, content);
    });

    // Process the entire documentation
    cy.runMermaidProcessor({
      inputDir: testDir,
      outputDir: outputDir,
      baseUrl: '/docs/images',
      defaultTheme: 'neutral',
      includeSourceCode: true,
      sourceCodeStyle: 'details',
      concurrent: 2,
      verbose: false
    }).then((result) => {
      expect(result.success).to.be.true;
      expect(result.stats.filesProcessed).to.equal(4);
      expect(result.stats.diagramsGenerated).to.equal(7); // Total diagrams across all files
      expect(result.stats.errors).to.equal(0);

      // Verify each file was processed correctly
      docStructure.forEach(({ path }) => {
        cy.task('readFile', path).then((content) => {
          // Should contain image references
          if (content.includes('```mermaid')) {
            expect(content).to.include('![Mermaid diagram');
            expect(content).to.include('/docs/images/');
            expect(content).to.include('<details>');
          }
        });
      });

      // Verify SVG files were created
      const expectedSvgFiles = [
        'README-0.svg',
        'auth-0.svg', 'auth-1.svg',
        'payment-0.svg',
        'infrastructure-0.svg', 'infrastructure-1.svg'
      ];

      expectedSvgFiles.forEach(filename => {
        cy.task('fileExists', `${outputDir}/${filename}`).should('be.true');
      });
    });
  });

  it('should handle mixed content with various markdown features', () => {
    const complexContent = `# Complex Document

This document tests various markdown features with Mermaid diagrams.

## Table of Contents
- [Introduction](#introduction)
- [Architecture](#architecture)
- [API Reference](#api-reference)

## Introduction

Here's some **bold text** and *italic text*.

> This is a blockquote with some important information.

### Code Example

\`\`\`javascript
function hello() {
    console.log("Hello, world!");
}
\`\`\`

## Architecture

The system architecture is shown below:

\`\`\`mermaid
graph TD
    A[Client] --> B[Load Balancer]
    B --> C[Web Server 1]
    B --> D[Web Server 2]
    C --> E[Database]
    D --> E
\`\`\`

### Database Schema

| Table | Description |
|-------|-------------|
| Users | User information |
| Orders | Order data |

## API Reference

### Authentication Flow

\`\`\`mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant D as Database
    
    C->>S: POST /auth/login
    S->>D: SELECT user WHERE email = ?
    D-->>S: User data
    S-->>C: JWT token
\`\`\`

### Error Handling

- 400: Bad Request
- 401: Unauthorized  
- 500: Internal Server Error

## Conclusion

This concludes our documentation.

\`\`\`mermaid
pie title Project Status
    "Completed" : 75
    "In Progress" : 20
    "Planned" : 5
\`\`\`

---

*Last updated: 2024*`;

    const inputPath = `${testDir}/complex-document.md`;
    
    cy.createTestMarkdown(inputPath, complexContent);
    
    cy.runMermaidProcessor({
      inputDir: testDir,
      outputDir: outputDir,
      baseUrl: '/images',
      defaultTheme: 'dark',
      includeSourceCode: true,
      sourceCodeStyle: 'inline'
    }).then((result) => {
      expect(result.success).to.be.true;
      expect(result.stats.filesProcessed).to.equal(1);
      expect(result.stats.diagramsGenerated).to.equal(3);
      
      cy.task('readFile', inputPath).then((content) => {
        // Verify Mermaid diagrams were replaced
        expect(content).to.include('![Mermaid diagram 1](/images/complex-document-0.svg)');
        expect(content).to.include('![Mermaid diagram 2](/images/complex-document-1.svg)');
        expect(content).to.include('![Mermaid diagram 3](/images/complex-document-2.svg)');
        
        // Verify other markdown features are preserved
        expect(content).to.include('**bold text**');
        expect(content).to.include('*italic text*');
        expect(content).to.include('> This is a blockquote');
        expect(content).to.include('```javascript');
        expect(content).to.include('| Table | Description |');
        expect(content).to.include('- 400: Bad Request');
        expect(content).to.include('*Last updated: 2024*');
        
        // Verify source code is included inline
        expect(content).to.include('```mermaid\ngraph TD');
        expect(content).to.include('```mermaid\nsequenceDiagram');
        expect(content).to.include('```mermaid\npie title Project Status');
      });
    });
  });
});