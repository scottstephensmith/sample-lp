const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');

async function build() {
  console.log('Starting build process...');
  
  // Ensure dist directory exists
  await fs.ensureDir('dist');
  console.log('Created dist directory');

  // Copy static assets (including index.html)
  await fs.copy('src/static', 'dist');
  console.log('Copied static assets');

  // Build pages from markdown
  const contentDir = path.join(__dirname, '../src/content');
  console.log('Processing content from:', contentDir);
  await buildPages(contentDir);
  
  console.log('Build complete!');
}

async function buildPages(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    console.log('Processing:', entry.name);
    
    if (entry.isDirectory()) {
      // If it's a directory, recursively process it
      const relativePath = path.relative(path.join(__dirname, '../src/content'), fullPath);
      const distPath = path.join('dist', relativePath);
      console.log('Creating directory:', distPath);
      await fs.ensureDir(distPath);
      await buildPages(fullPath);
    } else if (entry.name.endsWith('.md') && entry.name !== 'index.md') { // Skip index.md
      // Process markdown file
      const content = await fs.readFile(fullPath, 'utf-8');
      const html = marked.parse(content);
      const template = await fs.readFile('src/templates/page.html', 'utf-8');
      
      // Extract title from the first h1 in markdown
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : entry.name.replace('.md', '');
      
      let finalHtml = template
        .replace('{{title}}', title)
        .replace('{{content}}', html);
      
      // Calculate output path
      const relativePath = path.relative(path.join(__dirname, '../src/content'), fullPath);
      const outputPath = path.join('dist', relativePath.replace('.md', '.html'));
      console.log('Writing file:', outputPath);
      
      await fs.ensureFile(outputPath);
      await fs.writeFile(outputPath, finalHtml);
    }
  }
}

build().catch(error => {
  console.error('Build failed:', error);
  process.exit(1);
}); 