# Mermaid Processor

A functional TypeScript library for processing Mermaid diagrams in markdown files. Built with functional programming principles, immutability, and composability in mind.

## Features

- 🔧 **Functional Architecture**: Pure functions, immutable data structures, and composable operations
- 🎨 **Theme Support**: Generate diagrams with different themes (light, dark, neutral, etc.)
- 📁 **Batch Processing**: Process entire directories with configurable concurrency
- 💾 **Smart Caching**: SQLite-based caching to avoid regenerating unchanged diagrams
- 🔄 **Flexible Output**: Multiple source code inclusion styles (inline, details, blockquote)
- 🛡️ **Type Safety**: Full TypeScript support with comprehensive type definitions
- 🚀 **CLI Support**: Command-line interface for easy integration

## Installation

```bash
npm install mermaid-processor
```

## Quick Start

### Programmatic Usage

```typescript
import { processMermaidDiagrams, createProcessor } from 'mermaid-processor';

// Simple usage with defaults
const result = await processMermaidDiagrams({
  inputDir: './docs',
  outputDir: './docs',
  defaultTheme: 'dark'
});

result.fold(
  error => console.error('Failed:', error),
  stats => console.log('Success:', stats)
);

// Advanced usage with custom processor
const processor = createProcessor({
  inputDir: './content',
  outputDir: './public/images',
  baseUrl: '/images',
  concurrent: 4,
  includeSourceCode: true,
  sourceCodeStyle: 'details'
});

await processor.process();
```

### CLI Usage

```bash
# Process with default configuration
npx mermaid-processor

# Use custom configuration
npx mermaid-processor --config=./mermaid.config.js
```

## Configuration

### ProcessorConfig Interface

```typescript
interface ProcessorConfig {
  readonly inputDir: string;           // Input directory path
  readonly outputDir: string;          // Output directory path  
  readonly baseUrl: string;            // Base URL for generated images
  readonly defaultTheme: Theme;        // Default theme for diagrams
  readonly generateBothThemes: boolean; // Generate both light and dark themes
  readonly includeSourceCode: boolean; // Include source code in output
  readonly sourceCodeStyle: SourceCodeStyle; // How to include source code
  readonly backgroundColor: string;    // Background color for diagrams
  readonly concurrent: number;         // Number of concurrent operations
  readonly skipExisting: boolean;      // Skip existing diagrams
  readonly verbose: boolean;           // Verbose logging
  readonly dbPath?: string;           // SQLite database path for caching
}
```

### Configuration File Example

```javascript
// mermaid.config.js
module.exports = {
  inputDir: './content',
  outputDir: './public/diagrams',
  baseUrl: '/diagrams',
  defaultTheme: 'dark',
  generateBothThemes: true,
  includeSourceCode: true,
  sourceCodeStyle: 'details',
  concurrent: 3,
  dbPath: './cache/mermaid.db'
};
```

## Functional Programming Features

### Monadic Error Handling

The library uses `Either` and `Maybe` monads for safe error handling:

```typescript
import { Either, Maybe } from 'mermaid-processor';

// Either for operations that can fail
const result: Either<string, ProcessingStats> = await processMermaidDiagrams(config);

result.fold(
  error => handleError(error),
  stats => handleSuccess(stats)
);

// Maybe for nullable values
const cachedPath: Maybe<string> = Maybe.of(getCachedPath(hash));
const finalPath = cachedPath.getOrElse(generateNewPath());
```

### Function Composition

Compose operations using functional utilities:

```typescript
import { pipe, compose, curry } from 'mermaid-processor';

const processWithLogging = pipe(
  validateConfig,
  logStart,
  processDirectory(config),
  logResults
);

const result = await processWithLogging(initialData);
```

### Immutable Data Structures

All data structures are immutable with readonly properties:

```typescript
// Configuration is immutable
const config = createConfig({ inputDir: './docs' });
const newConfig = { ...config, outputDir: './output' }; // Create new instance

// Processing results are immutable
interface ProcessingResult {
  readonly success: boolean;
  readonly filePath: string;
  readonly diagramsProcessed: number;
  readonly error?: string;
}
```

## API Reference

### Core Functions

#### `processMermaidDiagrams(config?: Partial<ProcessorConfig>): Promise<Either<string, ProcessingStats>>`

Main processing function that handles the entire workflow.

#### `createProcessor(config?: Partial<ProcessorConfig>): Processor`

Creates a configured processor instance with methods for different operations.

#### `processDirectory(config: ProcessorConfig): () => Promise<ProcessingStats>`

Curried function for processing all markdown files in a directory.

#### `processFile(config: ProcessorConfig): (filePath: string) => Promise<ProcessingResult>`

Curried function for processing a single markdown file.

### Utility Functions

#### `extractMermaidDiagrams(content: string): DiagramInfo[]`

Extract all Mermaid diagram blocks from markdown content.

#### `analyzeFile(filePath: string): Promise<Either<string, FileAnalysis>>`

Analyze a file to determine processing requirements.

#### `createContentHash(content: string): string`

Generate SHA-256 hash for content-based caching.

### Configuration Functions

#### `createConfig(overrides?: Partial<ProcessorConfig>): ProcessorConfig`

Create configuration by merging defaults with user overrides.

#### `applyEnvironmentConfig(config: ProcessorConfig): ProcessorConfig`

Apply environment-specific configuration adjustments.

### Database Operations

#### `createDatabaseOperations(dbPath: string): DatabaseOperations`

Create database operations for caching functionality.

## Examples

### Basic Processing

```typescript
import { processMermaidDiagrams } from 'mermaid-processor';

const stats = await processMermaidDiagrams({
  inputDir: './docs',
  outputDir: './docs/images',
  defaultTheme: 'neutral'
});
```

### Advanced Processing with Caching

```typescript
import { createProcessor } from 'mermaid-processor';

const processor = createProcessor({
  inputDir: './content',
  outputDir: './static/diagrams',
  baseUrl: '/diagrams',
  dbPath: './cache/diagrams.db',
  concurrent: 4,
  generateBothThemes: true,
  sourceCodeStyle: 'details'
});

const result = await processor.process();
```

### Custom Pipeline

```typescript
import { createProcessingPipeline, createConfig } from 'mermaid-processor';

const config = createConfig({
  inputDir: './docs',
  outputDir: './build/images'
});

const pipeline = createProcessingPipeline(config);
const stats = await pipeline();
```

## Source Code Styles

- `inline`: Include source code directly after the image
- `details`: Wrap source code in collapsible details element
- `blockquote`: Include source code in a blockquote
- `footnote`: Add source code as footnotes (planned)
- `none`: Don't include source code

## Themes

Supported Mermaid themes:
- `light`: Light theme
- `dark`: Dark theme  
- `neutral`: Neutral theme
- `forest`: Forest theme
- `base`: Base theme
- `default`: Default Mermaid theme

## Testing

The library includes comprehensive test coverage with both unit and e2e tests.

### Running Tests

```bash
# Run all tests
npm run test:all

# Run only unit tests
npm test

# Run only e2e tests
npm run test:e2e

# Open Cypress test runner
npm run test:e2e:open

# Run comprehensive test suite
npm run test:runner
```

### E2E Test Coverage

The Cypress e2e tests cover:

- **Basic Processing**: Simple and complex Mermaid diagram processing
- **Configuration Options**: All configuration combinations and presets
- **Error Handling**: Graceful handling of invalid input and edge cases
- **Functional Features**: Monadic error handling, immutability, composition
- **Performance**: Scalability with large files and concurrent processing
- **Integration**: Real-world documentation scenarios with mixed content

### Test Structure

```
cypress/
├── e2e/
│   ├── basic-processing.cy.ts      # Core functionality tests
│   ├── configuration-options.cy.ts # Configuration testing
│   ├── error-handling.cy.ts        # Error scenarios
│   ├── functional-features.cy.ts   # FP paradigm tests
│   ├── performance.cy.ts           # Performance & scalability
│   └── integration.cy.ts           # Real-world scenarios
├── fixtures/
│   ├── sample-diagrams.json        # Test diagram samples
│   └── test-configs.json           # Configuration presets
└── support/
    ├── commands.ts                  # Custom Cypress commands
    └── e2e.ts                       # Test setup and utilities
```

### Custom Test Commands

The test suite includes custom Cypress commands for testing the processor:

```typescript
// Create test markdown files
cy.createTestMarkdown(path, content);

// Run the processor with configuration
cy.runMermaidProcessor(config);

// Verify SVG generation
cy.verifySvgGenerated(paths);

// Verify markdown updates
cy.verifyMarkdownUpdated(path, expectedContent);

// Clean up test files
cy.cleanupTestFiles(pattern);
```

## Contributing

This library follows functional programming principles:

1. **Pure Functions**: Functions should be pure with no side effects
2. **Immutability**: Use readonly properties and avoid mutations
3. **Composition**: Build complex operations from simple, composable functions
4. **Type Safety**: Leverage TypeScript's type system for correctness
5. **Error Handling**: Use Either/Maybe monads instead of throwing exceptions

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Implement the feature following FP principles
5. Run the full test suite: `npm run test:runner`
6. Submit a pull request

### Test Requirements

All contributions must include:
- Unit tests for new functions
- E2E tests for new features
- Type safety validation
- Documentation updates

## License

MIT