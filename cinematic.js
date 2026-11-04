/**
 * cinematic.js — reusable cinematic-opening component (PROTOTYPE v2)
 * Extracted from prototypes/prototype-homepage.html; behavior preserved 1:1.
 *
 * Usage (per page, after the .stage markup):
 *   Cinematic.init({
 *     frames: [{ src: 'images/...jpg', cap: 'Caption' }, ...],   // required
 *       or, responsive (2026-11-03): [{ base: 'images/home/montage/name', cap: '...' }, ...]
 *       with  responsive: { widths: [800, 1200, 1600, 2400], ratio: 1.5 }
 *       (files "<base>-<w>w.avif|webp|jpg" from pipeline.js sized-derivatives)
 *     firstImageAt: 2600,   // ms — first frame fades in under the name
 *     settleAt: 4200,       // ms — name lifts, chrome reveals, loop starts
 *     hold: 5200,           // ms each frame holds (excludes crossfade)
 *     zoom: 0.08,           // Ken Burns drift amount
 *     zoomSecs: 7,          // drift duration
 *     honeycomb: true,      // faint hex backdrop behind the name
 *     fonts: [ ... ]        // font-load gate list (defaults below)
 *   });
 *
 * Dot navigation (added 2026-10-11, his ask): if the page has an element with
 * id="cDots", one button per frame is built into it. A click jumps to that
 * frame and restarts the countdown; a mouse resting on the dots pauses the
 * loop; arrow keys step while a dot has focus; a horizontal swipe on the stage
 * steps on touch screens. Pages without #cDots behave exactly as before.
 *
 * Invariants (hard-won — do not change casually):
 * - Font gating uses explicit document.fonts.load() calls per face+weight;
 *   document.fonts.ready alone resolves too early and causes a soft-then-pop
 *   swap. A 2.5s timeout starts the intro anyway if font loading stalls.
 * - Each frame drifts ONE direction (alternating in/out). The outgoing frame
 *   freezes its computed transform and fades opacity-only — never reverses.
 * - prefers-reduced-motion collapses everything to simple fades.
 *
 * Responsive frames (2026-11-03, his ask: images load by device, best practice): each frame is
 * a <picture> (AVIF, WebP, JPG) with srcset, and `sizes` is the frame's real width in CSS px
 * (phone: the screen width, shown whole; desktop: the cover width including the drift zoom),
 * so a phone takes ~1200w instead of the 2400 original. Frame 1 loads first at high priority;
 * every other frame loads only when it is next, and a frame is shown only once its image is
 * decoded, so no frame fades in half-loaded; a frame that fails (after a JPG retry) is skipped.
 * Each advance is scheduled after the previous frame shows, and any navigation or pause
 * invalidates pending advances. Keyboard focus on the dots pauses the rotation; reduced motion
 * does not auto-advance (WCAG 2.2.2, WAI carousel guidance).
 */

var Cinematic = (function () {
    'use strict';

    var DEFAULT_FONTS = [
        "700 16px 'Chakra Petch'",
        "600 16px 'Space Grotesk'",
        "500 16px 'Space Grotesk'",
        "400 16px 'Space Mono'"
    ];

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    function hexD(cx, cy, s) {
        var p = '';
        for (var k = 0; k < 6; k++) {
            var a = (-30 + 60 * k) * Math.PI / 180;
            p += (k === 0 ? 'M' : 'L') + (cx + s * Math.cos(a)).toFixed(1) + ' ' + (cy + s * Math.sin(a)).toFixed(1) + ' ';
        }
        return p + 'Z ';
    }

    function buildHoneycomb(el) {
        var Wd = 1600, Ht = 1000, s = 46, sq = Math.sqrt(3), d = '';
        var cols = Math.ceil(Wd / (s * sq)) + 2, rows = Math.ceil(Ht / (s * 1.5)) + 2;
        for (var r = -1; r < rows; r++) {
            for (var c = -1; c < cols; c++) {
                d += hexD(s * sq * (c + 0.5 * (r & 1)), s * 1.5 * r, s * 0.97);
            }
        }
        // stroke uses currentColor so the light Studio variant recolors via CSS
        el.innerHTML =
            '<svg viewBox="0 0 ' + Wd + ' ' + Ht + '" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>';
    }

    function init(config) {
        var frames = config.frames || [];
        var FIRST_IMAGE_AT = config.firstImageAt || 2600;
        var SETTLE_AT = config.settleAt || 4200;
        var HOLD = config.hold || 5200;
        var ZOOM = (config.zoom != null) ? config.zoom : 0.08;
        var ZOOM_SECS = config.zoomSecs || 7;
        var fonts = config.fonts || DEFAULT_FONTS;

        var stage = document.getElementById('stage');
        if (!stage || !frames.length) { return; }

        var cNum = document.getElementById('cNum');
        var cTot = document.getElementById('cTot');
        var cCap = document.getElementById('cCap');
        var hexbg = document.getElementById('hexbg');
        var dotsEl = document.getElementById('cDots');
        var layers = [];
        var dots = [];
        var current = null;
        var timer = null;
        var autoTok = 0;             // bumps when the auto-advance is stopped or rescheduled
        var navTok = 0;              // bumps on every manual choice (dot, swipe, arrow)
        var navPending = false;      // a manual choice is waiting for its frame
        var hoverPause = false, focusPause = false, userPause = false;
        var pauseBtn = null;
        var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var resp = config.responsive || null;
        var widths = resp && resp.widths && resp.widths.length ? resp.widths.slice().sort(function (a, b) { return a - b; }) : null;
        var phoneMq = window.matchMedia('(max-width: 640px)');   // cinematic.css phone layout
        var STEP = HOLD + 1800;      // hold + crossfade
        var READY_WAIT_MS = 4000;    // auto-advance waits this long for the next frame, then retries
        var RETRY_MS = 1500;
        var MANUAL_WAIT_MS = 10000;  // a dot/swipe/arrow choice waits this long for its frame
        var RESUME_MIN_MS = 800;     // after a pause ends, at least this beat before the next change
        var shownAt = 0;             // when the current frame appeared
        var pics = [];               // per frame: responsive picture state, or null (background frame)

        function paused() { return hoverPause || focusPause || userPause; }
        function settled() { return document.body.classList.contains('settled'); }

        function srcsetFor(base, ext) {
            return widths.map(function (w) { return base + '-' + w + 'w.' + ext + ' ' + w + 'w'; }).join(', ');
        }

        // the frame's width in CSS px, from the stage as laid out: phone = stage width (whole
        // frame, letterboxed); desktop = cover width for the frame's ratio times the drift zoom
        // (reduced motion has none). Phones leave the zoom out on purpose: at its 8% peak it
        // would move a 3x phone from the 1200w file to the 1600w (about 60% more bytes) for a
        // 5% stretch on a moving frame.
        function frameSizes() {
            var w = stage.clientWidth || document.documentElement.clientWidth || window.innerWidth;
            var h = stage.clientHeight || window.innerHeight;
            if (phoneMq.matches) { return Math.ceil(w) + 'px'; }
            var zoom = reduce ? 1 : 1 + ZOOM;
            var ratio = (resp && resp.ratio) || 1.5;
            return Math.ceil(Math.max(w, h * ratio) * zoom) + 'px';
        }

        function setSizes(p) {
            var sizes = frameSizes();
            if (p.sizes === sizes) { return; }
            p.sizes = sizes;
            p.sources.forEach(function (s) { s.setAttribute('sizes', sizes); });
            p.img.setAttribute('sizes', sizes);
        }

        function notify(p, ok) {
            p.state = ok ? 'ok' : 'failed';
            var w = p.waiters; p.waiters = [];
            w.forEach(function (fn) { fn(ok); });
        }

        // assign a responsive frame's sources (once); the browser then fetches one candidate.
        // A decode counts only for the request it began on. The first failure drops the AVIF/WebP
        // sources (a <picture> does not fall back by itself), so the JPG set loads; a second
        // failure marks the frame failed and the loop skips it.
        function load(i) {
            var p = pics[i];
            if (!p) { return; }
            if (p.state !== 'idle') { setSizes(p); return; }   // sizes may be stale after a resize
            p.state = 'loading';
            var img = p.img;
            function fail() {
                if (!p.fellBack) {
                    p.fellBack = true;
                    p.sources.forEach(function (s) { if (s.parentNode) { s.parentNode.removeChild(s); } });
                    p.sources = [];
                    img.setAttribute('src', img.getAttribute('data-src'));   // re-run selection on the JPG set
                    return;
                }
                notify(p, false);
            }
            img.addEventListener('load', function () {
                if (p.state !== 'loading' || !img.naturalWidth) { return; }
                var request = img.currentSrc;
                (img.decode ? img.decode() : Promise.resolve()).then(function () {
                    if (p.state === 'loading' && img.currentSrc === request) { notify(p, true); }
                }, function () {
                    if (p.state === 'loading' && img.currentSrc === request) { fail(); }
                });
            });
            // a resize can make a decoded frame pick another file; if that one fails, fall back too
            // (the browser keeps painting the earlier file while a reselected one loads)
            img.addEventListener('error', function () {
                if (p.state === 'ok') { p.state = 'loading'; }
                if (p.state === 'loading') { fail(); }
            });
            setSizes(p);
            p.sources.forEach(function (s) { s.setAttribute('srcset', s.getAttribute('data-srcset')); });
            img.setAttribute('srcset', img.getAttribute('data-srcset'));
            img.setAttribute('src', img.getAttribute('data-src'));
        }

        // true once frame i is decoded; false if it failed, or if it is still loading after
        // waitMs (counted from this call; the frame keeps loading)
        function whenReady(i, waitMs) {
            var p = pics[i];
            if (!p) { return Promise.resolve(true); }
            if (p.state !== 'idle') { setSizes(p); }           // decoded history refreshes when needed again
            if (p.state === 'ok') { return Promise.resolve(true); }
            if (p.state === 'failed') { return Promise.resolve(false); }
            load(i);
            return new Promise(function (resolve) {
                var done = false;
                function once(ok) { if (!done) { done = true; resolve(ok); } }
                p.waiters.push(once);
                setTimeout(function () { once(false); }, waitMs);
            });
        }

        // the next frame after `from` that has not failed (from itself if none)
        function nextIndex(from) {
            for (var k = 1; k <= frames.length; k++) {
                var n = (from + k) % frames.length;
                if (!pics[n] || pics[n].state !== 'failed') { return n; }
            }
            return from;
        }

        // build layers
        frames.forEach(function (f, i) {
            var d = document.createElement('div');
            d.className = 'frame';
            if (widths && f.base) {
                var pic = document.createElement('picture');
                var sources = [['avif', 'image/avif'], ['webp', 'image/webp']].map(function (t) {
                    var s = document.createElement('source');
                    s.type = t[1];
                    s.setAttribute('data-srcset', srcsetFor(f.base, t[0]));
                    pic.appendChild(s);
                    return s;
                });
                var img = document.createElement('img');
                img.alt = '';                               // decorative: the caption names each frame
                img.decoding = 'async';
                img.setAttribute('data-srcset', srcsetFor(f.base, 'jpg'));
                img.setAttribute('data-src', f.base + '-' + (widths.indexOf(1200) >= 0 ? 1200 : widths[widths.length - 1]) + 'w.jpg');
                if (i === 0) { img.setAttribute('fetchpriority', 'high'); }
                if (f.pos) { img.style.objectPosition = f.pos; }   // optional per-frame anchor (phone crops)
                pic.appendChild(img);
                d.appendChild(pic);
                pics.push({ img: img, sources: sources, state: 'idle', waiters: [], sizes: null, fellBack: false });
            } else {
                d.style.backgroundImage = 'url("' + f.src + '")';
                if (f.pos) { d.style.backgroundPosition = f.pos; }   // optional per-frame anchor (phone crops)
                var pre = new Image(); pre.src = f.src;               // warm the cache to avoid pop-in
                pics.push(null);
            }
            stage.insertBefore(d, stage.firstChild);
            layers.push(d);
        });
        load(0);   // the first frame starts loading now, at high priority

        // a rotated phone or resized window: refresh sizes on the frames in play now; the others
        // get theirs when they are next needed (load/whenReady), so history is not refetched
        var resizeT = null;
        window.addEventListener('resize', function () {
            clearTimeout(resizeT);
            resizeT = setTimeout(function () {
                [current, current === null ? null : nextIndex(current)].forEach(function (i) {
                    if (i !== null && pics[i] && pics[i].state !== 'idle') { setSizes(pics[i]); }
                });
            }, 200);
        });
        if (cTot) { cTot.textContent = pad(frames.length); }

        if (dotsEl) {
            // pause/play first, the size of a dot (2026-11-03, his ask: "Pause button the same size
            // as the dots would be great and positioned first"; WCAG 2.2.2). Reduced motion does not
            // rotate, so there is nothing to pause and no button.
            if (!reduce) {
                pauseBtn = document.createElement('button');
                pauseBtn.type = 'button';
                pauseBtn.className = 'dots-pause';
                pauseBtn.setAttribute('aria-label', 'Pause slideshow');
                pauseBtn.addEventListener('click', function () {
                    userPause = !userPause;
                    pauseBtn.classList.toggle('is-paused', userPause);
                    pauseBtn.setAttribute('aria-label', userPause ? 'Play slideshow' : 'Pause slideshow');
                    if (userPause) { stopLoop(); } else { resumeLoop(); }
                });
                dotsEl.appendChild(pauseBtn);
            }
            frames.forEach(function (f, n) {
                var b = document.createElement('button');
                b.type = 'button';
                b.setAttribute('aria-label', 'Image ' + (n + 1) + ' of ' + frames.length + (f.cap ? ': ' + f.cap : ''));
                b.addEventListener('click', function () { go(n); });
                dotsEl.appendChild(b);
                dots.push(b);
            });
        }

        if (hexbg && config.honeycomb !== false) {
            buildHoneycomb(hexbg);
        }

        function show(i) {
            // Freeze the OUTGOING frame at its current scale so it fades out
            // without reversing or snapping; reset next time it shows.
            if (current !== null && current !== i) {
                var prev = layers[current];
                var held = getComputedStyle(prev).transform;
                prev.style.transition = 'opacity 1.8s ease';   // opacity only -> transform holds
                prev.style.transform = (held === 'none') ? '' : held;
                prev.classList.remove('active');
            }

            document.body.classList.add('lit');                // first frame shown releases the intro cover
            var el = layers[i];
            if (reduce) {
                el.style.transition = 'opacity .4s ease';
                el.classList.add('active');
            } else {
                var zoomIn = (i % 2 === 0);                    // alternate: in, out, in...
                var from = zoomIn ? 1 : 1 + ZOOM;
                var to = zoomIn ? 1 + ZOOM : 1;
                el.style.transition = 'none';                  // place the start instantly
                el.style.transform = 'scale(' + from + ')';
                void el.offsetWidth;                           // reflow so the start sticks
                el.style.transition = 'opacity 1.8s ease, transform ' + ZOOM_SECS + 's ease-out';
                el.classList.add('active');
                el.style.transform = 'scale(' + to + ')';      // drift ONE direction
            }

            if (cNum) { cNum.textContent = pad(i + 1); }
            if (cCap) { cCap.textContent = frames[i].cap || ''; }
            dots.forEach(function (b, n) {
                b.classList.toggle('is-on', n === i);
                if (n === i) { b.setAttribute('aria-current', 'true'); } else { b.removeAttribute('aria-current'); }
            });
            current = i;
            shownAt = Date.now();
            load(nextIndex(i));                                // next frame loads during this hold
        }

        function stopLoop() {
            if (timer) { clearTimeout(timer); timer = null; }
            autoTok++;
        }

        // one advance per accepted frame: the next is scheduled only after a frame shows, so
        // every frame gets its full hold. Reduced motion does not auto-advance (WAI carousel
        // guidance); dots, swipe and arrows still work. Pausing or resuming touches only the
        // auto-advance; a pending manual choice survives it.
        function scheduleNext(delay) {
            stopLoop();
            if (reduce || paused() || !settled() || navPending || current === null) { return; }
            var tok = autoTok;
            timer = setTimeout(function () { timer = null; advance(tok); }, delay == null ? STEP : delay);
        }

        // Ending a pause (mouse off the dots, focus leaving them, Play) does not restart the hold:
        // the hold kept running while paused, and the pause only held the change back. A frame whose
        // hold is already up moves on after a short beat; one that just appeared gets the rest of its
        // hold (2026-11-03, his report: after mousing off the dots "the slideshow pauses for several
        // seconds").
        function resumeLoop() {
            if (current === null) { scheduleNext(); return; }
            scheduleNext(Math.max(RESUME_MIN_MS, shownAt + STEP - Date.now()));
        }

        function advance(tok) {
            if (tok !== autoTok || navPending || current === null) { return; }
            var n = nextIndex(current);
            if (n === current) { return; }                     // nothing else can show
            whenReady(n, READY_WAIT_MS).then(function (ok) {
                if (tok !== autoTok || navPending) { return; } // stopped, or a manual choice came in
                if (ok) { show(n); scheduleNext(); }
                else { scheduleNext(RETRY_MS); }               // not ready yet, or failed (skipped next time)
            });
        }

        // manual navigation: show frame n once it is ready, then restart the countdown so the
        // chosen frame gets a full hold. Only a newer choice supersedes it. Ignored until the
        // intro has settled.
        function go(n) {
            if (!settled()) { return; }
            n = (n + frames.length) % frames.length;
            var tok = ++navTok;
            navPending = true;
            stopLoop();
            whenReady(n, MANUAL_WAIT_MS).then(function (ok) {
                if (tok !== navTok) { return; }                // superseded by a newer choice
                navPending = false;
                if (ok && n !== current) { show(n); }
                scheduleNext();
            });
        }

        if (dotsEl) {
            // mouse only: a tap on a phone fires pointerenter with no pointerleave,
            // which would leave the loop paused
            dotsEl.addEventListener('pointerenter', function (e) {
                if (e.pointerType !== 'mouse') { return; }
                hoverPause = true; stopLoop();
            });
            dotsEl.addEventListener('pointerleave', function (e) {
                if (e.pointerType !== 'mouse') { return; }
                hoverPause = false; resumeLoop();
            });
            // keyboard focus on the dots pauses the rotation (WCAG 2.2.2); it resumes on leaving
            // (focus on the pause button itself does not count: that button states its own choice)
            dotsEl.addEventListener('focusin', function (e) {
                if (e.target === pauseBtn) { return; }
                focusPause = true; stopLoop();
            });
            dotsEl.addEventListener('focusout', function (e) {
                if (e.relatedTarget && e.relatedTarget !== pauseBtn && dotsEl.contains(e.relatedTarget)) { return; }
                if (!focusPause) { return; }
                focusPause = false; resumeLoop();
            });
            dotsEl.addEventListener('keydown', function (e) {
                var k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
                if (!k || current === null) { return; }
                e.preventDefault();
                var from = dots.indexOf(document.activeElement);   // step from the focused dot
                var dest = ((from < 0 ? current : from) + k + frames.length) % frames.length;
                if (dots[dest]) { dots[dest].focus(); }
                go(dest);
            });

            var tx = null, ty = null;
            stage.addEventListener('touchstart', function (e) {
                var t = e.changedTouches[0]; tx = t.clientX; ty = t.clientY;
            }, { passive: true });
            stage.addEventListener('touchend', function (e) {
                if (tx === null || current === null) { return; }
                var t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty;
                tx = null;
                if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                    go(current + (dx < 0 ? 1 : -1));
                }
            }, { passive: true });
        }

        // the first frame to show: frame 1 once decoded; if it fails, the next frame that loads.
        // Keeps trying until a frame shows (a manual choice also counts) or every frame failed.
        function showFirst(i) {
            if (current !== null) { return; }
            whenReady(i, READY_WAIT_MS).then(function (ok) {
                if (current !== null) { return; }
                if (ok) { show(i); scheduleNext(); return; }
                if (pics[i] && pics[i].state === 'failed') {
                    var n = nextIndex(i);
                    if (n === i) { document.body.classList.add('lit'); return; }   // nothing can show
                    showFirst(n);
                } else {
                    showFirst(i);                              // still loading: keep waiting
                }
            });
        }

        var started = false;
        function startIntro() {
            if (started) { return; }
            started = true;
            document.body.classList.add('fonts-ready');   // release the name animation

            // 1) first image fades in under the name
            setTimeout(function () { showFirst(0); }, reduce ? 200 : FIRST_IMAGE_AT);

            // 2) name lifts away; chrome settles in; montage advances
            setTimeout(function () {
                document.body.classList.remove('is-intro');
                document.body.classList.add('settled');
                if (current !== null) { scheduleNext(); }
            }, reduce ? 600 : SETTLE_AT);
        }

        if (document.fonts && document.fonts.load) {
            Promise.all(fonts.map(function (f) { return document.fonts.load(f); }))
                .then(function () { return document.fonts.ready; })
                .then(startIntro, startIntro);
            setTimeout(startIntro, 2500);   // fallback if font loading stalls
        } else {
            startIntro();
        }
    }

    return { init: init };
})();
