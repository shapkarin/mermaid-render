import { ProcessorConfig } from './types';

/**
 * Default configuration for the Mermaid processor
 */
export const defaultConfig: ProcessorConfig = {
  inputDir: './public/api/articles',
  outputDir: './public/api/articles',
  baseUrl: '/api/articles',
  defaultTheme: 'dark',
  generateBothThemes: false,
  includeSourceCode: true,
  sourceCodeStyle: 'inline',
  backgroundColor: 'transparent',
  concurrent: 2,
  skipExisting: false,
  verbose: true,
} as const;

/**
 * Create a configuration by merging defaults with user overrides
 */
export const createConfig = (overrides: Partial<ProcessorConfig> = {}): ProcessorConfig => ({
  ...defaultConfig,
  ...overrides,
});

/**
 * Environment-specific configuration adjustments
 */
export const applyEnvironmentConfig = (config: ProcessorConfig): ProcessorConfig => {
  const env = process.env.NODE_ENV;
  
  if (env === 'production') {
    return { ...config, verbose: false };
  }
  
  if (env === 'development') {
    return { ...config, verbose: true };
  }
  
  return config;
};