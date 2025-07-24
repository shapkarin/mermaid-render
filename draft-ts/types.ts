/**
 * Core types for the functional Mermaid processor
 */

export interface ProcessorConfig {
  readonly inputDir: string;
  readonly outputDir: string;
  readonly baseUrl: string;
  readonly defaultTheme: Theme;
  readonly generateBothThemes: boolean;
  readonly includeSourceCode: boolean;
  readonly sourceCodeStyle: SourceCodeStyle;
  readonly backgroundColor: string;
  readonly concurrent: number;
  readonly skipExisting: boolean;
  readonly verbose: boolean;
  readonly dbPath?: string;
}

export type Theme = 'light' | 'dark' | 'neutral' | 'forest' | 'base' | 'default';

export type SourceCodeStyle = 'inline' | 'blockquote' | 'footnote' | 'details' | 'none';

export interface ProcessingStats {
  readonly filesProcessed: number;
  readonly diagramsGenerated: number;
  readonly diagramsSkipped: number;
  readonly errors: number;
}

export interface DiagramInfo {
  readonly id: string;
  readonly code: string;
  readonly altText: string;
  readonly index: number;
}

export interface ProcessingResult {
  readonly success: boolean;
  readonly filePath: string;
  readonly diagramsProcessed: number;
  readonly error?: string;
}

export interface CacheEntry {
  readonly contentHash: string;
  readonly svgPath: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface FileAnalysis {
  readonly totalMermaidBlocks: number;
  readonly hasUnprocessedBlocks: boolean;
  readonly needsProcessing: boolean;
}

export interface DatabaseOperations {
  readonly init: () => Promise<void>;
  readonly close: () => Promise<void>;
  readonly checkCached: (hash: string) => Promise<string | null>;
  readonly store: (hash: string, path: string) => Promise<void>;
}