// generate-blog.js
// Converts Markdown posts in /blog/generate into HTML pages in /blog/posts
// and builds /blog/index.html using structured placeholders for the featured post.

'use strict';

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const baseDir = path.resolve(__dirname, '..', '..');
const blogDir = path.join(baseDir, 'blog');
const templateDir = path.join(blogDir, 'template');
const postsDir = path.join(blogDir, 'posts');
const generateDir = path.join(blogDir, 'generate');
const indexTemplatePath = path.join(templateDir, 'blog-index-template.html');
const postTemplatePath = path.join(templateDir, 'blog-post-template.html');

const postTemplate = fs.readFileSync(postTemplatePath, 'utf8');
const indexTemplate = fs.readFileSync(indexTemplatePath, 'utf8');

if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir, { recursive: true });

// helpers
const safe = (v, f = '') => (v === undefined || v === null ? f : String(v));
const toSlug = (title, fallback) =>
  title
    ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    : (fallback || '').replace(/\.md$/i, '');

const toDateParts = (d) => {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return { iso: '', human: '' };
  return {
    iso: dt.toISOString(),
    human: dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  };
};

const firstCategory = (data) => {
  if (data.category) return data.category;
  if (Array.isArray(data.tags) && data.tags.length) return String(data.tags[0]);
  return '';
};

// Remove a leading H1 from markdown so we don’t duplicate the title from the template.
const stripLeadingH1 = (md) => md.replace(/^\s*#\s+.+?\n+/, '');

// main
async function generatePosts() {
  const markdownFiles = fs.existsSync(generateDir)
    ? fs.readdirSync(generateDir).filter(f => f.endsWith('.md'))
    : [];
  const posts = [];

  for (const file of markdownFiles) {
    const filePath = path.join(generateDir, file);
    const raw = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(raw);

    const slug = toSlug(data.title, file);
    const url = `/blog/posts/${slug}.html`;
    const { iso: date_iso, human: date_human } = toDateParts(data.date);
    const category = firstCategory(data);

    const htmlContent = marked(stripLeadingH1(content));

    const finalPostHtml = postTemplate
      .replace(/{{title}}/g, safe(data.title))
      .replace(/{{description}}/g, safe(data.description))
      .replace(/{{image}}/g, safe(data.image))
      .replace(/{{url}}/g, url)
      .replace(/{{slug}}/g, slug)
      .replace(/{{date_iso}}/g, safe(date_iso))
      .replace(/{{date_human}}/g, safe(date_human))
      .replace(/{{category}}/g, safe(category))
      .replace(/{{content}}/g, htmlContent);

    fs.writeFileSync(path.join(postsDir, `${slug}.html`), finalPostHtml);

    posts.push({
      title: safe(data.title),
      description: safe(data.description),
      image: safe(data.image),
      date: data.date,
      date_iso,
      date_human,
      category,
      slug,
      url,
      tags: Array.isArray(data.tags) ? data.tags : [],
    });
  }

  // newest first
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  // build index
  let finalIndexHtml = indexTemplate;
  let previousPostsHtml = '';

  if (posts.length) {
    const f = posts[0];

    previousPostsHtml = posts.slice(1).map(p => {
      const tags = (p.tags || []).map(t => `#${t}`).join(' ');
      return `
        <div class="post-preview">
          <h3><a href="${p.url}">${p.title}</a></h3>
          <p class="post-meta">
            <span class="post-date">${safe(p.date)}</span>
            <span class="post-tags">${safe(tags)}</span>
          </p>
          <p>${safe(p.description)}</p>
        </div>
      `;
    }).join('');

    finalIndexHtml = finalIndexHtml
      .replace(/{{featured_title}}/g, f.title)
      .replace(/{{featured_url}}/g, f.url)
      .replace(/{{featured_date_iso}}/g, safe(f.date_iso))
      .replace(/{{featured_date_human}}/g, safe(f.date_human))
      .replace(/{{featured_category}}/g, safe(f.category))
      .replace(/{{featured_hero}}/g, safe(f.image))
      .replace(/{{featured_hero_alt}}/g, f.title)
      .replace(/{{featured_excerpt}}/g, safe(f.description))
      .replace(/{{previous_posts}}/g, previousPostsHtml);
  } else {
    finalIndexHtml = finalIndexHtml
      .replace(/{{featured_title}}|{{featured_url}}|{{featured_date_iso}}|{{featured_date_human}}|{{featured_category}}|{{featured_hero}}|{{featured_hero_alt}}|{{featured_excerpt}}/g, '')
      .replace(/{{previous_posts}}/g, '');
  }

  fs.writeFileSync(path.join(blogDir, 'index.html'), finalIndexHtml);
}

generatePosts().catch(err => {
  console.error('Error generating blog:', err);
  process.exit(1);
});

