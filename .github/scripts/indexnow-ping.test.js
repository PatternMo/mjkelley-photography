// Tests for indexnow-ping.js. Run: node --test .github/scripts/indexnow-ping.test.js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
// Keep simulated runs out of the real Actions job summary and annotations.
delete process.env.GITHUB_STEP_SUMMARY;
delete process.env.GITHUB_ACTIONS;
const m = require('./indexnow-ping.js');

const D = m.DOMAIN;
const KEY = '0123456789abcdef0123456789abcdef';
const noSleep = async () => {};
const tmpDirs = [];
function tmp(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpDirs.push(dir);
  return dir;
}
test.after(() => { for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true }); });

function sitemap(paths) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset>\n${paths
    .map((p) => `  <url>\n    <loc>${D}${p}</loc>\n    <lastmod>2026-11-11</lastmod>\n  </url>\n`)
    .join('')}</urlset>`;
}

test('fileToUrl matches the sitemap generator mapping', () => {
  assert.equal(m.fileToUrl('index.html'), `${D}/`);
  assert.equal(m.fileToUrl('blog/index.html'), `${D}/blog/`);
  assert.equal(m.fileToUrl('contact.html'), `${D}/contact`);
  assert.equal(m.fileToUrl('projects/parkworks-automation-hunters-view.html'), `${D}/projects/parkworks-automation-hunters-view`);
  assert.equal(m.fileToUrl('blog/posts/a-post.html'), `${D}/blog/posts/a-post`);
  assert.equal(m.fileToUrl('styles.css'), null);
  assert.equal(m.fileToUrl('blog/generate/a-post.md'), null);
});

test('parseLocs reads page locs and ignores image:loc', () => {
  const xml = `<url><loc>${D}/a</loc><image:image><image:loc>${D}/images/x.jpg</image:loc></image:image></url>
  <url><loc> ${D}/b?x=1&amp;y=2 </loc></url>`;
  assert.deepEqual([...m.parseLocs(xml)], [`${D}/a`, `${D}/b?x=1&y=2`]);
  assert.equal(m.parseLocs('').size, 0);
});

test('selectUrls keeps sitemap pages, drops templates and non-pages, reports removals', () => {
  const beforeLocs = new Set([`${D}/`, `${D}/contact`, `${D}/old-page`, `${D}/blog/posts/p1`]);
  const headLocs = new Set([`${D}/`, `${D}/contact`, `${D}/blog/posts/p1`, `${D}/blog/posts/p2`]);
  const changes = [
    { status: 'M', file: 'index.html' },
    { status: 'A', file: 'blog/posts/p2.html' },
    { status: 'M', file: 'blog/posts/p1.html' },
    { status: 'D', file: 'old-page.html' },
    { status: 'M', file: 'blog/template/blog-post-template.html' },
    { status: 'M', file: 'styles.css' },
    { status: 'D', file: 'never-listed.html' },
    { status: 'T', file: 'contact.html' },
  ];
  assert.deepEqual(m.selectUrls({ changes, beforeLocs, headLocs }), {
    updated: [`${D}/`, `${D}/blog/posts/p1`, `${D}/blog/posts/p2`, `${D}/contact`],
    removed: [`${D}/old-page`],
  });
});

test('selectUrls counts sitemap membership changes even when the HTML did not change', () => {
  const beforeLocs = new Set([`${D}/`, `${D}/gone-from-sitemap`]);
  const headLocs = new Set([`${D}/`, `${D}/studio`]);
  assert.deepEqual(m.selectUrls({ changes: [{ status: 'M', file: 'sitemap.xml' }], beforeLocs, headLocs }), {
    updated: [`${D}/studio`],
    removed: [`${D}/gone-from-sitemap`],
  });
});

test('findKey needs exactly one key file whose content is its name', () => {
  const dir = tmp('indexnow-key-');
  fs.writeFileSync(path.join(dir, 'robots.txt'), 'User-agent: *');
  assert.throws(() => m.findKey(dir), /found 0/);
  fs.writeFileSync(path.join(dir, `${KEY}.txt`), `${KEY}\n`);
  assert.equal(m.findKey(dir), KEY);
  fs.writeFileSync(path.join(dir, 'notakeyfile1.txt'), 'something else');
  assert.equal(m.findKey(dir), KEY);
  fs.writeFileSync(path.join(dir, 'abcdefabcdef.txt'), 'abcdefabcdef');
  assert.throws(() => m.findKey(dir), /found 2/);
});

test('parseArgs reads flags and rejects unknown ones', () => {
  const a = m.parseArgs(['--before', 'abc', '--urls', `${D}/a, ${D}/b`, '--urls', `${D}/c`, '--dry-run']);
  assert.equal(a.before, 'abc');
  assert.equal(a.head, 'HEAD');
  assert.deepEqual(a.urls, [`${D}/a`, `${D}/b`, `${D}/c`]);
  assert.equal(a.dryRun, true);
  assert.throws(() => m.parseArgs(['--bogus']), /unknown argument/);
  assert.throws(() => m.parseArgs(['--before']), /needs a value/);
});

test('submit sends the IndexNow payload and accepts 202', async () => {
  let seen;
  const fetchImpl = async (url, init) => {
    seen = { url, init };
    return new Response('', { status: 202 });
  };
  const r = await m.submit([`${D}/a`], KEY, { fetchImpl, sleep: noSleep, endpoint: 'https://example.test/indexnow' });
  assert.deepEqual(r.map((x) => [x.ok, x.status, x.count]), [[true, 202, 1]]);
  assert.equal(seen.url, 'https://example.test/indexnow');
  assert.equal(seen.init.method, 'POST');
  assert.deepEqual(JSON.parse(seen.init.body), {
    host: m.HOST, key: KEY, keyLocation: `${D}/${KEY}.txt`, urlList: [`${D}/a`],
  });
});

test('submit retries 5xx, 429, and network errors, but not 4xx', async () => {
  const seq = [503, 'throw', 200];
  let calls = 0;
  const flaky = async () => {
    const s = seq[calls++];
    if (s === 'throw') throw new Error('socket hang up');
    return new Response('', { status: s });
  };
  const r1 = await m.submit([`${D}/a`], KEY, { fetchImpl: flaky, sleep: noSleep });
  assert.equal(calls, 3);
  assert.equal(r1[0].ok, true);

  calls = 0;
  const rejecting = async () => { calls++; return new Response('URLs not on host', { status: 422 }); };
  const r2 = await m.submit([`${D}/a`], KEY, { fetchImpl: rejecting, sleep: noSleep });
  assert.equal(calls, 1);
  assert.deepEqual([r2[0].ok, r2[0].status, r2[0].text], [false, 422, 'URLs not on host']);

  calls = 0;
  const limited = async () => { calls++; return new Response('', { status: 429 }); };
  const r3 = await m.submit([`${D}/a`], KEY, { fetchImpl: limited, sleep: noSleep });
  assert.equal(calls, 3);
  assert.equal(r3[0].ok, false);
});

test('submit splits more than 10,000 URLs into batches', async () => {
  const sizes = [];
  const fetchImpl = async (url, init) => {
    sizes.push(JSON.parse(init.body).urlList.length);
    return new Response('', { status: 200 });
  };
  const urls = Array.from({ length: 10001 }, (_, i) => `${D}/p${i}`);
  const r = await m.submit(urls, KEY, { fetchImpl, sleep: noSleep });
  assert.deepEqual(sizes, [10000, 1]);
  assert.equal(r.every((x) => x.ok), true);
});

test('waitForDeploy waits the fixed delay when no sitemap changed', async () => {
  const slept = [];
  const r = await m.waitForDeploy([], { sleep: async (ms) => { slept.push(ms); }, fixedWaitMs: 1234 });
  assert.deepEqual(r, { mode: 'fixed-delay', live: true });
  assert.deepEqual(slept, [1234]);
});

test('waitForDeploy polls until the live sitemap matches', async () => {
  let t = 0;
  let served = 'old';
  const fetchImpl = async (url) => {
    assert.match(url, /\/blog-sitemap\.xml\?indexnow=\d+$/);
    return new Response(served, { status: 200 });
  };
  const sleep = async (ms) => { t += ms; if (t >= 30000) served = 'new'; };
  const r = await m.waitForDeploy([{ url: `${D}/blog-sitemap.xml`, mode: 'exact', expected: 'new' }], {
    fetchImpl, sleep, now: () => t, pollMs: 10000, deployTimeoutMs: 60000,
  });
  assert.equal(r.live, true);
  assert.equal(r.waitedMs, 30000);
});

test('waitForDeploy gives up at the timeout and names what is still old', async () => {
  let t = 0;
  const fetchImpl = async () => new Response('old', { status: 200 });
  const r = await m.waitForDeploy([{ url: `${D}/sitemap.xml`, mode: 'exact', expected: 'new' }], {
    fetchImpl, sleep: async (ms) => { t += ms; }, now: () => t, pollMs: 10000, deployTimeoutMs: 30000,
  });
  assert.equal(r.live, false);
  assert.deepEqual(r.pending, [`${D}/sitemap.xml`]);
});

test('waitForDeploy text probes ignore Netlify link rewrites but see text changes', async () => {
  const head = '<a href="contact.html" class="x">Contact</a><p>New line</p><script>var a=1</script>';
  const servedNew = "<a class='x' href='/contact'>Contact</a><p>New line</p><script>var a=2</script>";
  const servedOld = "<a class='x' href='/contact'>Contact</a><p>Old line</p>";
  let served = servedOld;
  let t = 0;
  const probe = { url: `${D}/contact`, mode: 'text', expected: m.visibleText(head) };
  const r = await m.waitForDeploy([probe], {
    fetchImpl: async () => new Response(served, { status: 200 }),
    sleep: async (ms) => { t += ms; served = servedNew; }, now: () => t, pollMs: 10000, deployTimeoutMs: 60000,
  });
  assert.deepEqual([r.live, r.waitedMs], [true, 10000]);
});

test('visibleText drops tags, scripts, styles, and comments', () => {
  assert.equal(m.visibleText('<style>a{}</style><!-- c --><h1 class="a">Hi  <b>there</b></h1>\n<script>x()</script>'), 'Hi there');
  assert.equal(m.visibleText(''), '');
});

test('parseRetryAfter reads seconds and HTTP dates', () => {
  const now = Date.parse('2026-11-11T12:00:00Z');
  assert.equal(m.parseRetryAfter('30', now), 30000);
  assert.equal(m.parseRetryAfter('Wed, 11 Nov 2026 12:01:00 GMT', now), 60000);
  assert.equal(m.parseRetryAfter('Wed, 11 Nov 2026 11:00:00 GMT', now), 0);
  assert.equal(m.parseRetryAfter(null, now), null);
  assert.equal(m.parseRetryAfter('soon', now), null);
});

test('submit honors Retry-After and gives up when it is too long', async () => {
  const slept = [];
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    if (calls === 1) return new Response('', { status: 429, headers: { 'Retry-After': '45' } });
    return new Response('', { status: 200 });
  };
  const r1 = await m.submit([`${D}/a`], KEY, { fetchImpl, sleep: async (ms) => { slept.push(ms); } });
  assert.deepEqual(slept, [45000]);
  assert.equal(r1[0].ok, true);

  calls = 0;
  slept.length = 0;
  const tooLong = async () => { calls++; return new Response('', { status: 429, headers: { 'Retry-After': '600' } }); };
  const r2 = await m.submit([`${D}/a`], KEY, { fetchImpl: tooLong, sleep: async (ms) => { slept.push(ms); } });
  assert.equal(calls, 1);
  assert.deepEqual(slept, []);
  assert.equal(r2[0].ok, false);
  assert.match(r2[0].text, /wait 600 s/);
});

// End to end on a throwaway git repo shaped like the site.
function makeRepo({ remote = false } = {}) {
  const dir = tmp('indexnow-repo-');
  const g = (...a) => execFileSync('git', a, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
  const write = (f, s) => { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), s); };
  const commit = (msg) => { g('add', '-A'); g('commit', '-qm', msg); return g('rev-parse', 'HEAD'); };
  g('init', '-q');
  g('config', 'user.email', 'test@example.com');
  g('config', 'user.name', 'Test');
  write(`${KEY}.txt`, KEY);
  write('index.html', '<h1>home</h1><a href="contact.html">Contact</a>');
  write('contact.html', '<h1 class="a">contact</h1>');
  write('projects.html', '<h1>projects</h1>');
  write('old-page.html', '<h1>old</h1>');
  write('architecture-photography.html', '<h1>architecture</h1><div id="gallery"></div><script src="image-automation.js"></script>');
  write('image-automation.js', 'const imageCollections = { architecture: { alts: ["one"] } };');
  write('blog/posts/p1.html', '<h1>p1</h1>');
  write('blog/template/blog-post-template.html', 'template');
  write('sitemap.xml', sitemap(['/', '/architecture-photography', '/contact', '/old-page', '/projects']));
  write('blog-sitemap.xml', sitemap(['/blog/posts/p1']));
  const before = commit('first');
  let bare = null;
  if (remote) {
    bare = tmp('indexnow-remote-');
    execFileSync('git', ['init', '-q', '--bare', bare]);
    g('remote', 'add', 'origin', bare);
    g('push', '-q', 'origin', 'HEAD:refs/heads/main');
  }
  const remoteTag = (tag) => {
    try { return execFileSync('git', ['rev-parse', `refs/tags/${tag}`], { cwd: bare, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim(); } catch { return null; }
  };
  return { dir, g, write, commit, before, remoteTag };
}

// A stand-in for the live site: serves the files of one commit, with Netlify's
// pretty-URL rewrite applied to links in HTML.
function liveSite(dir, revOf) {
  return (url) => {
    const p = new URL(url).pathname.slice(1);
    const candidates = p === '' ? ['index.html'] : p.endsWith('/') ? [`${p}index.html`] : [p, `${p}.html`];
    for (const f of candidates) {
      try {
        let body = execFileSync('git', ['show', `${revOf()}:${f}`], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
        if (f.endsWith('.html')) body = body.replace(/href="([^"]*?)\.html"/g, "href='/$1'");
        return new Response(body, { status: 200 });
      } catch {
        // try the next candidate
      }
    }
    return new Response('Not found', { status: 404 });
  };
}

function fakeNet(site, { postStatus = 202 } = {}) {
  const posts = [];
  const fetchImpl = async (url, init) => {
    if (init && init.method === 'POST') {
      posts.push(JSON.parse(init.body));
      return new Response('', { status: postStatus });
    }
    return site(url);
  };
  return { posts, fetchImpl };
}

async function runMain(argv, deps) {
  const lines = [];
  const orig = console.log;
  console.log = (s) => lines.push(String(s));
  try {
    const code = await m.main(argv, deps);
    return { code, out: lines.join('\n') };
  } finally {
    console.log = orig;
  }
}

function pushAddEditDelete(repo) {
  const { dir, write, commit } = repo;
  write('blog/posts/p2.html', '<h1>p2</h1>');
  write('contact.html', '<h1 class="a">contact v2</h1>');
  write('blog/template/blog-post-template.html', 'template v2');
  write('styles.css', 'body{}');
  fs.unlinkSync(path.join(dir, 'old-page.html'));
  commit('his push');
  // The workflow then commits regenerated sitemaps.
  write('sitemap.xml', sitemap(['/', '/architecture-photography', '/contact', '/projects']));
  write('blog-sitemap.xml', sitemap(['/blog/posts/p1', '/blog/posts/p2']));
  return commit('Auto-update sitemaps [skip ci]');
}

test('main: a push that adds a post, edits a page, and deletes a page', async () => {
  const repo = makeRepo();
  const { dir, before } = repo;
  const head = pushAddEditDelete(repo);

  const dry = await runMain(['--root', dir, '--before', before, '--dry-run']);
  assert.equal(dry.code, 0);
  const payload = JSON.parse(dry.out.slice(dry.out.indexOf('{')));
  assert.deepEqual(payload.urlList, [`${D}/blog/posts/p2`, `${D}/contact`, `${D}/old-page`]);
  assert.equal(payload.key, KEY);
  assert.match(dry.out, /sitemap\.xml \(exact\).*blog-sitemap\.xml \(exact\).*blog\/posts\/p2 \(text\).*contact \(text\)/);

  // The live site serves the old commit for two polls, then the new one.
  let polls = 0;
  let live = before;
  const net = fakeNet(liveSite(dir, () => live));
  const r = await runMain(['--root', dir, '--before', before], {
    fetchImpl: net.fetchImpl, sleep: async () => { if (++polls >= 2) live = head; },
  });
  assert.equal(r.code, 0);
  assert.equal(net.posts.length, 1);
  assert.deepEqual(net.posts[0].urlList, payload.urlList);
  assert.match(r.out, /deploy confirmed live/);
});

test('main: sends nothing and exits 1 when the deploy never goes live', async () => {
  const repo = makeRepo();
  pushAddEditDelete(repo);
  let t = 0;
  const net = fakeNet(liveSite(repo.dir, () => repo.before));
  const r = await runMain(['--root', repo.dir, '--before', repo.before], {
    fetchImpl: net.fetchImpl, sleep: async (ms) => { t += ms; }, now: () => t, deployTimeoutMs: 60000, pollMs: 10000,
  });
  assert.equal(r.code, 1);
  assert.equal(net.posts.length, 0);
  assert.match(r.out, /Nothing sent; the next publish will include these pages/);
});

test('main: nothing to send for a push that only touches non-pages', async () => {
  const { dir, write, commit, before } = makeRepo();
  write('styles.css', 'body{color:red}');
  commit('css only');
  const r = await runMain(['--root', dir, '--before', before], {
    fetchImpl: async () => { throw new Error('should not fetch'); }, sleep: noSleep,
  });
  assert.equal(r.code, 0);
  assert.match(r.out, /Nothing sent/);
});

test('main: skips when the previous commit is unusable', async () => {
  const { dir } = makeRepo();
  for (const before of ['', '0000000000000000000000000000000000000000', 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef']) {
    const r = await runMain(['--root', dir, '--before', before], {
      fetchImpl: async () => { throw new Error('should not fetch'); }, sleep: noSleep,
    });
    assert.equal(r.code, 0);
    assert.match(r.out, /no usable previous commit/);
  }
});

test('main: same-day text edit is confirmed by its text; attribute-only edit falls back to the fixed delay', async () => {
  const repo = makeRepo();
  const { dir, write, commit, before } = repo;
  write('contact.html', '<h1 class="a">contact v3</h1>');
  const head = commit('same-day text edit');
  const net = fakeNet(liveSite(dir, () => head));
  const slept = [];
  const r = await runMain(['--root', dir, '--before', before], {
    fetchImpl: net.fetchImpl, sleep: async (ms) => { slept.push(ms); }, fixedWaitMs: 5,
  });
  assert.equal(r.code, 0);
  assert.deepEqual(slept, []);
  assert.match(r.out, /deploy confirmed live/);
  assert.deepEqual(net.posts[0].urlList, [`${D}/contact`]);

  write('contact.html', '<h1 class="b">contact v3</h1>');
  const head2 = commit('attribute-only edit');
  const net2 = fakeNet(liveSite(dir, () => head2));
  const r2 = await runMain(['--root', dir, '--before', head], {
    fetchImpl: net2.fetchImpl, sleep: async (ms) => { slept.push(ms); }, fixedWaitMs: 5,
  });
  assert.equal(r2.code, 0);
  assert.deepEqual(slept, [5]);
  assert.match(r2.out, /fixed delay/);
  assert.deepEqual(net2.posts[0].urlList, [`${D}/contact`]);
});

test('main: a gallery data change pings the gallery pages that load it', async () => {
  const { dir, write, commit, before } = makeRepo();
  write('image-automation.js', 'const imageCollections = { architecture: { alts: ["one", "two"] } };');
  const head = commit('gallery photo added');
  const dry = await runMain(['--root', dir, '--before', before, '--dry-run']);
  assert.match(dry.out, /image-automation\.js \(exact\)/);
  const net = fakeNet(liveSite(dir, () => head));
  const r = await runMain(['--root', dir, '--before', before], { fetchImpl: net.fetchImpl, sleep: noSleep });
  assert.equal(r.code, 0);
  assert.deepEqual(net.posts[0].urlList, [`${D}/architecture-photography`]);
});

test('main: the state tag carries pages from a cancelled run into the next one', async () => {
  const repo = makeRepo({ remote: true });
  const { dir, write, commit, before, remoteTag } = repo;
  const TAG = 'indexnow-last-sent';

  // Run A: no tag yet, so it compares from the push's before commit and sets the tag.
  write('projects.html', '<h1>projects A</h1>');
  const a = commit('push A');
  let live = a;
  const net = fakeNet(liveSite(dir, () => live));
  const ra = await runMain(['--root', dir, '--before', before, '--state-tag', TAG], { fetchImpl: net.fetchImpl, sleep: noSleep });
  assert.equal(ra.code, 0);
  assert.equal(remoteTag(TAG), a);

  // Push B (contact) never gets its own run; push C (projects) runs with before = B.
  write('contact.html', '<h1 class="a">contact B</h1>');
  const b = commit('push B');
  write('projects.html', '<h1>projects C</h1>');
  const c = commit('push C');
  live = c;
  const rc = await runMain(['--root', dir, '--before', b, '--state-tag', TAG], { fetchImpl: net.fetchImpl, sleep: noSleep });
  assert.equal(rc.code, 0);
  assert.match(rc.out, /comparing from the last sent commit/);
  assert.deepEqual(net.posts[1].urlList, [`${D}/contact`, `${D}/projects`]);
  assert.equal(remoteTag(TAG), c);

  // A failed send leaves the tag where it was.
  write('contact.html', '<h1 class="a">contact D</h1>');
  const d = commit('push D');
  live = d;
  const failing = fakeNet(liveSite(dir, () => live), { postStatus: 403 });
  const rd = await runMain(['--root', dir, '--before', c, '--state-tag', TAG], { fetchImpl: failing.fetchImpl, sleep: noSleep });
  assert.equal(rd.code, 1);
  assert.equal(remoteTag(TAG), c);

  // A dry run never moves it.
  await runMain(['--root', dir, '--before', c, '--state-tag', TAG, '--dry-run']);
  assert.equal(remoteTag(TAG), c);
});

test('main: manual --urls skips the wait and rejects other hosts', async () => {
  const { dir } = makeRepo();
  let posted;
  const r = await runMain(['--root', dir, '--urls', `${D}/contact,${D}/contact`], {
    fetchImpl: async (url, init) => { posted = JSON.parse(init.body); return new Response('', { status: 202 }); },
    sleep: async () => { throw new Error('should not wait'); },
  });
  assert.equal(r.code, 0);
  assert.deepEqual(posted.urlList, [`${D}/contact`]);
  await assert.rejects(() => m.main(['--root', dir, '--urls', 'https://example.com/x']), /must start with/);
});

test('main: a rejected request exits 1 so the workflow step shows it', async () => {
  const { dir } = makeRepo();
  const r = await runMain(['--root', dir, '--urls', `${D}/contact`], {
    fetchImpl: async () => new Response('key not valid', { status: 403 }), sleep: noSleep,
  });
  assert.equal(r.code, 1);
  assert.match(r.out, /HTTP 403/);
});

test('main: after a failed send, live checks use only the current push (round-2 finding 1)', async () => {
  const repo = makeRepo({ remote: true });
  const { dir, write, commit, before, remoteTag } = repo;
  const TAG = 'indexnow-last-sent';
  // Push A: a text edit that deploys, but the send is rejected; the tag stays at A's start.
  write('contact.html', '<h1 class="a">contact A</h1>');
  const a = commit('push A');
  const failing = fakeNet(liveSite(dir, () => a), { postStatus: 403 });
  const ra = await runMain(['--root', dir, '--before', before, '--state-tag', TAG], { fetchImpl: failing.fetchImpl, sleep: noSleep });
  assert.equal(ra.code, 1);
  assert.equal(remoteTag(TAG), before);
  // Push B: attribute-only edit to the same page; the live site still serves A.
  write('contact.html', '<h1 class="b">contact A</h1>');
  const b = commit('push B');
  const slept = [];
  const net = fakeNet(liveSite(dir, () => a));
  const rb = await runMain(['--root', dir, '--before', a, '--state-tag', TAG], {
    fetchImpl: net.fetchImpl, sleep: async (ms) => { slept.push(ms); }, fixedWaitMs: 7,
  });
  assert.equal(rb.code, 0);
  assert.deepEqual(slept, [7]); // fell back to the fixed wait instead of "confirming" from A's text
  assert.match(rb.out, /fixed delay/);
  assert.deepEqual(net.posts[0].urlList, [`${D}/contact`]);
  assert.equal(remoteTag(TAG), b);
});

test('main: a failed first run still leaves the next run a starting point (round-2 finding 2)', async () => {
  const repo = makeRepo({ remote: true });
  const { dir, write, commit, before, remoteTag } = repo;
  const TAG = 'indexnow-last-sent';
  assert.equal(remoteTag(TAG), null);
  write('contact.html', '<h1 class="a">contact A</h1>');
  const a = commit('push A');
  const failing = fakeNet(liveSite(dir, () => a), { postStatus: 500 });
  const ra = await runMain(['--root', dir, '--before', before, '--state-tag', TAG], { fetchImpl: failing.fetchImpl, sleep: noSleep });
  assert.equal(ra.code, 1);
  assert.equal(remoteTag(TAG), before); // saved before anything could fail
  write('projects.html', '<h1>projects B</h1>');
  const b = commit('push B');
  const net = fakeNet(liveSite(dir, () => b));
  const rb = await runMain(['--root', dir, '--before', a, '--state-tag', TAG], { fetchImpl: net.fetchImpl, sleep: noSleep });
  assert.equal(rb.code, 0);
  assert.deepEqual(net.posts[0].urlList, [`${D}/contact`, `${D}/projects`]);
  assert.equal(remoteTag(TAG), b);
});

test('main: a page pulled in by the rebase is sent once its own run lists it (round-2 finding 3)', async () => {
  const repo = makeRepo({ remote: true });
  const { dir, write, commit, before, remoteTag } = repo;
  const TAG = 'indexnow-last-sent';
  // Run A's HEAD already holds push B's new studio.html (the rebase), but A's
  // sitemap does not list it, so A sends only its own change and moves the tag.
  write('projects.html', '<h1>projects A</h1>');
  commit('push A');
  write('studio.html', '<h1>studio</h1>');
  const bHtml = commit('push B (pulled into run A by the rebase)');
  const net = fakeNet(liveSite(dir, () => bHtml));
  const ra = await runMain(['--root', dir, '--before', before, '--state-tag', TAG], { fetchImpl: net.fetchImpl, sleep: noSleep });
  assert.equal(ra.code, 0);
  assert.deepEqual(net.posts[0].urlList, [`${D}/projects`]);
  assert.equal(remoteTag(TAG), bHtml);
  // Run B regenerates the sitemap, which now lists /studio; the HTML is unchanged since the tag.
  write('sitemap.xml', sitemap(['/', '/architecture-photography', '/contact', '/old-page', '/projects', '/studio']));
  const bMap = commit('Auto-update sitemaps [skip ci]');
  const net2 = fakeNet(liveSite(dir, () => bMap));
  const rb = await runMain(['--root', dir, '--before', bHtml, '--state-tag', TAG], { fetchImpl: net2.fetchImpl, sleep: noSleep });
  assert.equal(rb.code, 0);
  assert.deepEqual(net2.posts[0].urlList, [`${D}/studio`]);
});

test('main: a tag that cannot be saved exits 1 (round-2 finding 4)', async () => {
  const repo = makeRepo({ remote: true });
  const { dir, g, write, commit, before } = repo;
  g('remote', 'set-url', 'origin', path.join(dir, 'no-such-remote'));
  write('styles.css', 'body{}');
  commit('css only');
  const r = await runMain(['--root', dir, '--before', before, '--state-tag', 'indexnow-last-sent'], {
    fetchImpl: async () => { throw new Error('should not fetch'); }, sleep: noSleep,
  });
  assert.equal(r.code, 1);
  assert.match(r.out, /could not move tag/);
});

test('main: an overlapping run that already deployed the tag is not used to confirm early (round-3 finding 1)', async () => {
  const repo = makeRepo({ remote: true });
  const { dir, write, commit, before, remoteTag } = repo;
  const TAG = 'indexnow-last-sent';
  write('contact.html', '<h1 class="a">contact A</h1>');
  const aHuman = commit('push A');
  write('index.html', '<h1 class="x">home</h1><a href="contact.html">Contact</a>');
  commit('push B (attribute-only), pulled into run A by the rebase');
  write('sitemap.xml', sitemap(['/', '/architecture-photography', '/contact', '/projects']));
  const aGen = commit('run A: Auto-update sitemaps [skip ci]');
  const netA = fakeNet(liveSite(dir, () => aGen));
  const ra = await runMain(['--root', dir, '--before', before, '--state-tag', TAG], { fetchImpl: netA.fetchImpl, sleep: noSleep });
  assert.equal(ra.code, 0);
  assert.equal(remoteTag(TAG), aGen);
  // Run B: its before is A's human commit; its own generated output is attribute-only.
  write('projects.html', '<h1 class="restamped">projects</h1>');
  const bGen = commit('run B: Auto-generate [skip ci]');
  const slept = [];
  const netB = fakeNet(liveSite(dir, () => aGen)); // B's deploy is not live yet
  const rb = await runMain(['--root', dir, '--before', aHuman, '--state-tag', TAG], {
    fetchImpl: netB.fetchImpl, sleep: async (ms) => { slept.push(ms); }, fixedWaitMs: 9,
  });
  assert.equal(rb.code, 0);
  assert.deepEqual(slept, [9]); // nothing distinct to check, so the fixed wait
  assert.deepEqual(netB.posts[0].urlList, [`${D}/projects`]);
  assert.equal(remoteTag(TAG), bGen);
});

test('main: after a force push, a failed run is still picked up next time (round-3 finding 2)', async () => {
  const repo = makeRepo({ remote: true });
  const { dir, g, write, commit, before, remoteTag } = repo;
  const TAG = 'indexnow-last-sent';
  write('contact.html', '<h1 class="a">contact old history</h1>');
  const old = commit('old history');
  g('reset', '-q', '--hard', before);
  write('projects.html', '<h1>projects new history</h1>');
  const n = commit('force-pushed new history');
  const failing = fakeNet(liveSite(dir, () => n), { postStatus: 500 });
  const rn = await runMain(['--root', dir, '--before', old, '--state-tag', TAG], { fetchImpl: failing.fetchImpl, sleep: noSleep });
  assert.equal(rn.code, 1);
  assert.equal(remoteTag(TAG), old);
  write('styles.css', 'body{}');
  const next = commit('ordinary css push');
  const net = fakeNet(liveSite(dir, () => next));
  const r = await runMain(['--root', dir, '--before', n, '--state-tag', TAG], { fetchImpl: net.fetchImpl, sleep: noSleep });
  assert.equal(r.code, 0);
  assert.deepEqual(net.posts[0].urlList, [`${D}/contact`, `${D}/projects`]);
  assert.equal(remoteTag(TAG), next);
});
