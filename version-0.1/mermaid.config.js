/**
 * Mermaid Processor Configuration
 * 
 * Easily customize your Mermaid diagram processing settings here.
 * This file allows you to override defaults without modifying the core processor.
 */

const config = {
  // === INPUT CONFIGURATION ===
  // Directory containing your markdown files
  inputDir: './public/api/articles',
  
  // === OUTPUT CONFIGURATION ===
  // Where to save generated SVG files
  outputDir: './public/api/articles',

  // Base URL for images in markdown (how they'll appear in ![alt](url))
  baseUrl: '/api/articles',
  
  // === THEME CONFIGURATION ===
  // Default theme: 'light', 'dark', 'neutral', 'forest', 'base'
  defaultTheme: 'dark',
  
  // Generate both light and dark versions?
  generateBothThemes: false,
  
  // === MARKDOWN GENERATION ===
  // Include original Mermaid source code in the generated markdown?
  includeSourceCode: true,
  
  // How to display source code: 'inline', 'blockquote', 'footnote', 'details', or 'none'
  // 'inline' - Direct code block below image
  // 'blockquote' - Source code in a blockquote
  // 'footnote' - Reference-style with code at bottom
  // 'details' - HTML details/summary collapsible section
  // 'none' - Same as includeSourceCode: false
  sourceCodeStyle: 'inline',
  
  // === SVG QUALITY SETTINGS ===
  // Background color for SVGs
  backgroundColor: 'transparent',
  
  // === PERFORMANCE SETTINGS ===
  // How many diagrams to process simultaneously
  concurrent: 2,
  
  // Skip existing files to speed up repeated builds
  skipExisting: false,
  
  // === LOGGING ===
  // Show detailed processing information
  verbose: true,
  
  // === ADVANCED SETTINGS ===
  // Timeout for individual diagram generation (milliseconds)
};

// === ENVIRONMENT-SPECIFIC OVERRIDES ===
// Override settings based on NODE_ENV
if (process.env.NODE_ENV === 'production') {
  config.verbose = false;
}

if (process.env.NODE_ENV === 'development') {
  config.verbose = true;
}

module.exports = {
  default: config,
  
  // Helper function to get config with preset
  getConfig: (presetName = 'default') => {
    if (presetName === 'default') return config;
    
    console.warn(`⚠️  Preset '${presetName}' not found, using default config`);
    return config;
  }
}; 