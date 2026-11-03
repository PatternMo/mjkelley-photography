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

// A title of exactly two sentences builds its address from the first sentence;
// every other title uses the whole title (his request, 2026-10-27).
// Cut only when sure. The title must hold exactly one end mark (. ! ? or an
// ellipsis, with or without a closing quote or bracket) followed by a space and
// more text, and that mark must be a single plain . ! or ?. The next word must
// start with an uppercase letter or a digit (opening quotes or brackets may come
// first). A period must not follow a number (a list "1."), a listed abbreviation
// (vs., Dr., Jan.), a single initial (J.) or a dotted abbreviation (U.S., Ph.D.).
// Anything else keeps the whole title: a long address is harmless, a wrongly cut
// one is permanent. New titles still get a look in the local preview.
const SLUG_ABBREVIATIONS = new Set([
  'vs', 'mr', 'mrs', 'ms', 'dr', 'prof', 'st', 'jr', 'sr', 'mt', 'ft', 'no',
  'vol', 'gen', 'gov', 'sen', 'rep', 'capt', 'lt', 'col', 'sgt', 'rev', 'hon',
  'inc', 'co', 'corp', 'ltd', 'etc', 'approx', 'ave', 'jan', 'feb', 'mar',
  'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec',
]);
const slugSource = (title) => {
  const breaks = [...title.matchAll(/[.!?]+["'”’)\]]*\s+(?=\S)/gu)];
  if (breaks.length !== 1) return title;
  const mark = breaks[0][0];
  if (!/^[.!?]\s+$/u.test(mark)) return title;
  const at = breaks[0].index;
  const next = title.slice(at + mark.length);
  if (!/^["'“‘(\[]*[\p{Lu}\p{N}]/u.test(next)) return title;
  if (title[at] === '.') {
    const before = title.slice(0, at);
    if (/\p{N}$/u.test(before)) return title;
    const word = (before.match(/[\p{L}.]+$/u) || [''])[0].toLowerCase();
    if (SLUG_ABBREVIATIONS.has(word) || word.includes('.') || /^\p{L}$/u.test(word)) return title;
  }
  return title.slice(0, at + 1);
};
const slugify = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const toSlug = (title, fallback) => {
  if (!title) return slugify((fallback || '').replace(/\.md$/i, ''));
  // If the first sentence has no usable characters, fall back to the whole title.
  return slugify(slugSource(String(title))) || slugify(title);
};

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
  if (Array.isArray(data.category)) return data.category.length ? String(data.category[0]) : '';
  if (data.category) return data.category;
  if (Array.isArray(data.tags) && data.tags.length) return String(data.tags[0]);
  return '';
};

// Displayed category label (2026-09-24, his request "Engineering and
// Landscape"): `category` may be a front-matter array; every entry shows,
// joined with a middle dot. Related-post matching used the FIRST entry only
// until 2026-11-03; it now counts every entry (allCategoryKeys below). A plain
// string behaves exactly as before.
const categoryLabel = (data) => {
  if (Array.isArray(data.category)) return data.category.map(c => String(c).trim()).filter(Boolean).join(' \u00b7 ');
  return firstCategory(data);
};

// The category key used for related-post matching is the DISPLAYED category
// (front-matter `category`, else first tag), normalized. One key: what the
// reader sees is what the algorithm matches - except where two displayed
// categories are one subject for related-reading purposes. CATEGORY_GROUPS
// maps a normalized displayed category to its group key; labels on the page
// are untouched. Added 2026-09-08 (his call): "Interiors" (the Airbnb post,
// ruled its own category 2026-08-31) and "Interior Design" never paired.
// 2026-11-03 (his rule for the industrial page: "architecture, engineering,
// and industrial blog posts should get priority"): Architecture and
// Industrial match as Engineering.
const CATEGORY_GROUPS = {
  'interiors': 'interior design',
  'architecture': 'engineering',
  'industrial': 'engineering',
};
const normalizeKey = (v) => {
  const k = String(v || '').trim().toLowerCase();
  return CATEGORY_GROUPS[k] || k;
};

// Every category a post carries, as matching keys (2026-11-03, his go: a post
// tagged "Engineering, Landscape" counts as related on the Landscape page too,
// "as long as the pages end up where they need to be"). A post's own Continue
// Reading still starts from its first category (relatedKey).
const allCategoryKeys = (data) => {
  const raw = Array.isArray(data.category) ? data.category : [firstCategory(data)];
  return [...new Set(raw.map(normalizeKey).filter(Boolean))];
};
const hasKey = (p, k) => (p.relatedKeys || [p.relatedKey]).includes(k);

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
// Second tier (2026-11-03, his rule: "interiors would be the next most
// relevant after the three categories we named"). For a key listed here,
// posts from the listed group fill in after same-group posts and before the
// newest of everything else. Keys and values are normalized group keys.
const RELATED_NEXT = {
  'engineering': 'interior design',
  // 2026-11-03, his rule for the real estate and architecture pages: "1) newest related,
  // 2) related 3) newest unrelated", interiors being the related tier.
  'real estate': 'interior design',
};
function relatedPosts(posts, { key = null, excludeSlug = null, limit = 3 } = {}) {
  const pool = posts.filter(p => p.slug !== excludeSlug);
  if (!key) return pool.slice(0, limit);
  const next = RELATED_NEXT[key] || null;
  const same = pool.filter(p => hasKey(p, key));
  const second = next ? pool.filter(p => !hasKey(p, key) && hasKey(p, next)) : [];
  const rest = pool.filter(p => !hasKey(p, key) && !(next && hasKey(p, next)));
  return same.concat(second, rest).slice(0, limit);
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

// Pixel size from the JPEG SOF header (no image library in this repo). The SOF
// payload carries height at +5 and width at +7. { width: 0, height: 0 } if
// unreadable. `jpegWidth` is the width-only form the hero code has always used.
function jpegDimensions(file) {
  const none = { width: 0, height: 0 };
  try {
    const b = fs.readFileSync(file);
    if (b[0] !== 0xFF || b[1] !== 0xD8) return none;
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xFF) { i++; continue; }
      const m = b[i + 1];
      if (m === 0xFF) { i++; continue; }
      if (m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { i += 2; continue; }
      const isSof = (m >= 0xC0 && m <= 0xCF) && m !== 0xC4 && m !== 0xC8 && m !== 0xCC;
      if (isSof) return { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) };
      if (m === 0xDA) return none;
      i += 2 + b.readUInt16BE(i + 2);
    }
  } catch (e) { /* fall through */ }
  return none;
}

const jpegWidth = (file) => jpegDimensions(file).width;

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

// --- body image derivatives --------------------------------------------------
// Same problem as the heroes, one slot down: a 1600px body JPG painted into the
// ~600px post column is shrunk by the browser, and every reader pays for the
// full file. The image-pipeline tool writes, beside a body image
// "/blog/images/<base>.jpg": "<base>-800.jpg" plus webp/avif siblings of BOTH
// widths. When the complete set is on disk the rendered <img> becomes a
// <picture> with avif/webp/jpg candidates; when anything is missing the tag is
// left exactly as marked produced it. Sanctioned addition 2026-09-11 (his go).
//
// Post-processing the rendered HTML (not a marked renderer.image override) is
// deliberate: captioned photos are raw <figure> HTML that marked passes through
// untouched, so the renderer hook never sees them (docs/blog-automation.md).
const BODY_DERIV_WIDTH = 800;
// The post column, measured in the browser 2026-09-11 (Playwright, published
// posts served locally): .post-content is 600.5px CSS at 1280 and 1440 wide,
// 604.5 at 900, 608.5 at 800, and 100vw-40 below ~640 (350 at a 390 phone).
// The element is `article.post.blog-post-container`: border-box min(72ch =
// 640.5px, 100vw) with padding-inline clamp(1rem, 2vw, 1.25rem) above 768px and
// a flat 20px at/below it. These two expressions track that within 1px.
const BODY_IMG_SIZES = '(max-width: 768px) min(600px, calc(100vw - 40px)), calc(640px - clamp(32px, 4vw, 40px))';
// Flex-paired photos (two <img style="width: 50%"> in a flex row with a 0.5rem
// gap, see the auction post) get half the column. Measured 296.3px at 1280 and
// 171px at 390 - the gap makes the real box a few px under half, so these state
// a hair more than the truth, never less.
const BODY_IMG_SIZES_HALF = '(max-width: 768px) min(300px, calc(50vw - 24px)), calc((640px - clamp(32px, 4vw, 40px)) / 2)';
// Every sibling that must exist before an <img> is upgraded. Miss one and the
// browser could pick a candidate that 404s (a <picture> source has no fallback).
const BODY_DERIV_SUFFIXES = [`-${BODY_DERIV_WIDTH}.jpg`, `-${BODY_DERIV_WIDTH}.webp`, `-${BODY_DERIV_WIDTH}.avif`, '.webp', '.avif'];

// A complete <img ...> tag: quoted attribute values may contain ">".
const IMG_TAG_RE = /<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
// One attribute inside a tag: name, optional ="value" / ='value' / bare value.
const ATTR_RE = /([^\s=\/>"'<]+)(\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g;

// Ordered attribute list; `raw` is the original source text so anything we keep
// is re-emitted byte for byte (original quoting, spacing inside the value).
function parseImgAttrs(tag) {
  const inner = tag.replace(/^<img/i, '').replace(/\/?>$/, '');
  const attrs = [];
  let m;
  ATTR_RE.lastIndex = 0;
  while ((m = ATTR_RE.exec(inner)) !== null) {
    let value = '';
    if (m[2]) {
      value = m[2].replace(/^\s*=\s*/, '');
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
    }
    attrs.push({ name: m[1].toLowerCase(), value, raw: m[0] });
  }
  return attrs;
}

const attrValue = (attrs, name) => {
  const a = attrs.find(x => x.name === name);
  return a ? a.value : null;
};

// Root-relative site path for a body-image src written either as
// "/blog/images/x.jpg" or relative to the post at /blog/posts/. Anything that
// is not a plain same-origin JPG under /blog/images returns null.
// The charset is deliberately narrow: letters, digits, dot, dash, underscore
// and slash. marked emits src values already HTML-escaped, so a name carrying
// "&" or a quote would have to be un-escaped for the disk check and re-escaped
// for the markup. Nothing in /blog/images is named that way (the pipeline
// slugifies), so such a src is simply left as a plain img.
function bodyImageRootPath(src) {
  if (!src) return null;
  if (!/^[A-Za-z0-9._\-\/]+$/.test(src)) return null;
  if (src.startsWith('//')) return null;
  if (!/\.jpe?g$/i.test(src)) return null;
  const rootRel = src.startsWith('/') ? path.posix.normalize(src) : path.posix.normalize('/blog/posts/' + src);
  return /^\/blog\/images\/[A-Za-z0-9._-]+\.jpe?g$/i.test(rootRel) ? rootRel : null;
}

// { urlBase, width, height } when the complete derivative set is on disk, else null.
// urlBase keeps the src's own shape (root-relative or relative), so the emitted
// candidates resolve from the same place the original did.
function bodyImageDerivatives(src) {
  const rootRel = bodyImageRootPath(src);
  if (!rootRel) return null;
  const rootBase = rootRel.replace(/\.jpe?g$/i, '');
  for (const suffix of BODY_DERIV_SUFFIXES) {
    if (!fs.existsSync(siteFile(rootBase + suffix))) return null;
  }
  // A real descriptor or nothing: an unreadable header (0) or an original that
  // is not wider than the 800 derivative would emit a bogus/duplicate "w".
  // The height comes from the same read and becomes the intrinsic aspect box.
  const { width, height } = jpegDimensions(siteFile(rootRel));
  if (!(width > BODY_DERIV_WIDTH) || !(height > 0)) {
    console.warn(`body-images: ${rootRel} has derivatives but unusable dimensions (${width}x${height}); left as a plain img`);
    return null;
  }
  return { urlBase: src.replace(/\.jpe?g$/i, ''), width, height };
}

const srcsetFor = (urlBase, ext, width) =>
  `${urlBase}-${BODY_DERIV_WIDTH}.${ext} ${BODY_DERIV_WIDTH}w, ${urlBase}.${ext} ${width}w`;

// <picture> is inline by default, so a flex child's width must live on the
// wrapper; the inner img then fills it. Keeps whatever else the author wrote.
function wrapperStyle(style) {
  const parts = String(style).split(';').map(s => s.trim()).filter(Boolean);
  if (!parts.some(p => /^min-width\s*:/i.test(p))) parts.push('min-width: 0');
  if (!parts.some(p => /^display\s*:/i.test(p))) parts.push('display: block');
  return parts.join('; ') + ';';
}

// One rendered <img> -> <picture> when its derivatives all exist, else itself.
function responsiveBodyImage(tag) {
  const attrs = parseImgAttrs(tag);
  const src = attrValue(attrs, 'src');
  if (!src) return tag;
  if (attrs.some(a => a.name === 'srcset')) return tag; // already responsive
  const deriv = bodyImageDerivatives(src);
  if (!deriv) return tag;

  const style = attrValue(attrs, 'style') || '';
  const isHalf = /width\s*:\s*50%/i.test(style);
  // Nothing here is re-escaped: `src` passed a charset that excludes every
  // character escapeHtml touches, the srcsets are built from it, the sizes are
  // literals, and the wrapper style is re-emitted from already-escaped source
  // text. Escaping again would turn a "&amp;" in an author's style into
  // "&amp;amp;".
  const sizesAttr = ` sizes="${isHalf ? BODY_IMG_SIZES_HALF : BODY_IMG_SIZES}"`;

  // Original attributes, in order, minus src (re-emitted first) and minus the
  // inline style when it moves to the wrapper.
  const kept = attrs
    .filter(a => a.name !== 'src')
    .map(a => (a.name === 'style' && isHalf
      ? ' style="width: 100%; height: auto; display: block;"'
      : ` ${a.raw}`))
    .join('');
  const lazy = attrs.some(a => a.name === 'loading') ? '' : ' loading="lazy"';
  // Intrinsic size of the ORIGINAL, so the browser can reserve the aspect box
  // before a lazy image arrives (without these a not-yet-loaded lazy img is a
  // zero-height box and text jumps as photos land). These only supply the ratio:
  // styles.css keeps `max-width: 100%; height: auto` on `.post-content img` and
  // `.blog-post-container img`, and the flex-pair inner style repeats
  // `width: 100%; height: auto`, so CSS still decides the painted size.
  // An author who wrote their own width/height keeps it.
  const hasSize = attrs.some(a => a.name === 'width' || a.name === 'height');
  const intrinsic = hasSize ? '' : ` width="${deriv.width}" height="${deriv.height}"`;

  const img = `<img src="${src}" srcset="${srcsetFor(deriv.urlBase, 'jpg', deriv.width)}"${sizesAttr}${intrinsic}${kept}${lazy}>`;
  const open = isHalf ? `<picture style="${wrapperStyle(style)}">` : '<picture>';
  return open
    + `<source type="image/avif" srcset="${srcsetFor(deriv.urlBase, 'avif', deriv.width)}"${sizesAttr}>`
    + `<source type="image/webp" srcset="${srcsetFor(deriv.urlBase, 'webp', deriv.width)}"${sizesAttr}>`
    + img
    + '</picture>';
}

// Rewrite every eligible <img> in a rendered post body. Images already inside a
// <picture> are skipped whole (an author who hand-wrote one owns it). Anchors
// and <figure>/<figcaption> are untouched: <picture> is valid anywhere an <img>
// is, including inside <a>, so the wrap happens in place.
function responsiveBodyImages(html) {
  const skip = [];
  const pictureRe = /<picture\b[\s\S]*?<\/picture\s*>/gi;
  let p;
  while ((p = pictureRe.exec(html)) !== null) skip.push([p.index, p.index + p[0].length]);
  const inSkip = (i) => skip.some(([s, e]) => i >= s && i < e);
  return html.replace(IMG_TAG_RE, (tag, offset) => (inSkip(offset) ? tag : responsiveBodyImage(tag)));
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

// Phone title fit (2026-11-03, his pick "A": measure on the visitor's screen, not a character
// count; Codex-reviewed). The block loads /related-title-fit.js, which trims a related-post
// title that runs past three lines on phones back to its last natural break, else the last
// whole word plus an ellipsis, and restores the full title on wider screens. It reads the
// abbreviation list from data-abbr so it and the address rule (slugSource) share one list.
// Without JavaScript the titles show in full.
const RELATED_TITLE_SCRIPT = `<script src="/related-title-fit.js" defer data-abbr="${[...SLUG_ABBREVIATIONS].join(' ')}"></script>`;

function renderRelatedBlock(items, heading) {
  if (!items.length) return '';
  return `<aside class="related-posts">
          <h2>${escapeHtml(heading)}</h2>
          <ul>
${renderRelatedItems(items)}
          </ul>
          ${RELATED_TITLE_SCRIPT}
        </aside>`;
}

// Homepage "From the Blog" cards (variant="feature"): the band's own markup
// (magazine.css .mag-blog-item), one card per post, newest first. The thumb
// prefers the hero's -600 display derivative when it exists (the card box is
// well under 600px CSS) and falls back to the original hero. Everything
// interpolated is escaped; a non-root-relative image renders no thumb.
function featureThumbSrc(image) {
  const d = image.replace(/([^\/]+)\.jpe?g$/i, (m, base) => `${base}-600.jpg`);
  return d !== image && fs.existsSync(siteFile(d)) ? d : image;
}

function renderFeatureItems(items) {
  return items.map(p => {
    let thumbHtml = '';
    if (p.image && isRootRelative(p.image)) {
      thumbHtml = `
                    <a class="mag-thumb" href="${escapeHtml(p.url)}">
                        <img src="${escapeHtml(featureThumbSrc(p.image))}" alt="" loading="lazy">
                    </a>`;
    } else if (p.image) {
      console.warn(`related-posts: feature image for "${p.slug}" is not root-relative (${p.image}); rendering card without thumb`);
    }
    // Without a thumb the card is a single grid child; span both columns so
    // the text does not sit in the narrow thumb column (magazine.css).
    const spanAttr = thumbHtml ? '' : ' style="grid-column: 1 / -1;"';
    return `                <div class="mag-blog-item fade-item">${thumbHtml}
                    <div${spanAttr}>
                        <div class="label">${escapeHtml(p.category)}</div>
                        <h3><a href="${escapeHtml(p.url)}">${escapeHtml(p.title)}</a></h3>
                        <p class="mag-blurb">${escapeHtml(p.description)}</p>
                        <div class="mag-date">${escapeHtml(p.date_human)}</div>
                    </div>
                </div>`;
  }).join('\n\n');
}

// One .post-tag pill per category (2026-09-24, his call "two different
// tags"): the templates carry the literal <span class="post-tag">{{category}}</span>
// (and the featured variant); the generator swaps that whole literal for one
// span per entry so a list renders as separate pills with no template edit.
const TAG_LITERAL = '<span class="post-tag">{{category}}</span>';
const FEATURED_TAG_LITERAL = '<span class="post-tag">{{featured_category}}</span>';
function categoryTagsHtml(p) {
  const cats = (p.categories && p.categories.length) ? p.categories : (p.category ? [p.category] : []);
  return cats.map(c => `<span class="post-tag">${escapeHtml(c)}</span>`).join(' ');
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
// variant  = "feature" renders the homepage "From the Blog" cards (latest
//            posts, newest first, no heading, no section wrapper) instead of
//            the related-posts aside. Absent = the aside. (2026-09-24)
const MARKER_BEGIN_RE = /^<!-- RELATED-POSTS:BEGIN( category="([^"]*)")?( limit="([1-9])")?( heading="([^"]*)")?( variant="(feature)")? -->$/;

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
    variant: grammar[8] || '',
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
    let wrapped;
    if (probe.variant === 'feature') {
      // Cards only: the page owns the section, kicker and list wrapper.
      // Always the latest N, newest first, regardless of any category
      // attribute on the marker (posts is already sorted newest-first).
      wrapped = renderFeatureItems(posts.slice(0, probe.limit));
    } else {
      const block = renderRelatedBlock(items, probe.heading);
      wrapped = block ? `<section class="related-posts-section">
        ${block}
        </section>` : '';
    }

    const stamped = stampPage(relFile, html, wrapped).build();
    // Write only when bytes changed: unchanged pages keep their git date, so
    // sitemap <lastmod> only moves when the block content actually moved.
    if (stamped !== html) {
      fs.writeFileSync(filePath, stamped);
      console.log(`related-posts: stamped ${relFile}`);
    }
  }
}

// --- related projects band ---------------------------------------------------
// Sanctioned addition 2026-11-03, his request: "a band of images... and a
// headline 'Related Projects' and the images link to the project pages. As we
// add new projects related to this category in architecture, engineering, and
// industrial, they will update here."
// Source: the project cards on projects.html, in the index's own order (newest
// shoot first), reusing each card's own image files. A page opts in with
//   <!-- RELATED-PROJECTS:BEGIN match="kw1,kw2" limit="N" -->  (limit optional, default 3)
//   <!-- RELATED-PROJECTS:END -->
// and gets the cards whose .project-category text contains any keyword
// (case-insensitive). A project page never lists itself. No match = nothing
// between the markers.
const PROJECTS_MARKER_BEGIN = '<!-- RELATED-PROJECTS:BEGIN';
const PROJECTS_MARKER_END = '<!-- RELATED-PROJECTS:END -->';
const PROJECTS_MARKER_RE = /^<!-- RELATED-PROJECTS:BEGIN match="([^"]+)"( limit="([1-9])")? -->$/;
// Band layout (his follow-up: "in a horizontal aspect across the page from left
// to right... and the ability to scroll the projects from left to right"): one
// full-width row that scrolls sideways. Card width in styles.css is 80vw on
// phones and clamp(300px, 36vw, 560px) above 768px; BAND_SIZES mirrors it.
const BAND_SIZES = '(max-width: 768px) 80vw, (max-width: 833px) 300px, (max-width: 1555px) 36vw, 560px';
// Arrow buttons for mouse users; swipe and trackpad scroll need no script.
// Self-contained so any page carrying the marker gets working arrows.
const BAND_SCRIPT = `<script>
          (function () {
            var band = document.currentScript.parentNode;
            var list = band.querySelector('.related-projects-list');
            var prev = band.querySelector('.related-projects-prev');
            var next = band.querySelector('.related-projects-next');
            if (!list || !prev || !next) return;
            function step() {
              var item = list.querySelector('.related-projects-item');
              return item ? item.getBoundingClientRect().width + 20 : list.clientWidth;
            }
            function update() {
              var max = list.scrollWidth - list.clientWidth - 1;
              band.classList.toggle('is-scrollable', max > 0);
              prev.disabled = list.scrollLeft <= 0;
              next.disabled = list.scrollLeft >= max;
            }
            function behavior() {
              var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
              return reduce ? 'auto' : 'smooth';
            }
            prev.addEventListener('click', function () { list.scrollBy({ left: -step(), behavior: behavior() }); });
            next.addEventListener('click', function () { list.scrollBy({ left: step(), behavior: behavior() }); });
            list.addEventListener('scroll', update, { passive: true });
            window.addEventListener('resize', update);
            update();
          })();
          </script>`;

// Cards are matched by class token and attribute name, not exact spelling, so a
// hand-edited card (extra classes, attributes in another order) still counts.
const classRe = (tag, cls) => new RegExp(`<${tag}\\b[^>]*\\bclass="(?:[^"]*\\s)?${cls}(?:\\s[^"]*)?"[^>]*>`, 'g');
const attrOf = (tagHtml, name) => (tagHtml.match(new RegExp(`\\b${name}="([^"]*)"`)) || [])[1];
const textOf = (chunk, cls) => {
  const m = new RegExp(`<div\\b[^>]*\\bclass="(?:[^"]*\\s)?${cls}(?:\\s[^"]*)?"[^>]*>([^<]*)</div>`).exec(chunk);
  return m ? m[1].trim() : '';
};

function readProjectCards() {
  const indexPath = path.join(baseDir, 'projects.html');
  if (!fs.existsSync(indexPath)) return [];
  const html = fs.readFileSync(indexPath, 'utf8');
  const starts = [...html.matchAll(classRe('div', 'project-item'))].map(m => m.index);
  return starts.map((start, i) => {
    const chunk = html.slice(start, i + 1 < starts.length ? starts[i + 1] : html.length);
    const linkTag = (chunk.match(classRe('a', 'project-link-overlay')) || [])[0];
    const href = linkTag && attrOf(linkTag, 'href');
    const picture = (chunk.match(/<picture\b[^>]*>[\s\S]*?<\/picture>/) || [])[0];
    const category = textOf(chunk, 'project-category');
    const title = textOf(chunk, 'project-title');
    if (!href || !picture || !title) {
      console.warn('related-projects: a projects.html card is missing its link, image or title; skipped');
      return null;
    }
    return { href, picture, category, title };
  }).filter(Boolean);
}

// Card paths are relative to the site root; a page one folder down needs "../".
const isRelativeUrl = (u) => !/^(?:[a-z]+:|\/|#)/i.test(u);
function relink(html, up) {
  if (!up) return html;
  return html
    .replace(/\b(src|href)="([^"]+)"/g, (m, attr, u) => `${attr}="${isRelativeUrl(u) ? up + u : u}"`)
    .replace(/\bsrcset="([^"]+)"/g, (m, set) => `srcset="${set.split(',').map(part => {
      const s = part.trim();
      return isRelativeUrl(s) ? up + s : s;
    }).join(', ')}"`);
}

function renderProjectBand(cards, up) {
  if (!cards.length) return '';
  const items = cards.map(c => {
    const pic = c.picture
      .replace(/\bsizes="[^"]*"/g, `sizes="${BAND_SIZES}"`)
      .replace(/<img (?![^>]*\bloading=)/, '<img loading="lazy" ')
      // The visible title names the link; a repeated alt would make screen
      // readers say it twice, so the thumbnail is decorative here.
      .replace(/(<img\b[^>]*?\balt=")[^"]*"/, '$1"');
    return `            <li class="related-projects-item"><a href="${c.href}">${pic}<span class="related-projects-title">${c.title}</span></a></li>`;
  }).join('\n');
  return relink(`<section class="related-projects-section">
          <h2>Related Projects</h2>
          <ul class="related-projects-list" role="list">
${items}
          </ul>
          <div class="related-projects-nav">
            <button type="button" class="related-projects-prev" aria-label="Scroll projects left">&#8249;</button>
            <button type="button" class="related-projects-next" aria-label="Scroll projects right">&#8250;</button>
          </div>
          ${BAND_SCRIPT}
        </section>`, up);
}

function stampProjectBands() {
  const cards = readProjectCards();
  for (const relFile of discoverMarkedPages()) {
    const filePath = path.join(baseDir, relFile);
    const html = fs.readFileSync(filePath, 'utf8');
    const b = html.indexOf(PROJECTS_MARKER_BEGIN);
    if (b === -1) continue; // not opted in
    if (html.indexOf(PROJECTS_MARKER_BEGIN, b + PROJECTS_MARKER_BEGIN.length) !== -1) {
      console.warn(`related-projects: ${relFile} has multiple BEGIN markers; skipping`);
      continue;
    }
    const bClose = html.indexOf('-->', b);
    const grammar = bClose === -1 ? null : html.slice(b, bClose + 3).match(PROJECTS_MARKER_RE);
    if (!grammar) {
      console.warn(`related-projects: ${relFile} BEGIN marker is malformed or unterminated; skipping`);
      continue;
    }
    const e = html.indexOf(PROJECTS_MARKER_END);
    if (e === -1 || e < bClose) {
      console.warn(`related-projects: ${relFile} END marker missing or before BEGIN; skipping`);
      continue;
    }
    if (html.indexOf(PROJECTS_MARKER_END, e + 1) !== -1) {
      console.warn(`related-projects: ${relFile} has multiple END markers; skipping`);
      continue;
    }
    const keywords = grammar[1].split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    const limit = grammar[3] ? parseInt(grammar[3], 10) : 3;
    const self = relFile.split(path.sep).join('/');
    const up = '../'.repeat(self.split('/').length - 1);
    const picked = cards
      .filter(c => c.href !== self && keywords.some(k => c.category.toLowerCase().includes(k)))
      .slice(0, limit);
    const block = renderProjectBand(picked, up);
    const interior = block ? `\n        ${block}\n        ` : '\n        ';
    const stamped = html.slice(0, bClose + 3) + interior + html.slice(e);
    if (stamped !== html) {
      fs.writeFileSync(filePath, stamped);
      console.log(`related-projects: stamped ${relFile}`);
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
  // Two posts with the same address would overwrite each other's page; stop the
  // build instead (more likely since two-sentence titles shorten, 2026-10-27).
  const slugOwner = new Map();
  const posts = markdownFiles.map(file => {
    const raw = fs.readFileSync(path.join(generateDir, file), 'utf8');
    const { data, content } = matter(raw);
    const slug = toSlug(data.title, file);
    if (!slug) {
      throw new Error(`${file}: the title gives an empty address. Use a title with letters or digits a-z/0-9.`);
    }
    if (slugOwner.has(slug)) {
      throw new Error(`Two posts would share the address /blog/posts/${slug}.html: ` +
        `${slugOwner.get(slug)} and ${file}. Change one of the titles.`);
    }
    slugOwner.set(slug, file);
    const { iso: date_iso, human: date_human } = toDateParts(data.date);
    const category = categoryLabel(data);
    const categories = Array.isArray(data.category)
      ? data.category.map(c => safe(String(c).trim())).filter(Boolean)
      : (category ? [category] : []);
    return {
      title: safe(data.title),
      description: safe(data.description),
      image: safe(data.image),
      image_caption: safe(data.image_caption),
      date: data.date,
      date_iso,
      date_human,
      category,
      categories,
      relatedKey: normalizeKey(firstCategory(data)),
      relatedKeys: allCategoryKeys(data),
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
    const htmlContent = responsiveBodyImages(newTabLinks(marked(stripLeadingH1(p.content))));

    // Optional hero caption from front-matter (`image_caption`); omitted entirely when absent.
    const heroCaption = p.image_caption.trim();
    const heroCaptionHtml = heroCaption ? `<figcaption>${heroCaption}</figcaption>` : '';

    const related = relatedPosts(posts, { key: p.relatedKey || null, excludeSlug: p.slug });
    const continueReadingHtml = renderRelatedBlock(related, 'Continue Reading:');

    const finalPostHtml = postTemplate
      .split(TAG_LITERAL).join(categoryTagsHtml(p))
      .replace(/{{hero_caption}}/g, () => heroCaptionHtml)
      .replace(/{{continue_reading}}/g, () => continueReadingHtml)
      .replace(/{{title}}/g, () => p.title)
      .replace(/{{description}}/g, () => p.description)
      .replace(/{{hero_srcset}}/g, () => heroSrcsetAttrs(p.image))
      .replace(/{{image}}/g, () => p.image)
      .replace(/{{url}}/g, () => p.url)
      // rel=canonical: the extensionless address Google indexes; the sitemaps use the same form (2026-10-04)
      .replace(/{{canonical_url}}/g, () => 'https://www.mjkelleyphoto.com' + p.url.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, ''))
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
                    ${categoryTagsHtml(p)}
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
      .split(FEATURED_TAG_LITERAL).join(categoryTagsHtml(f))
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

  // Pass 4: stamp Related Projects bands from the projects.html cards.
  stampProjectBands();
}

generatePosts().catch(err => {
  console.error('Error generating blog:', err);
  process.exit(1);
});
