const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');

async function build() {
  // Ensure dist directory exists
  await fs.ensureDir('dist');

  // Copy static assets
  await fs.copy('src/static', 'dist');

  // Build pages from markdown
  const contentDir = path.join(__dirname, '../src/content');
  const files = await fs.readdir(contentDir);
  
  for (const file of files) {
    if (file.endsWith('.md')) {
      const content = await fs.readFile(path.join(contentDir, file), 'utf-8');
      const html = marked.parse(content);
      const template = await fs.readFile('src/templates/page.html', 'utf-8');
      const finalHtml = template.replace('{{content}}', html);
      
      const outputPath = path.join('dist', file.replace('.md', '.html'));
      await fs.writeFile(outputPath, finalHtml);
    }
  }
}

build().catch(console.error); 