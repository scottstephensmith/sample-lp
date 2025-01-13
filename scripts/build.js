const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');
const matter = require('gray-matter');

async function build() {
  console.log('Starting build process...');
  
  await fs.ensureDir('dist');
  await fs.copy('src/static', 'dist');
  
  const contentDir = path.join(__dirname, '../src/content');
  await buildPages(contentDir);
}

async function buildPages(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  // Collect blog posts for the index
  let blogPosts = [];
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    console.log('Processing:', entry.name);
    
    if (entry.isDirectory()) {
      const relativePath = path.relative(path.join(__dirname, '../src/content'), fullPath);
      const distPath = path.join('dist', relativePath);
      await fs.ensureDir(distPath);
      
      // If this is the blog directory, collect posts
      if (relativePath === 'blog') {
        blogPosts = await buildPages(fullPath);
      } else {
        await buildPages(fullPath);
      }
    } else if (entry.name.endsWith('.md')) {
      const content = await fs.readFile(fullPath, 'utf-8');
      const { data, content: markdownContent } = matter(content);
      const html = marked.parse(markdownContent);
      
      // Determine which template to use
      const isBlogPost = fullPath.includes('/blog/') && entry.name !== 'index.md';
      const templateName = isBlogPost ? 'blog.html' : 'page.html';
      const template = await fs.readFile(`src/templates/${templateName}`, 'utf-8');
      
      // Extract title from frontmatter or first h1
      const title = data.title || markdownContent.match(/^#\s+(.+)$/m)?.[1] || entry.name.replace('.md', '');
      
      let finalHtml = template
        .replace('{{title}}', title)
        .replace('{{content}}', html)
        .replace('{{date}}', data.date || '')
        .replace('{{author}}', data.author || '');
      
      const relativePath = path.relative(path.join(__dirname, '../src/content'), fullPath);
      const outputPath = path.join('dist', relativePath.replace('.md', '.html'));
      
      await fs.ensureFile(outputPath);
      await fs.writeFile(outputPath, finalHtml);
      
      // Collect blog post data for the index
      if (isBlogPost) {
        blogPosts.push({
          title,
          date: data.date,
          author: data.author,
          excerpt: data.excerpt || markdownContent.split('\n').slice(1, 3).join(' '),
          url: '/' + relativePath.replace('.md', '.html')
        });
        
        // Handle ConvertKit form
        const convertKitForm = `
            <form action="https://app.kit.com/forms/7564401/subscriptions" 
                  class="seva-form formkit-form" 
                  method="post" 
                  data-sv-form="7564401" 
                  data-uid="077bf277df" 
                  data-format="inline" 
                  data-version="5" 
                  data-options='{"settings":{"after_subscribe":{"action":"message","success_message":"Success! Now check your email to confirm your subscription.","redirect_url":""},"analytics":{"google":null,"fathom":null,"facebook":null,"segment":null,"pinterest":null,"sparkloop":null,"googletagmanager":null},"modal":{"trigger":"timer","scroll_percentage":null,"timer":5,"devices":"all","show_once_every":15},"powered_by":{"show":true,"url":"https://kit.com/features/forms?utm_campaign=poweredby&utm_content=form&utm_medium=referral&utm_source=dynamic"},"recaptcha":{"enabled":false},"return_visitor":{"action":"show","custom_content":""},"slide_in":{"display_in":"bottom_right","trigger":"timer","scroll_percentage":null,"timer":5,"devices":"all","show_once_every":15},"sticky_bar":{"display_in":"top","trigger":"timer","scroll_percentage":null,"timer":5,"devices":"all","show_once_every":15}},"version":"5"}'>
                <div data-style="clean">
                    <ul class="formkit-alert formkit-alert-error" data-element="errors" data-group="alert"></ul>
                    <div data-element="fields" data-stacked="false" class="seva-fields formkit-fields">
                        <div class="formkit-field">
                            <input class="formkit-input" 
                                   name="email_address" 
                                   aria-label="Email Address" 
                                   placeholder="Email Address" 
                                   required="" 
                                   type="email" 
                                   style="color: rgb(0, 0, 0); border-color: rgb(227, 227, 227); border-radius: 4px; font-weight: 400;">
                        </div>
                        <button data-element="submit" 
                                class="formkit-submit formkit-submit" 
                                style="color: rgb(255, 255, 255); background-color: rgb(22, 119, 190); border-radius: 4px; font-weight: 400;">
                            <div class="formkit-spinner">
                                <div></div>
                                <div></div>
                                <div></div>
                            </div>
                            <span class="">Subscribe</span>
                        </button>
                    </div>
                </div>
            </form>
        `;

        finalHtml = finalHtml.replace(
            '{{convertkit}}',
            data.convertkit || convertKitForm
        );
      }
    }
  }
  
  // If we're in the blog directory, generate the index
  if (dir.endsWith('/blog')) {
    await generateBlogIndex(blogPosts);
  }
  
  return blogPosts;
}

async function generateBlogIndex(posts) {
  // Sort posts by date
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  const template = await fs.readFile('src/templates/page.html', 'utf-8');
  const blogListHtml = `
    <h1>Blog Posts</h1>
    <ul class="blog-list">
      ${posts.map(post => `
        <li>
          <h2><a href="${post.url}">${post.title}</a></h2>
          <div class="post-meta">
            <time datetime="${post.date}">${post.date}</time>
            ${post.author ? `<span class="author">by ${post.author}</span>` : ''}
          </div>
          <div class="excerpt">${post.excerpt}</div>
        </li>
      `).join('\n')}
    </ul>
  `;
  
  const finalHtml = template
    .replace('{{title}}', 'Blog')
    .replace('{{content}}', blogListHtml);
  
  await fs.writeFile('dist/blog/index.html', finalHtml);
}

build().catch(error => {
  console.error('Build failed:', error);
  process.exit(1);
}); 