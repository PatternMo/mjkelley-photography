// generate-blog.js
// Converts Markdown posts in /blog/generate into HTML pages in /blog/posts
// and builds /blog/index.html using structured placeholders for the featured post.

'use strict';

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

// --- Paths (same structure as before) ---
const baseDir = path.resolve(__dirname, '..', '..');
const blogDir = path.join(baseDir, 'blog');
const templateDir = path.join(blogDir, 'template');
const postsDir = path.join(blogDir, 'posts');
const generateDir = path.join(blogDir, 'generate');
const indexTemplatePath = path.join(templateDir, 'blog-index-template.html');
const postTemplatePath = path.join(templateDir, 'blog-post-template.html');

// --- Load templates ---
const postTemplate = fs.readFileSync(postTemplatePath, 'utf8');
const indexTemplate = fs.readFileSync(indexTemplatePath, 'utf8');

// --- Ensure output directories exist ---
if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir, { recursive: true });

// --- Helpers ---
function toSlug(title, fallback) {
  if (title && typeof title === 'string') {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  // Fallback to filename (without extension)
  return (fallback || '').replace(/\.md$/i, '');
}

function toDateParts(dateValue) {
  const d = new Date(dateValue);
  const date_iso = isNaN(d.getTime()) ? '' : d.toISOString();
  const date_human = isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return { date_iso, date_human };
}

function firstTagOrCategory(data) {
  if (data.category) return data.category;
  if (Array.isArray(data.tags) && data.tags.length) return data.tags[0];
  return '';
}

function safe(val, fallback = '') {
  return (val === undefined || val === null) ? fallback : String(val);
}

async function generatePosts() {
  const markdownFiles = fs.existsSync(generateDir)
    ? fs.readdirSync(generateDir).filter(file => file.endsWith('.md'))
    : [];
  const allPostsData = [];

  // --- Build each post page ---
  for (const file of markdownFiles) {
    const filePath = path.join(generateDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);

    const slug = toSlug(data.title, file);
    const url = `/blog/posts/${slug}.html`;
    const htmlContent = marked(content);

    const { date_iso, date_human } = toDateParts(data.date);
    const category = firstTagOrCategory(data);

    // Fill the single-post template
    const finalPostHtml = postTemplate
      .replace(/{{title}}/g, safe(data.title))
      .replace(/{{description}}/g, safe(data.description))
      .replace(/{{image}}/g, safe(data.image))
      .replace(/{{url}}/g, url)
      .replace(/{{slug}}/g, slug)
      .replace(/{{date_iso}}/g, date_iso)
      .replace(/{{date_human}}/g, date_human)
      .replace(/{{category}}/g, safe(category))
      .replace(/{{content}}/g, htmlContent);

    fs.writeFileSync(path.join(postsDir, `${slug}.html`), finalPostHtml);

    // Keep lightweight data for the index page
    allPostsData.push({
      ...data,
      slug,
      url,
      date_iso,
      date_human,
      category,
      // normalize common fields we reference later
      title: safe(data.title),
      description: safe(data.description),
      image: safe(data.image),
      date: data.date,
      tags: Array.isArray(data.tags) ? data.tags : []
    });
  }

  // --- Sort posts by date DESC for index ---
  allPostsData.sort((a, b) => new Date(b.date) - new Date(a.date));

  // --- Build the index page ---
  let previousPostsHtml = '';
  let finalIndexHtml = indexTemplate;

  if (allPostsData.length > 0) {
    const featured = allPostsData[0];

    // Build previous posts list (simple “preview” items)
    previousPostsHtml = allPostsData.slice(1).map(post => {
      const tags = (post.tags || []).map(tag => `#${tag}`).join(' ');
      return `
        <div class="post-preview">
          <h3><a href="${post.url}">${post.title}</a></h3>
          <p class="post-meta">
            <span class="post-date">${safe(post.date)}</span>
            <span class="post-tags">${safe(tags)}</span>
          </p>
          <p>${safe(post.description)}</p>
        </div>
      `;
    }).join('');

    // Inject individual featured placeholders (no raw Markdown dump)
    finalIndexHtml = finalIndexHtml
      .replace(/{{featured_title}}/g, featured.title)
      .replace(/{{featured_url}}/g, featured.url)
      .replace(/{{featured_date_iso}}/g, featured.date_iso || '')
      .replace(/{{featured_date_human}}/g, featured.date_human || '')
      .replace(/{{featured_category}}/g, featured.category || '')
      .replace(/{{featured_hero}}/g, featured.image || '')
      .replace(/{{featured_hero_alt}}/g, featured.title || '')
      .replace(/{{featured_excerpt}}/g, featured.description || '')
      .replace(/{{previous_posts}}/g, previousPostsHtml);
  } else {
    // No posts yet — clear placeholders safely
    finalIndexHtml = finalIndexHtml
      .replace(/{{featured_title}}/g, '')
      .replace(/{{featured_url}}/g, '')
      .replace(/{{featured_date_iso}}/g, '')
      .replace(/{{featured_date_human}}/g, '')
      .replace(/{{featured_category}}/g, '')
      .replace(/{{featured_hero}}/g, '')
      .replace(/{{featured_hero_alt}}/g, '')
      .replace(/{{featured_excerpt}}/g, '')
      .replace(/{{previous_posts}}/g, '');
  }

  fs.writeFileSync(path.join(blogDir, 'index.html'), finalIndexHtml);
}

// --- Run ---
generatePosts().catch(err => {
  console.error('Error generating blog:', err);
  process.exit(1);
});
