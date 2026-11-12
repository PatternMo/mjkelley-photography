#!/usr/bin/env node
// IndexNow ping: after a publish, tell search engines (Bing and the other
// IndexNow engines) which pages were added, changed, or removed.
//
// Sanctioned addition 2026-11-11, his go (verbatim): "Yeah, design it and
// coordintate with codex. test. review, fix. let me know."
// How and why: Web/docs/indexnow-automation.md.
//
// Usage
//   CI (publish-content.yml, after the Netlify deploy hook):
//     node .github/scripts/indexnow-ping.js --before <sha> --head HEAD --state-tag indexnow-last-sent
//   By hand, for pages that are already live:
//     node .github/scripts/indexnow-ping.js --urls https://www.mjkelleyphoto.com/blog/
//   Add --dry-run to print the request without waiting, sending, or moving the tag.
//
// A failed ping never blocks a publish: the workflow step runs with
// continue-on-error, and this script exits 1 only so the step shows the failure.

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DOMAIN = 'https://www.mjkelleyphoto.com';
const HOST = 'www.mjkelleyphoto.com';
const ENDPOINT = process.env.INDEXNOW_ENDPOINT || 'https://api.indexnow.org/indexnow';

// Sitemaps whose <loc> entries are the site's indexable pages.
const PAGE_SITEMAPS = ['sitemap.xml', 'blog-sitemap.xml'];
// Every sitemap the publish workflow regenerates.
const ALL_SITEMAPS = ['sitemap.xml', 'blog-sitemap.xml', 'image-sitemap.xml', 'video-sitemap.xml'];
// Scripts that carry page content: a change to one changes every page that
// loads it. image-automation.js holds the gallery photos and alt text.
const CONTENT_SCRIPTS = ['image-automation.js'];

const MAX_URLS_PER_REQUEST = 10000; // IndexNow protocol limit
const KEY_FILE_RE = /^([A-Za-z0-9-]{8,128})\.txt$/; // IndexNow key format
const MAX_TEXT_PROBES = 3;

const DEFAULTS = {
  fixedWaitMs: 120 * 1000, // only when nothing in the push can be compared live
  deployTimeoutMs: 7 * 60 * 1000,
  pollMs: 10 * 1000,
  requestTimeoutMs: 30 * 1000,
  attempts: 3,
  maxRetryDelayMs: 120 * 1000,
};

const inActions = Boolean(process.env.GITHUB_ACTIONS);
const log = (msg) => console.log(msg);
const warn = (msg) => console.log(inActions ? `::warning::${msg}` : `WARNING: ${msg}`);
const notice = (msg) => console.log(inActions ? `::notice::${msg}` : msg);
const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Same mapping as pageUrl() in generate-sitemaps.js: no .html, and an
// index.html becomes its directory (/, /blog/).
function fileToUrl(file) {
  if (!file.endsWith('.html')) return null;
  return `${DOMAIN}/${file.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '')}`;
}

function parseLocs(xml) {
  const locs = new Set();
  const re = /<loc>\s*([^<]+?)\s*<\/loc>/g;
  let m;
  while ((m = re.exec(xml || '')) !== null) {
    locs.add(m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'"));
  }
  return locs;
}

// Netlify rewrites links inside served HTML (pretty URLs), so live HTML never
// byte-matches the repo. The visible text does: checked on all 26 sitemap
// pages, 2026-11-11.
function visibleText(html) {
  return (html || '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// changes: [{ status: 'A'|'M'|'D'|'T', file }]
// beforeLocs / headLocs: Sets of page URLs from the sitemaps at each commit.
// scriptPages: Map of content script -> [page files that load it at head].
// Added or changed pages count only if they are in the new sitemaps (that keeps
// out templates, drafts, and anything else the sitemap generator excludes).
// A page newly listed in the sitemaps counts as added even if its HTML did not
// change in this diff, and a page no longer listed counts as removed: the
// workflow's pull/rebase can bring in a newer push's HTML before that push's
// own run lists it.
function selectUrls({ changes, beforeLocs, headLocs, scriptPages = new Map() }) {
  const updated = new Set();
  for (const { status, file } of changes) {
    if (status === 'D') continue;
    if (scriptPages.has(file)) {
      for (const page of scriptPages.get(file)) {
        const url = fileToUrl(page);
        if (headLocs.has(url)) updated.add(url);
      }
      continue;
    }
    const url = fileToUrl(file);
    if (url && headLocs.has(url)) updated.add(url);
  }
  for (const url of headLocs) if (!beforeLocs.has(url)) updated.add(url);
  const removed = [...beforeLocs].filter((url) => !headLocs.has(url));
  return { updated: [...updated].sort(), removed: removed.sort() };
}

function findKey(root) {
  const hits = fs.readdirSync(root)
    .filter((name) => KEY_FILE_RE.test(name))
    .filter((name) => fs.statSync(path.join(root, name)).isFile())
    .filter((name) => fs.readFileSync(path.join(root, name), 'utf8').trim() === name.slice(0, -4));
  if (hits.length !== 1) {
    throw new Error(`expected exactly one IndexNow key file at the site root, found ${hits.length}`);
  }
  return hits[0].slice(0, -4);
}

function git(args, cwd) {
  return execFileSync('git', args, {
    cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024,
  });
}

function isCommit(sha, cwd) {
  if (!sha || /^0+$/.test(sha)) return false;
  try {
    git(['cat-file', '-e', `${sha}^{commit}`], cwd);
    return true;
  } catch {
    return false;
  }
}

function isAncestor(a, b, cwd) {
  try {
    git(['merge-base', '--is-ancestor', a, b], cwd);
    return true;
  } catch {
    return false;
  }
}

function changedFiles(before, head, cwd) {
  const parts = git(['diff', '--name-status', '--no-renames', '-z', before, head], cwd).split('\0');
  const changes = [];
  for (let i = 0; i + 1 < parts.length; i += 2) {
    if (!parts[i]) break;
    changes.push({ status: parts[i][0], file: parts[i + 1] });
  }
  return changes;
}

function showFile(rev, file, cwd) {
  try {
    return git(['show', `${rev}:${file}`], cwd);
  } catch {
    return '';
  }
}

function sitemapLocs(rev, cwd) {
  const all = new Set();
  for (const file of PAGE_SITEMAPS) {
    for (const loc of parseLocs(showFile(rev, file, cwd))) all.add(loc);
  }
  return all;
}

function pagesLoading(script, rev, cwd) {
  const files = git(['ls-tree', '-r', '--name-only', rev], cwd).split('\n').filter((f) => f.endsWith('.html'));
  const re = new RegExp(`src=["'][^"']*\\b${script.replace(/[.]/g, '\\.')}["'?#]`);
  return files.filter((f) => re.test(showFile(rev, f, cwd)));
}

// The last commit whose changes were sent, kept as a tag on the remote so a
// skipped, cancelled, or failed run is picked up by the next one. It is used
// even when it is not an ancestor of HEAD (after a force push): a diff of the
// two trees is still exactly what changed since the last send.
function readStateTag(tag, cwd) {
  try {
    git(['fetch', '--quiet', '--force', 'origin', `refs/tags/${tag}:refs/tags/${tag}`], cwd);
  } catch {
    // No tag yet (first run) or no remote (local run).
  }
  let sha;
  try {
    sha = git(['rev-parse', '--verify', '--quiet', `refs/tags/${tag}^{commit}`], cwd).trim();
  } catch {
    return null;
  }
  return sha && isCommit(sha, cwd) ? sha : null;
}

function writeStateTag(tag, sha, cwd) {
  try {
    git(['tag', '--force', tag, sha], cwd);
    git(['push', '--quiet', '--force', 'origin', `refs/tags/${tag}`], cwd);
    return true;
  } catch (err) {
    warn(`IndexNow: could not move tag ${tag} to ${sha.slice(0, 7)}: ${String(err.message).split('\n')[0]}`);
    return false;
  }
}

// probes: [{ url, mode: 'exact' | 'text', expected }]. 'exact' compares the
// served bytes (XML, JS); 'text' compares visibleText() of a page.
async function waitForDeploy(probes, opts = {}) {
  const {
    fetchImpl = fetch, sleep = defaultSleep, now = Date.now,
    fixedWaitMs = DEFAULTS.fixedWaitMs, deployTimeoutMs = DEFAULTS.deployTimeoutMs,
    pollMs = DEFAULTS.pollMs, requestTimeoutMs = DEFAULTS.requestTimeoutMs,
  } = opts;
  if (probes.length === 0) {
    await sleep(fixedWaitMs);
    return { mode: 'fixed-delay', live: true };
  }
  const start = now();
  let pending = probes;
  for (;;) {
    const still = [];
    for (const probe of pending) {
      try {
        const sep = probe.url.includes('?') ? '&' : '?';
        const res = await fetchImpl(`${probe.url}${sep}indexnow=${now()}`, {
          cache: 'no-store', signal: AbortSignal.timeout(requestTimeoutMs),
        });
        const body = res.ok ? await res.text() : null;
        const got = body === null ? null : probe.mode === 'text' ? visibleText(body) : body;
        if (got !== probe.expected) still.push(probe);
      } catch {
        still.push(probe);
      }
    }
    pending = still;
    if (pending.length === 0) return { mode: 'confirmed', live: true, waitedMs: now() - start };
    if (now() - start >= deployTimeoutMs) {
      return { mode: 'confirmed', live: false, waitedMs: now() - start, pending: pending.map((p) => p.url) };
    }
    await sleep(pollMs);
  }
}

// Retry-After is either seconds or an HTTP date. Returns milliseconds or null.
function parseRetryAfter(value, nowMs = Date.now()) {
  if (value === null || value === undefined || value === '') return null;
  const s = String(value).trim();
  if (/^\d+$/.test(s)) return Number(s) * 1000;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : Math.max(0, t - nowMs);
}

async function submit(urls, key, opts = {}) {
  const {
    fetchImpl = fetch, sleep = defaultSleep, endpoint = ENDPOINT, now = Date.now,
    attempts = DEFAULTS.attempts, requestTimeoutMs = DEFAULTS.requestTimeoutMs,
    maxRetryDelayMs = DEFAULTS.maxRetryDelayMs,
  } = opts;
  const results = [];
  for (let i = 0; i < urls.length; i += MAX_URLS_PER_REQUEST) {
    const batch = urls.slice(i, i + MAX_URLS_PER_REQUEST);
    const body = JSON.stringify({ host: HOST, key, keyLocation: `${DOMAIN}/${key}.txt`, urlList: batch });
    let last = { status: 0, text: 'not sent' };
    for (let attempt = 1; attempt <= attempts; attempt++) {
      let retryAfterMs = null;
      try {
        const res = await fetchImpl(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body,
          signal: AbortSignal.timeout(requestTimeoutMs),
        });
        last = { status: res.status, text: (await res.text()).slice(0, 500) };
        if (res.status === 200 || res.status === 202) break;
        // 400 bad request, 403 key not valid, 422 URLs not on this host: a retry will not help.
        if (res.status !== 429 && res.status < 500) break;
        retryAfterMs = parseRetryAfter(res.headers.get('retry-after'), now());
      } catch (err) {
        last = { status: 0, text: String((err && err.message) || err) };
      }
      if (attempt === attempts) break;
      const delay = retryAfterMs !== null ? retryAfterMs : attempt * 10 * 1000;
      if (delay > maxRetryDelayMs) {
        last = { ...last, text: `${last.text} (server asked to wait ${Math.round(delay / 1000)} s; left for the next publish)`.trim() };
        break;
      }
      await sleep(delay);
    }
    results.push({ count: batch.length, ok: last.status === 200 || last.status === 202, ...last });
  }
  return results;
}

function parseArgs(argv) {
  const args = {
    before: '', head: 'HEAD', urls: [], dryRun: false, noWait: false, root: process.cwd(), stateTag: '',
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
      return argv[++i];
    };
    if (a === '--before') args.before = next();
    else if (a === '--head') args.head = next();
    else if (a === '--urls') args.urls.push(...next().split(/[\s,]+/).filter(Boolean));
    else if (a === '--root') args.root = path.resolve(next());
    else if (a === '--state-tag') args.stateTag = next();
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--no-wait') args.noWait = true;
    else throw new Error(`unknown argument: ${a}`);
  }
  return args;
}

function writeSummary(lines) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  try {
    fs.appendFileSync(file, `${lines.join('\n')}\n`);
  } catch {
    // A summary is a convenience; never fail over it.
  }
}

// Comparable live checks for this push: changed sitemaps and content scripts
// (served verbatim), and up to three changed pages whose visible text changed.
function buildProbes({ base, head, changes, updated, cwd }) {
  const probes = [];
  const changedSet = new Set(changes.map((c) => c.file));
  for (const file of [...ALL_SITEMAPS, ...CONTENT_SCRIPTS]) {
    if (!changedSet.has(file)) continue;
    const content = showFile(head, file, cwd);
    if (content) probes.push({ url: `${DOMAIN}/${file}`, mode: 'exact', expected: content });
  }
  const byUrl = new Map(changes.filter((c) => c.status !== 'D').map((c) => [fileToUrl(c.file), c.file]));
  let textProbes = 0;
  for (const url of updated) {
    if (textProbes >= MAX_TEXT_PROBES) break;
    const file = byUrl.get(url);
    if (!file) continue;
    const next = visibleText(showFile(head, file, cwd));
    if (next && next !== visibleText(showFile(base, file, cwd))) {
      probes.push({ url, mode: 'text', expected: next });
      textProbes++;
    }
  }
  return probes;
}

async function main(argv, deps = {}) {
  const args = parseArgs(argv);
  const key = findKey(args.root);
  const manual = args.urls.length > 0;

  let updated;
  let removed = [];
  let probes = [];
  let head = null;
  const tag = manual || args.dryRun ? '' : args.stateTag;
  let stateOk = true;
  // Move the tag to HEAD. Returns the exit code: a tag that cannot be saved is a
  // failure (the next run could skip pages), though the publish is unaffected.
  const settle = () => {
    // The final position is what counts; it supersedes an earlier failed save.
    if (tag && head) stateOk = writeStateTag(tag, head, args.root);
    if (!stateOk) writeSummary(['### IndexNow', `Could not save the ${tag} tag; the next run may miss pages.`]);
    return stateOk ? 0 : 1;
  };

  if (manual) {
    const bad = args.urls.filter((u) => !u.startsWith(`${DOMAIN}/`));
    if (bad.length) throw new Error(`URLs must start with ${DOMAIN}/: ${bad.join(', ')}`);
    updated = [...new Set(args.urls)].sort();
  } else {
    head = git(['rev-parse', '--verify', `${args.head}^{commit}`], args.root).trim();
    const pushBefore = isCommit(args.before, args.root) ? args.before : null;
    const fromTag = args.stateTag ? readStateTag(args.stateTag, args.root) : null;
    // No usable tag yet: save this push's starting point first, so a failed or
    // cancelled run still leaves the next one a place to start from.
    if (tag && !fromTag && pushBefore && !writeStateTag(tag, pushBefore, args.root)) stateOk = false;
    const base = fromTag || pushBefore;
    if (!base) {
      notice('IndexNow: no usable previous commit (first push, force push, or manual run). Nothing sent; this commit is the new starting point.');
      return settle();
    }
    if (fromTag && fromTag !== args.before) log(`IndexNow: comparing from the last sent commit ${fromTag.slice(0, 7)}.`);
    const changes = changedFiles(base, head, args.root);
    const scriptPages = new Map(CONTENT_SCRIPTS
      .filter((s) => changes.some((c) => c.file === s && c.status !== 'D'))
      .map((s) => [s, pagesLoading(s, head, args.root)]));
    ({ updated, removed } = selectUrls({
      changes,
      beforeLocs: sitemapLocs(base, args.root),
      headLocs: sitemapLocs(head, args.root),
      scriptPages,
    }));
    // Live checks come from what this deploy adds: from this push's starting
    // commit, or from the tag when it is newer (a run that overlapped this push
    // already deployed everything up to its tag). Checking anything older would
    // "confirm" before this deploy is live.
    const tagIsNewer = fromTag && pushBefore && fromTag !== pushBefore && isAncestor(pushBefore, fromTag, args.root);
    const probeBase = tagIsNewer ? fromTag : (pushBefore || base);
    const probeChanges = probeBase === base ? changes : changedFiles(probeBase, head, args.root);
    probes = buildProbes({ base: probeBase, head, changes: probeChanges, updated, cwd: args.root });
  }

  const urls = [...updated, ...removed];
  if (urls.length === 0) {
    log('IndexNow: no indexable page was added, changed, or removed. Nothing sent.');
    return settle();
  }
  log(`IndexNow: ${updated.length} added or changed, ${removed.length} removed:`);
  for (const u of updated) log(`  ${u}`);
  for (const u of removed) log(`  ${u} (removed)`);

  if (args.dryRun) {
    log(`IndexNow: live checks before sending: ${probes.length ? probes.map((p) => `${p.url} (${p.mode})`).join(', ') : 'none, fixed delay'}`);
    log(JSON.stringify({ endpoint: ENDPOINT, host: HOST, key, keyLocation: `${DOMAIN}/${key}.txt`, urlList: urls }, null, 2));
    return 0;
  }

  if (!manual && !args.noWait) {
    const wait = await waitForDeploy(probes, deps);
    if (wait.mode === 'fixed-delay') {
      log('IndexNow: nothing in this push can be compared live; waited the fixed delay for the deploy.');
    } else if (wait.live) {
      log(`IndexNow: deploy confirmed live after ${Math.round(wait.waitedMs / 1000)} s.`);
    } else {
      warn(`IndexNow: deploy not confirmed after ${Math.round(wait.waitedMs / 1000)} s (still old: ${wait.pending.join(', ')}). Nothing sent; the next publish will include these pages.`);
      writeSummary(['### IndexNow', 'Deploy not confirmed; nothing sent. The next publish includes these pages.']);
      return 1;
    }
  }

  const results = await submit(urls, key, deps);
  const failed = results.filter((r) => !r.ok);
  for (const r of results) log(`IndexNow: ${r.count} URLs -> HTTP ${r.status}${r.text ? ` ${r.text}` : ''}`);
  writeSummary([
    '### IndexNow',
    failed.length ? `Failed: ${failed.map((r) => `HTTP ${r.status}`).join(', ')}. The next publish includes these pages.` : `Sent ${urls.length} URLs.`,
    ...updated.map((u) => `- ${u}`),
    ...removed.map((u) => `- ${u} (removed)`),
  ]);
  if (failed.length) {
    warn(`IndexNow: ${failed.length} request(s) failed (${failed.map((r) => r.status).join(', ')}). The next publish will include these pages.`);
    return 1;
  }
  return settle();
}

module.exports = {
  DOMAIN, HOST, fileToUrl, parseLocs, visibleText, selectUrls, findKey, changedFiles, isCommit,
  pagesLoading, buildProbes, waitForDeploy, parseRetryAfter, submit, parseArgs, main,
};

if (require.main === module) {
  main(process.argv.slice(2)).then(
    (code) => { process.exitCode = code; },
    (err) => { warn(`IndexNow: ${err.message}`); process.exitCode = 1; },
  );
}
