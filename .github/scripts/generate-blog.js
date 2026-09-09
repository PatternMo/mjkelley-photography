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
// reader sees is what the algorithm matches - except where two displayed
// categories are one subject for related-reading purposes. CATEGORY_GROUPS
// maps a normalized displayed category to its group key; labels on the page
// are untouched. Added 2026-09-08 (his call): "Interiors" (the Airbnb post,
// ruled its own category 2026-08-31) and "Interior Design" never paired.
const CATEGORY_GROUPS = {
  'interiors': 'interior design',
};
const normalizeKey = (v) => {
  const k = String(v || '').trim().toLowerCase();
  return CATEGORY_GROUPS[k] || k;
};

// Every link inside a post body opens in a new tab (his rule, 2026-09-08) - off-site sources and
// his own posts alike. Only the rendered Markdown gets this; the template's Continue Reading and
// Related Reading links stay same-tab. rel="noopener" is the standard companion to target=_blank.
function newTabLinks(html) {
  return html.replace(/<a\s+(?![^>]*\btarget=)([^>]*?)>/gi, '<a $1 target="_blank" rel="noopener">');
}

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

// --- hero display derivatives ------------------------------------------------
// The image-pipeline tool (private workspace, not this repo) writes siblings next
// to a hero JPG: "<base>-600.jpg", "<base>-1200.jpg" and "thumbs/<base>-thumb.jpg" (240x160).
// Browsers alias fine edges when they shrink a 2000px file into the ~600px hero
// box or the 120x80 related-posts slot, so the markup points at the near-size
// file WHEN IT EXISTS on disk and falls back to the original otherwise. Names are
// computed from the front-matter path; keep in sync with pipeline.js
// (heroDerivPathFor / blogThumbPathFor).
// One candidate per pixel density: 600 for 1x screens, 1200 for 2x. Even a clean 2x shrink of
// the 1200 file segmented thin lines (chrome chair legs, macrame cords) on a 1x screen.
const HERO_DERIV_WIDTHS = [600, 1200];
// Hero box: .post is max-width 72ch (~601px CSS at the body font) with ~20px padding each
// side, so the image tops out at ~600px and only shrinks below a ~640px viewport. Stating the
// TRUE box matters: a 2x screen needs 1200 device px, which is exactly the -1200 file (no
// resample at all); overstating it (770px) pushed 2x screens to the 2000px original and the
// browser shrink that segments thin lines (2026-09-06, his retina report after the first fix).
const HERO_SIZES = '(max-width: 640px) 100vw, 600px';

const siteFile = (rootRel) => path.join(baseDir, rootRel.replace(/^\//, ''));

// Pixel width from the JPEG SOF header (no image library in this repo). 0 if unreadable.
function jpegWidth(file) {
  try {
    const b = fs.readFileSync(file);
    if (b[0] !== 0xFF || b[1] !== 0xD8) return 0;
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xFF) { i++; continue; }
      const m = b[i + 1];
      if (m === 0xFF) { i++; continue; }
      if (m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { i += 2; continue; }
      const isSof = (m >= 0xC0 && m <= 0xCF) && m !== 0xC4 && m !== 0xC8 && m !== 0xCC;
      if (isSof) return b.readUInt16BE(i + 7);
      if (m === 0xDA) return 0;
      i += 2 + b.readUInt16BE(i + 2);
    }
  } catch (e) { /* fall through */ }
  return 0;
}

// ` srcset="..." sizes="..."` for a hero, or '' when no -1200 sibling exists.
function heroSrcsetAttrs(image) {
  if (!image || !isRootRelative(image) || !/\.jpe?g$/i.test(image)) return '';
  const candidates = [];
  for (const w of HERO_DERIV_WIDTHS) {
    const deriv = image.replace(/\.jpe?g$/i, `-${w}.jpg`);
    if (fs.existsSync(siteFile(deriv))) candidates.push(`${deriv} ${w}w`);
  }
  if (!candidates.length) return '';
  const origW = jpegWidth(siteFile(image));
  if (origW > Math.max(...HERO_DERIV_WIDTHS)) candidates.push(`${image} ${origW}w`);
  return ` srcset="${escapeHtml(candidates.join(', '))}" sizes="${HERO_SIZES}"`;
}

// Related-posts thumb: thumbs/<base>-thumb.jpg when present, else the original.
function thumbSrc(image) {
  const t = image.replace(/([^\/]+)\.jpe?g$/i, (m, base) => `thumbs/${base}-thumb.jpg`);
  return t !== image && fs.existsSync(siteFile(t)) ? t : image;
}

function renderRelatedItems(items) {
  return items.map(p => {
    let imgHtml = '';
    if (p.image && isRootRelative(p.image)) {
      imgHtml = `<img class="related-posts-thumb" src="${escapeHtml(thumbSrc(p.image))}" alt="" loading="lazy"> `;
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
    const htmlContent = newTabLinks(marked(stripLeadingH1(p.content)));

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
      .replace(/{{hero_srcset}}/g, () => heroSrcsetAttrs(p.image))
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
                    <img src="${p.image}"${heroSrcsetAttrs(p.image)} alt="${p.title}">
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
      .replace(/{{featured_hero_srcset}}/g, () => heroSrcsetAttrs(f.image))
      .replace(/{{featured_hero}}/g, safe(f.image))
      .replace(/{{featured_hero_alt}}/g, f.title)
      .replace(/{{featured_excerpt}}/g, safe(f.description))
      .replace(/{{previous_posts}}/g, previousPostsHtml);
  } else {
    finalIndexHtml = finalIndexHtml
      .replace(/{{featured_title}}|{{featured_url}}|{{featured_date_iso}}|{{featured_date_human}}|{{featured_category}}|{{featured_hero_srcset}}|{{featured_hero}}|{{featured_hero_alt}}|{{featured_excerpt}}/g, '')
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
