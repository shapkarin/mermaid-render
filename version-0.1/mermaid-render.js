const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const matter = require('gray-matter');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const mermaidConfig = require('./mermaid.config.js');

/**
 * Simple Mermaid SVG Generator with SQLite Hash Cache
 * Processes markdown files and converts mermaid diagrams to SVG images
 * Uses SQLite to cache diagram hashes and avoid regenerating unchanged content
 */
class MermaidProcessor {
  constructor(config = {}) {
    this.config = {
      ...config
    };
    
    this.stats = {
      filesProcessed: 0,
      diagramsGenerated: 0,
      diagramsSkipped: 0,
      errors: 0
    };

    this.db = null;
    this.dbPath = path.join(__dirname, 'mermaid-hashes.db');
  }

  /**
   * Initialize SQLite database for hash caching
   */
  async initDatabase() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (this.config.verbose) {
          console.log(`📊 Connected to SQLite database: ${this.dbPath}`);
        }
        
        // Create table if it doesn't exist
        this.db.run(`
          CREATE TABLE IF NOT EXISTS mermaid_hashes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content_hash TEXT UNIQUE NOT NULL,
            svg_path TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  }

  /**
   * Close database connection
   */
  async closeDatabase() {
    if (this.db) {
      return new Promise((resolve) => {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
          }
          resolve();
        });
      });
    }
  }

  /**
   * Check if SVG exists in cache and file system
   */
  async checkCachedSVG(contentHash) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT svg_path FROM mermaid_hashes WHERE content_hash = ?',
        [contentHash],
        async (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (!row) {
            resolve(null);
            return;
          }
          
          // Check if SVG file actually exists
          try {
            await fs.access(row.svg_path);
            resolve(row.svg_path);
          } catch {
            // File doesn't exist, remove from cache
            this.db.run('DELETE FROM mermaid_hashes WHERE content_hash = ?', [contentHash]);
            resolve(null);
          }
        }
      );
    });
  }

  /**
   * Store SVG path in cache
   */
  async storeCachedSVG(contentHash, svgPath) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO mermaid_hashes (content_hash, svg_path, updated_at) 
         VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [contentHash, svgPath],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  /**
   * Generate SVG from Mermaid code using stdin with hash-based caching
   */
  async generateSVG(mermaidCode, outputPath, theme = 'dark') {
    try {
      // Generate content hash for caching (include output path to handle same content in different files)
      const contentHash = crypto
        .createHash('md5')
        .update(mermaidCode.trim() + theme + outputPath)
        .digest('hex');

      // Check if we already have this SVG cached
      const cachedPath = await this.checkCachedSVG(contentHash);
      if (cachedPath && cachedPath === outputPath) {
        this.stats.diagramsSkipped++;
        if (this.config.verbose) {
          console.log(`🔄 Using cached: ${path.basename(outputPath)} (${theme})`);
        }
        return outputPath;
      }

      // Ensure output directory exists
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      
      // Use mermaid CLI with stdin input (no temp files)
      const command = `echo "${mermaidCode.replace(/"/g, '\\"')}" | npx mmdc -i /dev/stdin -o "${outputPath}" -t ${theme} -b transparent`;
      
      if (this.config.verbose) {
        console.log(`🎨 Generating: ${path.basename(outputPath)} (${theme})`);
      }
      
      execSync(command, { 
        stdio: this.config.verbose ? 'inherit' : 'pipe',
        cwd: process.cwd()
      });
      
      // Verify SVG was created
      const content = await fs.readFile(outputPath, 'utf8');
      if (!content.includes('<svg')) {
        throw new Error('Generated SVG is invalid');
      }

      // Store in cache
      await this.storeCachedSVG(contentHash, outputPath);
      
      this.stats.diagramsGenerated++;
      if (this.config.verbose) {
        console.log(`✅ Generated: ${path.basename(outputPath)}`);
      }
      
      return outputPath;
      
    } catch (error) {
      this.stats.errors++;
      console.error(`❌ Failed to generate ${path.basename(outputPath)}: ${error.message}`);
      return null;
    }
  }

  /**
   * Generate unique diagram ID from content
   */
  generateDiagramId(mermaidCode) {
    return crypto
      .createHash('md5')
      .update(mermaidCode.trim())
      .digest('hex')
      .substring(0, 8);
  }

  /**
   * Generate descriptive alt text from mermaid code
   */
  generateAltText(mermaidCode) {
    const firstLine = mermaidCode.trim().split('\n')[0];
    const typeMatch = firstLine.match(/^(graph|flowchart|sequenceDiagram|classDiagram|pie|journey|gantt|stateDiagram|erDiagram)/);
    const type = typeMatch ? typeMatch[1] : 'diagram';
    
    const titleMatch = mermaidCode.match(/title[:\s]+([^\n]+)/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    
    if (title) {
      return `${type.charAt(0).toUpperCase() + type.slice(1)}: ${title}`;
    }
    
    return `${type.charAt(0).toUpperCase() + type.slice(1)} diagram`;
  }

  /**
   * Check if file has unprocessed mermaid blocks
   * Returns an object with information about processed/unprocessed blocks
   */
  analyzeFileProcessingStatus(markdownContent, filePath) {
    
    // Find all mermaid blocks
    const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
    const mermaidMatches = [...markdownContent.matchAll(mermaidRegex)];
    
    const totalMermaidBlocks = mermaidMatches.length;
    const hasUnprocessedBlocks = totalMermaidBlocks > 0;
    
    return {
      totalMermaidBlocks,
      hasUnprocessedBlocks,
      needsProcessing: hasUnprocessedBlocks // Always process if mermaid blocks exist
    };
  }

  /**
   * Process a single markdown file
   */
  async processMarkdownFile(filePath) {
    try {
      if (this.config.verbose) {
        console.log(`📄 Processing: ${path.basename(filePath)}`);
      }
      
      const content = await fs.readFile(filePath, 'utf8');
      const { data: frontMatter, content: markdownContent } = matter(content);
      
      // Analyze processing status
      const status = this.analyzeFileProcessingStatus(markdownContent, filePath);
      
      if (!status.needsProcessing) {
        if (this.config.verbose) {
          console.log(`⏭️  No mermaid diagrams found in ${path.basename(filePath)}`);
        }
        return 0;
      }
      
      // First, remove any existing SVG references that are followed by mermaid blocks
      let processedContent = markdownContent;
      
      // Clean up any existing SVG + mermaid combinations
      const cleanupRegex = /!\[[^\]]*\]\([^)]*\.svg[^)]*\)\s*```mermaid\n([\s\S]*?)\n```/g;
      const cleanupMatches = [...markdownContent.matchAll(cleanupRegex)];
      
      if (this.config.verbose && cleanupMatches.length > 0) {
        console.log(`🧹 Found ${cleanupMatches.length} SVG+mermaid combinations to clean up`);
      }
      
      // Replace SVG + mermaid combinations with just the mermaid block temporarily
      for (const [fullMatch, mermaidCode] of cleanupMatches) {
        const mermaidBlock = `\`\`\`mermaid\n${mermaidCode}\n\`\`\``;
        processedContent = processedContent.replace(fullMatch, mermaidBlock);
        
        if (this.config.verbose) {
          console.log(`🧹 Cleaned up SVG+mermaid combination, restored pure mermaid block`);
        }
      }
      
      // Now find all remaining mermaid blocks
      const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
      const matches = [...processedContent.matchAll(mermaidRegex)];
      
      if (matches.length === 0) {
        if (this.config.verbose) {
          console.log(`⏭️  No mermaid diagrams found in ${path.basename(filePath)}`);
        }
        return 0;
      }
      
      const baseFilename = path.basename(filePath, '.md');
      
      if (this.config.verbose) {
        console.log(`🔄 Processing ${matches.length} mermaid diagrams in ${path.basename(filePath)}`);
      }
      
      // Process each mermaid diagram
      for (let i = 0; i < matches.length; i++) {
        const [fullMatch, mermaidCode] = matches[i];
        const filename = `${baseFilename}-${i}`;
        
        if (this.config.verbose) {
          console.log(`🎯 Processing diagram ${i + 1}/${matches.length}: ${filename}`);
        }
        
        let imageUrl;
        
        if (this.config.generateBothThemes) {
          // Generate both themes
          const lightPath = path.join(this.config.outputDir, 'light', `${filename}.svg`);
          const darkPath = path.join(this.config.outputDir, 'dark', `${filename}.svg`);
          
          const [lightResult, darkResult] = await Promise.all([
            this.generateSVG(mermaidCode, lightPath, 'default'),  // Use 'default' instead of 'light'
            this.generateSVG(mermaidCode, darkPath, 'dark')
          ]);
          
          if (!lightResult || !darkResult) {
            console.error(`❌ Failed to generate both themes for ${filename}`);
            continue;
          }
          
          // Use dark theme as default for now
          imageUrl = `${this.config.baseUrl}/dark/${filename}.svg`;
        } else {
          // Generate single theme
          const outputPath = path.join(this.config.outputDir, `${filename}.svg`);
          const result = await this.generateSVG(mermaidCode, outputPath, this.config.defaultTheme);
          
          if (!result) {
            console.error(`❌ Failed to generate ${filename}`);
            continue;
          }
          
          imageUrl = `${this.config.baseUrl}/${filename}.svg`;
        }
        
        // Create replacement markdown - just the image, no mermaid block
        const altText = this.generateAltText(mermaidCode);
        let replacement = `![${altText}](${imageUrl})`;
        
        // Add source code if requested
        if (this.config.includeSourceCode && this.config.sourceCodeStyle !== 'none') {
          if (this.config.sourceCodeStyle === 'inline') {
            replacement += `\n\`\`\`mermaid\n${mermaidCode.trim()}\n\`\`\``;
          } else if (this.config.sourceCodeStyle === 'details') {
            replacement += `\n\n<details>\n  <summary>Show Mermaid Code</summary>\n  <pre><code class="language-mermaid">${mermaidCode.trim()}</code></pre>\n</details>`;
          }
        }
        
        if (this.config.verbose) {
          console.log(`📝 Replacing mermaid block with: ${replacement}`);
        }
        
        // Replace in content
        processedContent = processedContent.replace(fullMatch, replacement);
        
        if (this.config.verbose) {
          console.log(`🔄 Replacement completed for diagram ${i + 1}`);
        }
      }
      
      // Write back if changed
      if (processedContent !== markdownContent) {
        const processedFile = matter.stringify(processedContent, frontMatter);
        await fs.writeFile(filePath, processedFile);
        this.stats.filesProcessed++;
        
        if (this.config.verbose) {
          console.log(`✅ Updated: ${path.basename(filePath)} (processed ${matches.length} diagrams)`);
        }
      } else {
        if (this.config.verbose) {
          console.log(`ℹ️  No changes needed for: ${path.basename(filePath)}`);
          console.log(`📊 Original length: ${markdownContent.length}, Processed length: ${processedContent.length}`);
          // Show a small snippet to debug content
          const snippet = Math.min(50, markdownContent.length);
          console.log(`📄 Original snippet: "${markdownContent.substring(0, snippet)}..."`);
          console.log(`📄 Processed snippet: "${processedContent.substring(0, snippet)}..."`);
        }
      }
      
      return matches.length;
      
    } catch (error) {
      this.stats.errors++;
      console.error(`❌ Failed to process ${filePath}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Find all markdown files
   */
  async findMarkdownFiles() {
    const files = [];
    
    const scanDirectory = async (dir) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            await scanDirectory(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.md')) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        console.error(`❌ Error scanning directory ${dir}: ${error.message}`);
      }
    };
    
    await scanDirectory(this.config.inputDir);
    return files;
  }

  /**
   * Process all markdown files
   */
  async processAllMarkdownFiles() {
    const startTime = Date.now();
    
    console.log(`🚀 Starting Mermaid processor with SQLite caching`);
    console.log(`📂 Input: ${this.config.inputDir}`);
    console.log(`📂 Output: ${this.config.outputDir}`);
    console.log(`🎨 Theme: ${this.config.defaultTheme}${this.config.generateBothThemes ? ' (both themes)' : ''}`);
    console.log(`📊 Database: ${this.dbPath}`);

    try {
      // Initialize database
      await this.initDatabase();
      
      const markdownFiles = await this.findMarkdownFiles();
      
      if (markdownFiles.length === 0) {
        console.log('⚠️  No markdown files found');
        return;
      }
      
      console.log(`📚 Found ${markdownFiles.length} markdown files:`);
      markdownFiles.forEach(file => {
        console.log(`  - ${path.relative(process.cwd(), file)}`);
      });
      
      let totalDiagrams = 0;
      
      // Process each file
      for (const file of markdownFiles) {
        const diagramCount = await this.processMarkdownFile(file);
        totalDiagrams += diagramCount;
      }
      
      // Print summary
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log('\n🎉 Processing Complete!');
      console.log('═'.repeat(50));
      console.log(`📁 Files processed: ${this.stats.filesProcessed}`);
      console.log(`🎨 Diagrams generated: ${this.stats.diagramsGenerated}`);
      console.log(`🔄 Diagrams skipped (cached): ${this.stats.diagramsSkipped}`);
      console.log(`📊 Total diagrams found: ${totalDiagrams}`);
      console.log(`❌ Errors: ${this.stats.errors}`);
      console.log(`⏱️  Duration: ${duration}s`);
      console.log(`📂 Output directory: ${this.config.outputDir}`);
      console.log(`📊 Cache database: ${this.dbPath}`);
      console.log('═'.repeat(50));

    } finally {
      // Always close database connection
      await this.closeDatabase();
    }
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  const preset = args.find(arg => arg.startsWith('--preset='))?.split('=')[1] || 'shapkarin';
  const verbose = args.includes('--verbose') || args.includes('-v');
  
  // Get configuration from external config file
  const config = mermaidConfig.getConfig(preset);
  
  // Override with CLI flags
  if (verbose !== undefined) {
    config.verbose = verbose;
  }
  
  let processor;
  
  try {
    processor = new MermaidProcessor(config);
    await processor.processAllMarkdownFiles();
    process.exit(0);
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    if (config.verbose) {
      console.error(error.stack);
    }
    
    // Ensure database is closed even on error
    if (processor) {
      try {
        await processor.closeDatabase();
      } catch (dbError) {
        console.error('Error closing database:', dbError.message);
      }
    }
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { MermaidProcessor, config: mermaidConfig };
