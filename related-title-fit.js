/*
 * related-title-fit.js - Related Reading titles fit three lines on phones.
 *
 * His rule (2026-11-03): on phones a related-post title takes at most three lines. A longer one
 * is trimmed back to its last natural break that still fits (end of a sentence, a colon or
 * semicolon, before a dash or bracket); failing that, to the last whole word plus an ellipsis.
 * Desktop shows the whole title. Loaded by the Related Reading block that generate-blog.js
 * stamps; without JavaScript every title simply shows in full.
 *
 * - Lines are counted from the rendered line boxes (Range.getClientRects), not estimated from
 *   line-height, so user font settings and zoom are measured, not guessed.
 * - It refits when a list changes size (ResizeObserver), the viewport changes, or fonts load.
 * - Words come from Intl.Segmenter when the browser has it (locale-aware), else whitespace.
 * - Abbreviations ("Dr.", "U.S.", "J.") are not sentence ends. The list comes from the
 *   generator (data-abbr on this script tag) so both use one list.
 * - The full title stays in the HTML; a trimmed link carries it as its aria-label.
 * - Exception: a single word too long for three lines is cut by character, because keeping the
 *   whole word and keeping three lines cannot both hold. A rejected candidate is never put back.
 */
(function () {
  'use strict';

  var MAX_LINES = 3;
  var PHONE = '(max-width: 768px)';
  var ELLIPSIS = '\u2026';
  var script = document.currentScript;
  var abbr = {};
  ((script && script.getAttribute('data-abbr')) || '').split(/\s+/).forEach(function (a) {
    if (a) abbr[a.toLowerCase()] = true;
  });

  var lang = document.documentElement.lang || undefined;
  var wordSeg = null, charSeg = null;
  try {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      wordSeg = new Intl.Segmenter(lang, { granularity: 'word' });
      charSeg = new Intl.Segmenter(lang, { granularity: 'grapheme' });
    }
  } catch (e) { wordSeg = charSeg = null; }

  // Rendered lines: group the text's line-box rectangles by their vertical middle.
  function countLines(el) {
    var range = document.createRange();
    range.selectNodeContents(el);
    var rects = range.getClientRects();
    var rows = [];
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      if (r.width < 0.5 || r.height < 0.5) continue;
      var mid = (r.top + r.bottom) / 2, seen = false;
      for (var j = 0; j < rows.length; j++) {
        if (mid > rows[j].top && mid < rows[j].bottom) { seen = true; break; }
      }
      if (!seen) rows.push({ top: r.top, bottom: r.bottom });
    }
    return rows.length;
  }

  function fits(el, text) {
    el.textContent = text;
    return countLines(el) <= MAX_LINES;
  }

  function hasWordChar(s) { return /[\p{L}\p{N}]/u.test(s); }

  // A period after an abbreviation, an initial or a dotted abbreviation is not a sentence end
  // (same tests as the generator's address rule). A number followed by a period ends a sentence
  // ("Porsche 911. A..."), unless the title starts with it as a list marker ("1. Light").
  function isAbbreviation(head) {
    var before = head.slice(0, -1);
    if (/^\s*\p{N}+$/u.test(before)) return true;
    var word = (before.match(/[\p{L}.]+$/u) || [''])[0];
    if (!word) return false;
    var lower = word.toLowerCase();
    return abbr[lower] === true || lower.indexOf('.') !== -1 || /^\p{L}$/u.test(word);
  }

  function clean(s) {
    return s.replace(/[\s:;,\uFF1A\uFF1B\u3001\uFF0C]+$/u, '').trim();
  }

  // Candidate titles at natural breaks, shortest to longest.
  function naturalCuts(full) {
    var cuts = [], m;
    // sentence ends, with any closing quote or bracket kept. The next word must start a sentence
    // (a capital, a digit, an opening quote, or a script without capitals), as in the generator.
    var end = /([.!?\u3002\uFF01\uFF1F]+)(["'\u201D\u2019\u00BB)\]]*)(?=\s)/gu;
    while ((m = end.exec(full))) {
      var stop = m.index + m[0].length;
      var rest = full.slice(stop).replace(/^\s+/, '');
      if (!rest || !/^["'\u201C\u2018(\[]*[\p{Lu}\p{N}\p{Lo}]/u.test(rest)) continue;
      if (m[1] === '.' && isAbbreviation(full.slice(0, m.index + 1))) continue;
      cuts.push(full.slice(0, stop));
    }
    // CJK sentence marks need no following space
    var cjk = /[\u3002\uFF01\uFF1F]/gu;
    while ((m = cjk.exec(full))) {
      if (m.index + 1 < full.length) cuts.push(full.slice(0, m.index + 1));
    }
    // cut before a colon or semicolon, a dash (spaced or not), a spaced hyphen, or a bracket
    var before = /\s*(?:[:;](?=\s)|[\uFF1A\uFF1B]|[\u2014\u2013]|\s-\s|[(\[\uFF08\u3010])/gu;
    while ((m = before.exec(full))) {
      if (m.index > 0) cuts.push(full.slice(0, m.index));
      if (m[0].length === 0) before.lastIndex++;
    }
    var out = [], seen = Object.create(null);
    cuts.map(clean).forEach(function (c) {
      if (c && c !== full && hasWordChar(c) && !seen[c]) { seen[c] = true; out.push(c); }
    });
    return out.sort(function (a, b) { return a.length - b.length; });
  }

  // End offsets of whole words (locale-aware when possible).
  function wordEnds(full) {
    var ends = [];
    if (wordSeg) {
      var it = wordSeg.segment(full)[Symbol.iterator](), s;
      while (!(s = it.next()).done) {
        if (s.value.isWordLike) ends.push(s.value.index + s.value.segment.length);
      }
    } else {
      var re = /\S+/g, m;
      while ((m = re.exec(full))) ends.push(m.index + m[0].length);
    }
    return ends;
  }

  function graphemeEnds(text) {
    var ends = [];
    if (charSeg) {
      var it = charSeg.segment(text)[Symbol.iterator](), s;
      while (!(s = it.next()).done) ends.push(s.value.index + s.value.segment.length);
    } else {
      // No Segmenter: never cut before a combining mark, a joiner, a variation selector, a skin
      // tone or a tag character, or right after a joiner, so accents and emoji stay whole.
      var cps = Array.from(text), pos = 0, flags = 0;
      for (var i = 0; i < cps.length; i++) {
        pos += cps[i].length;
        var next = cps[i + 1];
        // regional indicators pair into one flag: never cut after an odd one
        flags = /[\u{1F1E6}-\u{1F1FF}]/u.test(cps[i]) ? flags + 1 : 0;
        if (flags % 2 === 1 && next && /[\u{1F1E6}-\u{1F1FF}]/u.test(next)) continue;
        if (cps[i] === '\u200D') continue;
        if (next && /[\p{M}\u200D\uFE0E\uFE0F\u{1F3FB}-\u{1F3FF}\u{E0020}-\u{E007F}]/u.test(next)) continue;
        ends.push(pos);
      }
    }
    return ends;
  }

  // Largest prefix (at the given offsets) that fits with an ellipsis; binary search, since a
  // longer prefix never takes fewer lines.
  function longestPrefix(el, full, ends) {
    var lo = 0, hi = ends.length - 1, best = null;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      var text = clean(full.slice(0, ends[mid])) + ELLIPSIS;
      if (fits(el, text)) { best = text; lo = mid + 1; } else { hi = mid - 1; }
    }
    return best;
  }

  function fitTitle(el) {
    var link = el.parentNode;
    var full = el.getAttribute('data-full');
    if (full === null) { full = el.textContent; el.setAttribute('data-full', full); }

    if (!window.matchMedia(PHONE).matches || fits(el, full)) {
      el.textContent = full;
      if (link && link.removeAttribute) link.removeAttribute('aria-label');
      return;
    }

    var chosen = null;
    var cuts = naturalCuts(full), lo = 0, hi = cuts.length - 1;
    while (lo <= hi) {   // the longest natural prefix that fits (a longer one never takes fewer lines)
      var mid = (lo + hi) >> 1;
      if (fits(el, cuts[mid])) { chosen = cuts[mid]; lo = mid + 1; } else { hi = mid - 1; }
    }
    if (!chosen) chosen = longestPrefix(el, full, wordEnds(full));
    if (!chosen) {
      // One word too long for three lines: the documented exception, cut by character.
      var firstWord = full.slice(0, (wordEnds(full)[0] || full.length));
      chosen = longestPrefix(el, firstWord, graphemeEnds(firstWord)) || ELLIPSIS;
    }
    el.textContent = chosen;
    if (link && link.setAttribute) link.setAttribute('aria-label', full);
  }

  // What a fit depends on: the room beside the thumbnail and the type settings. A title is refit
  // only when this changes, so a settled result is never redone and the observers cannot loop.
  // The room left for the words: the link's inner width minus the thumbnail and the gap.
  function textRoom(el) {
    var a = el.parentNode;
    if (!a || !a.getBoundingClientRect) return 0;
    var ca = getComputedStyle(a);
    var room = a.getBoundingClientRect().width - (parseFloat(ca.paddingLeft) || 0) - (parseFloat(ca.paddingRight) || 0);
    var img = a.querySelector('img');
    if (img) room -= img.getBoundingClientRect().width + (parseFloat(ca.columnGap) || parseFloat(ca.gap) || 0);
    return room;
  }

  function fitKey(el) {
    var cs = getComputedStyle(el);
    return [window.matchMedia(PHONE).matches, Math.round(textRoom(el) * 10), cs.fontSize, cs.fontFamily,
      cs.fontWeight, cs.fontStyle, cs.lineHeight, cs.letterSpacing, cs.wordSpacing, cs.textTransform].join('|');
  }

  var titles = document.querySelectorAll('.related-posts .related-posts-title');
  function fitAll(force) {
    for (var i = 0; i < titles.length; i++) {
      var el = titles[i], key = fitKey(el);
      if (!force && el.__fitKey === key) continue;
      fitTitle(el);
      el.__fitKey = key;
    }
  }

  var queued = false, forceNext = false;
  function schedule(force) {
    if (force === true) forceNext = true;
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      var f = forceNext;
      forceNext = false;
      fitAll(f);
    });
  }
  function soft() { schedule(false); }
  function hard() { schedule(true); }

  fitAll(true);
  // Watch each list and each title: a thumbnail can hold a list's size steady while a title's
  // wrapping changes. The per-title key keeps this from refitting a settled title.
  if (typeof ResizeObserver === 'function') {
    var ro = new ResizeObserver(soft);
    var lists = document.querySelectorAll('.related-posts');
    for (var k = 0; k < lists.length; k++) ro.observe(lists[k]);
    for (var t = 0; t < titles.length; t++) ro.observe(titles[t]);
  }
  window.addEventListener('resize', soft);
  window.addEventListener('orientationchange', soft);
  // A font that finishes loading changes glyph widths without changing any setting: refit all.
  if (document.fonts) {
    if (document.fonts.ready) document.fonts.ready.then(hard);
    if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', hard);
  }
  // Styles added or changed after load (a stylesheet, a reader extension, a class on the page)
  // can change the type without changing any box the observers watch: re-check every title.
  // The per-title key still skips titles whose fit inputs did not change.
  if (typeof MutationObserver === 'function') {
    var mo = new MutationObserver(soft);
    if (document.head) mo.observe(document.head, { childList: true, subtree: true, attributes: true, characterData: true });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'lang'] });
    if (document.body) mo.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });
  }
})();
