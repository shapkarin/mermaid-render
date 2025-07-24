/**
 * Main entry point for the functional Mermaid processor
 */

export * from './types';
export * from './config';
export * from './utils';
export * from './processor';
export * from './database';

import { ProcessorConfig, ProcessingStats } from './types';
import { createConfig, applyEnvironmentConfig } from './config';
import { processDirectory } from './processor';
import { createDatabaseOperations, safeDatabaseOperations } from './database';
import { Either, Left, Right, asyncPipe } from './utils';

/**
 * Main processing function with functional composition
 */
export const processMermaidDiagrams = async (
  userConfig: Partial<ProcessorConfig> = {}
): Promise<Either<string, ProcessingStats>> => {
  const config = applyEnvironmentConfig(createConfig(userConfig));
  
  try {
    // Initialize database if path is provided
    if (config.dbPath) {
      const dbOps = createDatabaseOperations(config.dbPath);
      const safeDbOps = safeDatabaseOperations(dbOps);
      
      const initResult = await safeDbOps.init();
      if (initResult.isLeft()) {
        return initResult.map(() => ({} as ProcessingStats));
      }
    }

    // Process directory
    const processDirectoryFn = processDirectory(config);
    const stats = await processDirectoryFn();
    
    return new Right(stats);
  } catch (error) {
    return new Left(`Processing failed: ${error}`);
  }
};

/**
 * Functional pipeline for processing with custom steps
 */
export const createProcessingPipeline = (config: ProcessorConfig) => {
  const steps = [
    processDirectory(config)
  ];
  
  return asyncPipe(...steps);
};

/**
 * Utility function to create a configured processor
 */
export const createProcessor = (userConfig: Partial<ProcessorConfig> = {}) => {
  const config = applyEnvironmentConfig(createConfig(userConfig));
  
  return {
    config,
    process: () => processMermaidDiagrams(userConfig),
    processDirectory: processDirectory(config)
  };
};

/**
 * CLI-friendly function for direct execution
 */
export const run = async (configPath?: string): Promise<void> => {
  let config: Partial<ProcessorConfig> = {};
  
  if (configPath) {
    try {
      const configModule = await import(configPath);
      config = configModule.default || configModule;
    } catch (error) {
      console.error(`Failed to load config from ${configPath}:`, error);
      process.exit(1);
    }
  }
  
  const result = await processMermaidDiagrams(config);
  
  result.fold(
    (error) => {
      console.error('Processing failed:', error);
      process.exit(1);
    },
    (stats) => {
      console.log('Processing completed successfully:');
      console.log(`- Files processed: ${stats.filesProcessed}`);
      console.log(`- Diagrams generated: ${stats.diagramsGenerated}`);
      console.log(`- Diagrams skipped: ${stats.diagramsSkipped}`);
      console.log(`- Errors: ${stats.errors}`);
    }
  );
};