/**
 * cinematic.js — reusable cinematic-opening component (PROTOTYPE v2)
 * Extracted from prototypes/prototype-homepage.html; behavior preserved 1:1.
 *
 * Usage (per page, after the .stage markup):
 *   Cinematic.init({
 *     frames: [{ src: 'images/...jpg', cap: 'Caption' }, ...],   // required
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
        var idx = 0;
        var current = null;
        var timer = null;
        var paused = false;
        var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // build layers + preload (warm the cache to avoid pop-in)
        frames.forEach(function (f) {
            var d = document.createElement('div');
            d.className = 'frame';
            d.style.backgroundImage = 'url("' + f.src + '")';
            if (f.pos) { d.style.backgroundPosition = f.pos; }   // optional per-frame anchor (phone crops)
            stage.insertBefore(d, stage.firstChild);
            layers.push(d);
            var pre = new Image(); pre.src = f.src;
        });
        if (cTot) { cTot.textContent = pad(frames.length); }

        if (dotsEl) {
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
        }

        function stopLoop() {
            if (timer) { clearInterval(timer); timer = null; }
        }

        function startLoop() {
            stopLoop();
            var step = HOLD + 1800; // hold + crossfade
            timer = setInterval(function () {
                idx = (idx + 1) % frames.length;
                show(idx);
            }, reduce ? 4000 : step);
        }

        // manual navigation: jump to frame n, then restart the countdown so the
        // chosen frame gets a full hold. Ignored until the intro has settled.
        function go(n) {
            if (!document.body.classList.contains('settled')) { return; }
            n = (n + frames.length) % frames.length;
            if (n !== current) { idx = n; show(n); }
            if (!paused) { startLoop(); }
        }

        if (dotsEl) {
            // mouse only: a tap on a phone fires pointerenter with no pointerleave,
            // which would leave the loop paused
            dotsEl.addEventListener('pointerenter', function (e) {
                if (e.pointerType !== 'mouse') { return; }
                paused = true; stopLoop();
            });
            dotsEl.addEventListener('pointerleave', function (e) {
                if (e.pointerType !== 'mouse') { return; }
                paused = false;
                if (document.body.classList.contains('settled')) { startLoop(); }
            });
            dotsEl.addEventListener('keydown', function (e) {
                var k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
                if (!k || current === null) { return; }
                e.preventDefault();
                var from = dots.indexOf(document.activeElement);   // step from the focused dot
                go((from < 0 ? current : from) + k);
                if (dots[current]) { dots[current].focus(); }
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

        var started = false;
        function startIntro() {
            if (started) { return; }
            started = true;
            document.body.classList.add('fonts-ready');   // release the name animation

            // 1) first image fades in under the name
            setTimeout(function () {
                document.body.classList.add('lit');
                show(0);
            }, reduce ? 200 : FIRST_IMAGE_AT);

            // 2) name lifts away; chrome settles in; montage advances
            setTimeout(function () {
                document.body.classList.remove('is-intro');
                document.body.classList.add('settled');
                if (!paused) { startLoop(); }
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
