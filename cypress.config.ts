import { defineConfig } from 'cypress';
import webpack from '@cypress/webpack-preprocessor';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    fixturesFolder: 'cypress/fixtures',
    screenshotsFolder: 'cypress/screenshots',
    videosFolder: 'cypress/videos',
    video: true,
    screenshot: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    setupNodeEvents(on, config) {
      // TypeScript support
      const options = {
        webpackOptions: {
          resolve: {
            extensions: ['.ts', '.tsx', '.js'],
          },
          module: {
            rules: [
              {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                options: {
                  transpileOnly: true,
                },
              },
            ],
          },
        },
      };
      
      on('file:preprocessor', webpack(options));
      
      // Custom tasks for file system operations
      on('task', {
        // Create test files
        createTestFile: ({ path, content }: { path: string; content: string }) => {
          const fs = require('fs');
          const pathModule = require('path');
          
          const dir = pathModule.dirname(path);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          fs.writeFileSync(path, content);
          return null;
        },
        
        // Read file content
        readFile: (path: string) => {
          const fs = require('fs');
          try {
            return fs.readFileSync(path, 'utf8');
          } catch (error) {
            return null;
          }
        },
        
        // Check if file exists
        fileExists: (path: string) => {
          const fs = require('fs');
          return fs.existsSync(path);
        },
        
        // Clean up test files
        cleanupTestFiles: (pattern: string) => {
          const fs = require('fs');
          const glob = require('glob');
          
          const files = glob.sync(pattern);
          files.forEach((file: string) => {
            try {
              fs.unlinkSync(file);
            } catch (error) {
              // Ignore errors
            }
          });
          
          return files.length;
        },
        
        // Run processor programmatically
        runProcessor: async (config: any) => {
          const { processMermaidDiagrams } = require('./dist/index.js');
          
          try {
            const result = await processMermaidDiagrams(config);
            return result.fold(
              (error: string) => ({ success: false, error }),
              (stats: any) => ({ success: true, stats })
            );
          } catch (error) {
            return { success: false, error: error.message };
          }
        }
      });
      
      return config;
    },
  },
  
  component: {
    devServer: {
      framework: 'create-react-app',
      bundler: 'webpack',
    },
  },
});