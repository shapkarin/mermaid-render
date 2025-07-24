/**
 * Core functional processing logic for Mermaid diagrams
 */

import { readFile, writeFile, readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import matter from 'gray-matter';
import { 
  ProcessorConfig, 
  DiagramInfo, 
  ProcessingResult, 
  FileAnalysis,
  ProcessingStats 
} from './types';
import { Either, Left, Right, Maybe, createContentHash, asyncPipe } from './utils';

/**
 * Extract Mermaid diagrams from markdown content
 */
export const extractMermaidDiagrams = (content: string): DiagramInfo[] => {
  const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
  const diagrams: DiagramInfo[] = [];
  let match;
  let index = 0;

  while ((match = mermaidRegex.exec(content)) !== null) {
    const code = match[1].trim();
    const id = createContentHash(code).substring(0, 8);
    const altText = `Mermaid diagram ${index + 1}`;
    
    diagrams.push({
      id,
      code,
      altText,
      index
    });
    index++;
  }

  return diagrams;
};

/**
 * Analyze a file to determine if it needs processing
 */
export const analyzeFile = async (filePath: string): Promise<Either<string, FileAnalysis>> => {
  try {
    const content = await readFile(filePath, 'utf-8');
    const diagrams = extractMermaidDiagrams(content);
    
    return new Right({
      totalMermaidBlocks: diagrams.length,
      hasUnprocessedBlocks: diagrams.length > 0,
      needsProcessing: diagrams.length > 0
    });
  } catch (error) {
    return new Left(`Failed to analyze file ${filePath}: ${error}`);
  }
};

/**
 * Check if a file is a markdown file
 */
export const isMarkdownFile = (filePath: string): boolean => 
  ['.md', '.mdx'].includes(extname(filePath).toLowerCase());

/**
 * Get all markdown files from a directory recursively
 */
export const getMarkdownFiles = async (dir: string): Promise<string[]> => {
  const files: string[] = [];
  
  const processDirectory = async (currentDir: string): Promise<void> => {
    const entries = await readdir(currentDir);
    
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stats = await stat(fullPath);
      
      if (stats.isDirectory()) {
        await processDirectory(fullPath);
      } else if (isMarkdownFile(entry)) {
        files.push(fullPath);
      }
    }
  };
  
  await processDirectory(dir);
  return files;
};

/**
 * Generate SVG from Mermaid code (placeholder - would integrate with actual Mermaid renderer)
 */
export const generateSvg = async (
  diagramCode: string, 
  theme: string = 'dark'
): Promise<Either<string, string>> => {
  try {
    // This would integrate with the actual Mermaid renderer
    // For now, returning a placeholder SVG
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
      <text x="10" y="50" fill="currentColor">Mermaid Diagram (${theme})</text>
      <text x="10" y="70" fill="currentColor" font-size="12">${diagramCode.substring(0, 30)}...</text>
    </svg>`;
    
    return new Right(svg);
  } catch (error) {
    return new Left(`Failed to generate SVG: ${error}`);
  }
};

/**
 * Process a single diagram
 */
export const processDiagram = (config: ProcessorConfig) => 
  async (diagram: DiagramInfo, filePath: string): Promise<Either<string, string>> => {
    const svgResult = await generateSvg(diagram.code, config.defaultTheme);
    
    return svgResult.flatMap(svg => {
      try {
        const fileName = `${basename(filePath, extname(filePath))}-${diagram.id}.svg`;
        const outputPath = join(config.outputDir, fileName);
        
        // Write SVG file (this would be done in the actual implementation)
        return new Right(outputPath);
      } catch (error) {
        return new Left(`Failed to save diagram: ${error}`);
      }
    });
  };

/**
 * Replace Mermaid blocks with SVG references in markdown content
 */
export const replaceMermaidBlocks = (
  content: string, 
  diagrams: DiagramInfo[], 
  svgPaths: string[],
  config: ProcessorConfig
): string => {
  let updatedContent = content;
  const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
  let index = 0;

  updatedContent = updatedContent.replace(mermaidRegex, (match, code) => {
    if (index < svgPaths.length) {
      const svgPath = svgPaths[index];
      const diagram = diagrams[index];
      const relativePath = svgPath.replace(config.outputDir, config.baseUrl);
      
      let replacement = `![${diagram.altText}](${relativePath})`;
      
      if (config.includeSourceCode && config.sourceCodeStyle !== 'none') {
        switch (config.sourceCodeStyle) {
          case 'inline':
            replacement += `\n\n\`\`\`mermaid\n${code}\n\`\`\``;
            break;
          case 'details':
            replacement += `\n\n<details>\n<summary>View source</summary>\n\n\`\`\`mermaid\n${code}\n\`\`\`\n\n</details>`;
            break;
          case 'blockquote':
            replacement += `\n\n> \`\`\`mermaid\n> ${code.replace(/\n/g, '\n> ')}\n> \`\`\``;
            break;
        }
      }
      
      index++;
      return replacement;
    }
    return match;
  });

  return updatedContent;
};

/**
 * Process a single markdown file
 */
export const processFile = (config: ProcessorConfig) => 
  async (filePath: string): Promise<ProcessingResult> => {
    try {
      const content = await readFile(filePath, 'utf-8');
      const diagrams = extractMermaidDiagrams(content);
      
      if (diagrams.length === 0) {
        return {
          success: true,
          filePath,
          diagramsProcessed: 0
        };
      }

      // Process all diagrams
      const processDiagramFn = processDiagram(config);
      const svgResults = await Promise.all(
        diagrams.map(diagram => processDiagramFn(diagram, filePath))
      );

      // Check for errors
      const errors = svgResults.filter(result => result.isLeft());
      if (errors.length > 0) {
        const errorMessages = errors.map(error => 
          error.fold(msg => msg, () => '')
        ).join('; ');
        
        return {
          success: false,
          filePath,
          diagramsProcessed: 0,
          error: errorMessages
        };
      }

      // Extract successful paths
      const svgPaths = svgResults.map(result => 
        result.fold(() => '', path => path)
      );

      // Update markdown content
      const updatedContent = replaceMermaidBlocks(content, diagrams, svgPaths, config);
      
      // Write updated file
      await writeFile(filePath, updatedContent, 'utf-8');

      return {
        success: true,
        filePath,
        diagramsProcessed: diagrams.length
      };
    } catch (error) {
      return {
        success: false,
        filePath,
        diagramsProcessed: 0,
        error: `Failed to process file: ${error}`
      };
    }
  };

/**
 * Process all markdown files in a directory
 */
export const processDirectory = (config: ProcessorConfig) => 
  async (): Promise<ProcessingStats> => {
    const files = await getMarkdownFiles(config.inputDir);
    const processFileFn = processFile(config);
    
    // Process files with concurrency limit
    const results: ProcessingResult[] = [];
    const chunks = [];
    
    for (let i = 0; i < files.length; i += config.concurrent) {
      chunks.push(files.slice(i, i + config.concurrent));
    }
    
    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(processFileFn)
      );
      results.push(...chunkResults);
    }
    
    // Calculate statistics
    const stats: ProcessingStats = {
      filesProcessed: results.length,
      diagramsGenerated: results.reduce((sum, result) => 
        sum + (result.success ? result.diagramsProcessed : 0), 0
      ),
      diagramsSkipped: 0, // Would be calculated based on cache hits
      errors: results.filter(result => !result.success).length
    };
    
    return stats;
  };