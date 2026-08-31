// generate-blog.js
// Converts Markdown posts in /blog/generate into HTML pages in /blog/posts,
// builds /blog/index.html using structured placeholders for the featured post,
// and stamps related-posts blocks into any static page carrying
// RELATED-POSTS:BEGIN/END markers (galleries, project pages).
//
// Order matters: the full post catalog is parsed and sorted BEFORE any post
// is rendered, because every post's "Continue Reading:" block needs the
// complete catalog. Every run re-renders every post and restamps every
// marked page, so related lists never go stale.

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
  String(title || (fallback || '').replace(/\.md$/i, ''))
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const escapeHtml = (v) => String(v)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const toDateParts = (d) => {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return { iso: '', human: '' };
  return {
    iso: dt.toISOString(),
    human: dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }),
  };
};

const firstCategory = (data) => {
  if (data.category) return data.category;
  if (Array.isArray(data.tags) && data.tags.length) return String(data.tags[0]);
  return '';
};

// The category key used for related-post matching is the DISPLAYED category
// (front-matter `category`, else first tag), normalized. One key: what the
// reader sees is what the algorithm matches.
const normalizeKey = (v) => String(v || '').trim().toLowerCase();

// Remove a leading H1 from markdown so we don’t duplicate the title from the template.
const stripLeadingH1 = (md) => md.replace(/^\s*#\s+.+?\n+/, '');

// --- related posts -----------------------------------------------------------

// Fill rule (Michael's ruling): same-category posts first (newest first), then
// backfill with the newest posts from other categories, capped at `limit`
// (3 everywhere unless a page's marker overrides it), always excluding the
// post being read. The block renders whenever the result is non-empty.
function relatedPosts(posts, { key = null, excludeSlug = null, limit = 3 } = {}) {
  const pool = posts.filter(p => p.slug !== excludeSlug);
  if (!key) return pool.slice(0, limit);
  const same = pool.filter(p => p.relatedKey === key);
  const rest = pool.filter(p => p.relatedKey !== key);
  return same.concat(rest).slice(0, limit);
}

// Shared markup for both placements: thumbnail left, headline right.
// SEO purpose: plain crawlable links baked into the static HTML, post title
// as anchor text. All interpolated values are escaped.
// A usable thumb src is same-origin root-relative: starts with exactly one
// forward slash (protocol-relative `//host/...` and backslashes rejected).
const isRootRelative = (p) => /^\/(?![\/\\])/.test(p);

function renderRelatedItems(items) {
  return items.map(p => {
    let imgHtml = '';
    if (p.image && isRootRelative(p.image)) {
      imgHtml = `<img class="related-posts-thumb" src="${escapeHtml(p.image)}" alt="" loading="lazy"> `;
    } else if (p.image) {
      // Any other shape would resolve differently at different page depths
      // (or off-origin); render the item headline-only rather than risk it.
      console.warn(`related-posts: image for "${p.slug}" is not root-relative (${p.image}); rendering headline only`);
    }
    return `            <li class="related-posts-item"><a href="${escapeHtml(p.url)}">${imgHtml}<span class="related-posts-title">${escapeHtml(p.title)}</span></a></li>`;
  }).join('\n');
}

function renderRelatedBlock(items, heading) {
  if (!items.length) return '';
  return `<aside class="related-posts">
          <h2>${escapeHtml(heading)}</h2>
          <ul>
${renderRelatedItems(items)}
          </ul>
        </aside>`;
}

// --- static-page stamping ----------------------------------------------------

const MARKER_BEGIN = '<!-- RELATED-POSTS:BEGIN';
const MARKER_END = '<!-- RELATED-POSTS:END -->';

// Pages eligible for stamping: root-level *.html and projects/*.html, minus
// templates. A page opts in by carrying the marker pair; the BEGIN marker may
// declare the category to match first: RELATED-POSTS:BEGIN category="Automotive".
// No (or empty) category means straight latest-3. New pages copied from a
// marked page or template need no script or workflow edits.
// Dotfiles excluded to match the workflow's bash globs (git add *.html
// projects/*.html) — a page the pipeline can't stage must not be stamped.
const isEligibleHtml = (f) => f.endsWith('.html') && !f.startsWith('.');

function discoverMarkedPages() {
  const roots = fs.readdirSync(baseDir).filter(isEligibleHtml);
  const projectsDir = path.join(baseDir, 'projects');
  const projects = fs.existsSync(projectsDir)
    ? fs.readdirSync(projectsDir).filter(isEligibleHtml).map(f => path.join('projects', f))
    : [];
  return roots.concat(projects).filter(f => !path.basename(f).toLowerCase().includes('template'));
}

// The complete BEGIN marker grammar: optional attributes, in this order only.
// category = blog category to match first (empty/absent = latest posts)
// limit    = max items 1-9 (absent = 3)
// heading  = block heading (absent = "Related Reading")
const MARKER_BEGIN_RE = /^<!-- RELATED-POSTS:BEGIN( category="([^"]*)")?( limit="([1-9])")?( heading="([^"]*)")? -->$/;

// Replace the marker interior via literal indexOf/slice (no regex on page
// content, no replacement-string expansion). Guard: exactly one BEGIN and one
// END, in order — anything else warns and skips the page.
function stampPage(relFile, html, blockHtml) {
  const b = html.indexOf(MARKER_BEGIN);
  if (b === -1) return null; // unmarked page: not an error, just not opted in
  if (html.indexOf(MARKER_BEGIN, b + MARKER_BEGIN.length) !== -1) {
    console.warn(`related-posts: ${relFile} has multiple BEGIN markers; skipping`);
    return null;
  }
  const bClose = html.indexOf('-->', b);
  if (bClose === -1) {
    console.warn(`related-posts: ${relFile} BEGIN marker is unterminated; skipping`);
    return null;
  }
  const markerText = html.slice(b, bClose + 3);
  const grammar = markerText.match(MARKER_BEGIN_RE);
  if (!grammar) {
    console.warn(`related-posts: ${relFile} BEGIN marker is malformed (${markerText}); skipping`);
    return null;
  }
  const e = html.indexOf(MARKER_END);
  if (e === -1 || e < bClose) {
    console.warn(`related-posts: ${relFile} END marker missing or before BEGIN; skipping`);
    return null;
  }
  if (html.indexOf(MARKER_END, e + 1) !== -1) {
    console.warn(`related-posts: ${relFile} has multiple END markers; skipping`);
    return null;
  }
  const interior = blockHtml ? `\n        ${blockHtml}\n        ` : '\n        ';
  return {
    category: grammar[2] || '',
    limit: grammar[4] ? parseInt(grammar[4], 10) : 3,
    heading: grammar[6] || 'Related Reading',
    build: () => html.slice(0, bClose + 3) + interior + html.slice(e),
  };
}

function stampStaticPages(posts) {
  for (const relFile of discoverMarkedPages()) {
    const filePath = path.join(baseDir, relFile);
    const html = fs.readFileSync(filePath, 'utf8');

    // First pass parses the marker (and validates cardinality) to learn the
    // page's category, then the block is built and spliced in.
    const probe = stampPage(relFile, html, '');
    if (!probe) continue;

    const key = normalizeKey(probe.category) || null;
    const items = relatedPosts(posts, { key, limit: probe.limit });
    const block = renderRelatedBlock(items, probe.heading);
    const wrapped = block ? `<section class="related-posts-section">
        ${block}
        </section>` : '';

    const stamped = stampPage(relFile, html, wrapped).build();
    // Write only when bytes changed: unchanged pages keep their git date, so
    // sitemap <lastmod> only moves when the block content actually moved.
    if (stamped !== html) {
      fs.writeFileSync(filePath, stamped);
      console.log(`related-posts: stamped ${relFile}`);
    }
  }
}

// --- main --------------------------------------------------------------------

async function generatePosts() {
  const markdownFiles = fs.existsSync(generateDir)
    ? fs.readdirSync(generateDir).filter(f => f.endsWith('.md'))
    : [];

  // Pass 1: parse every post into a record. No rendering yet — every post's
  // related block needs the complete, sorted catalog.
  const posts = markdownFiles.map(file => {
    const raw = fs.readFileSync(path.join(generateDir, file), 'utf8');
    const { data, content } = matter(raw);
    const slug = toSlug(data.title, file);
    const { iso: date_iso, human: date_human } = toDateParts(data.date);
    const category = firstCategory(data);
    return {
      title: safe(data.title),
      description: safe(data.description),
      image: safe(data.image),
      image_caption: safe(data.image_caption),
      date: data.date,
      date_iso,
      date_human,
      category,
      relatedKey: normalizeKey(category),
      slug,
      url: `/blog/posts/${slug}.html`,
      content,
      tags: Array.isArray(data.tags) ? data.tags : [],
    };
  });

  // Newest first; slug ascending as tie-break so builds are deterministic.
  posts.sort((a, b) =>
    (new Date(b.date) - new Date(a.date)) || a.slug.localeCompare(b.slug));

  // Pass 2: render every post with its Continue Reading block.
  for (const p of posts) {
    const htmlContent = marked(stripLeadingH1(p.content));

    // Optional hero caption from front-matter (`image_caption`); omitted entirely when absent.
    const heroCaption = p.image_caption.trim();
    const heroCaptionHtml = heroCaption ? `<figcaption>${heroCaption}</figcaption>` : '';

    const related = relatedPosts(posts, { key: p.relatedKey || null, excludeSlug: p.slug });
    const continueReadingHtml = renderRelatedBlock(related, 'Continue Reading:');

    const finalPostHtml = postTemplate
      .replace(/{{hero_caption}}/g, () => heroCaptionHtml)
      .replace(/{{continue_reading}}/g, () => continueReadingHtml)
      .replace(/{{title}}/g, () => p.title)
      .replace(/{{description}}/g, () => p.description)
      .replace(/{{image}}/g, () => p.image)
      .replace(/{{url}}/g, () => p.url)
      .replace(/{{slug}}/g, () => p.slug)
      .replace(/{{date_iso}}/g, () => safe(p.date_iso))
      .replace(/{{date_human}}/g, () => safe(p.date_human))
      .replace(/{{category}}/g, () => safe(p.category))
      .replace(/{{content}}/g, () => htmlContent);

    fs.writeFileSync(path.join(postsDir, `${p.slug}.html`), finalPostHtml);
  }

  // build index
  let finalIndexHtml = indexTemplate;
  let previousPostsHtml = '';

  if (posts.length) {
    const f = posts[0];

    // Previous posts reuse the featured-slide markup so every post on the
    // index keeps the full card: title, meta, hero, excerpt.
    previousPostsHtml = posts.slice(1).map(p => {
      const heroHtml = p.image ? `
                <div class="post-hero">
                    <a href="${p.url}">
                    <img src="${p.image}" alt="${p.title}">
                    </a>
                </div>` : '';
      return `
          <section class="featured-post blog-post-container">
            <article class="post">
                <div class="post-header">
                <h1 class="post-title">
                    <a href="${p.url}">${p.title}</a>
                </h1>
                <div class="post-meta">
                    <time datetime="${safe(p.date_iso)}">${safe(p.date_human)}</time>
                    <span class="post-tag">${safe(p.category)}</span>
                </div>${heroHtml}
                </div>
                <div class="post-content">
                <p class="line-clamp-3">${safe(p.description)}</p>
                </div>
            </article>
        </section>
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

  // Pass 3: stamp related-posts blocks into marked static pages.
  stampStaticPages(posts);
}

generatePosts().catch(err => {
  console.error('Error generating blog:', err);
  process.exit(1);
});
