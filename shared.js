/**
 * Michael J. Kelley Photography - Shared JavaScript (FIXED VERSION)
 * Core functionality used across all pages
 */

// =============================================================================
// Mobile Menu Toggle
// =============================================================================

/**
 * Toggles the mobile navigation menu visibility
 */
function toggleMenu() {
    const menu = document.getElementById('nav-menu');
    if (menu) {
        menu.classList.toggle('active');
        syncMenuToggle();
    }
}

/**
 * Keyboard and screen-reader support for the header menu button (2026-11-08, his go on the
 * accessibility pass): aria-expanded follows the menu whichever way it opens or closes, and
 * Escape closes it and puts focus back on the button.
 */
function syncMenuToggle() {
    const menu = document.getElementById('nav-menu');
    const open = !!(menu && menu.classList.contains('active'));
    document.querySelectorAll('.header-nav .menu-toggle').forEach(function (btn) {
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
}

function initializeMenuToggleA11y() {
    const menu = document.getElementById('nav-menu');
    if (!menu) return;
    syncMenuToggle();
    new MutationObserver(syncMenuToggle).observe(menu, { attributes: true, attributeFilter: ['class'] });
    // Desktop Work menu: Escape closes it and leaves focus on Work; it stays closed until focus
    // or the pointer leaves it and comes back (WCAG 1.4.13, content on hover or focus).
    const dropdown = document.querySelector('.header-nav .dropdown');
    if (dropdown) {
        const reopen = function () { dropdown.classList.remove('is-dismissed'); };
        dropdown.addEventListener('mouseleave', reopen);
        dropdown.addEventListener('focusout', function (e) {
            if (!dropdown.contains(e.relatedTarget)) reopen();
        });
    }
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && dropdown && window.innerWidth > 768 && dropdown.matches(':hover, :focus-within')) {
            dropdown.classList.add('is-dismissed');
            const work = dropdown.querySelector('a');
            if (work && dropdown.contains(document.activeElement)) work.focus({ preventScroll: true });
            return;
        }
        if (e.key !== 'Escape' || !menu.classList.contains('active')) return;
        // Opened from the footer button: openMenuFromFooter closes it and returns focus there.
        if (document.querySelector('.footer-menu-toggle[aria-expanded="true"]')) return;
        const btn = document.querySelector('.header-nav .menu-toggle');
        const focusWasInMenu = menu.contains(document.activeElement) || document.activeElement === btn;
        menu.classList.remove('active');
        closeAllDropdowns();
        if (btn && focusWasInMenu) btn.focus({ preventScroll: true });
    });
}

/**
 * Footer menu button (2026-11-03, his ask: the footer's phone menu icon opens the same menu as the
 * header): opens the header's phone menu, moves focus to its first link, closes on Escape, and
 * when the menu closes by any route (X, outside click, Escape) puts focus back on the button.
 * aria-expanded follows the menu.
 */
function openMenuFromFooter(btn) {
    const menu = document.getElementById('nav-menu');
    if (!menu || menu.classList.contains('active')) return;
    menu.classList.add('active');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    const first = menu.querySelector('a');
    if (first) first.focus({ preventScroll: true });
    const onKey = function (e) {
        if (e.key === 'Escape') menu.classList.remove('active');
    };
    const watcher = new MutationObserver(function () {
        if (menu.classList.contains('active')) return;
        watcher.disconnect();
        document.removeEventListener('keydown', onKey);
        if (btn) {
            btn.setAttribute('aria-expanded', 'false');
            if (document.activeElement === document.body || menu.contains(document.activeElement)) {
                btn.focus({ preventScroll: true });
            }
        }
    });
    watcher.observe(menu, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('keydown', onKey);
}

// =============================================================================
// Mobile Dropdown Handling (IMPROVED)
// =============================================================================

/**
 * Initialize mobile dropdown functionality for header and footer
 */
function initializeMobileDropdowns() {
    // Header dropdown handling
    const headerDropdown = document.querySelector('.dropdown');
    if (headerDropdown) {
        const portfolioLink = headerDropdown.querySelector('a');
        
        if (portfolioLink) {
            portfolioLink.addEventListener('click', function(e) {
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                    e.stopPropagation(); // Prevent event bubbling
                    
                    // Check current state and toggle explicitly
                    const isCurrentlyActive = headerDropdown.classList.contains('active');
                    
                    // Close all dropdowns first
                    closeAllDropdowns();
                    
                    // If it wasn't active, open it
                    if (!isCurrentlyActive) {
                        headerDropdown.classList.add('active');
                    }
                    portfolioLink.setAttribute('aria-expanded', isCurrentlyActive ? 'false' : 'true');
                }
            });
        }
    }

    // Footer dropdown handling
    const footerDropdown = document.querySelector('.footer-dropdown');
    if (footerDropdown) {
        const footerPortfolioLink = footerDropdown.querySelector('a');
        
        if (footerPortfolioLink) {
            footerPortfolioLink.addEventListener('click', function(e) {
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                    e.stopPropagation(); // Prevent event bubbling
                    
                    // Check current state and toggle explicitly
                    const isCurrentlyActive = footerDropdown.classList.contains('active');
                    
                    // Close all dropdowns first
                    closeAllDropdowns();
                    
                    // If it wasn't active, open it
                    if (!isCurrentlyActive) {
                        footerDropdown.classList.add('active');
                    }
                }
            });
        }
    }
}

/**
 * Close all open dropdowns (NEW HELPER FUNCTION)
 */
function closeAllDropdowns() {
    const headerDropdown = document.querySelector('.dropdown');
    const footerDropdown = document.querySelector('.footer-dropdown');
    
    if (headerDropdown) {
        headerDropdown.classList.remove('active');
        const workLink = headerDropdown.querySelector('a');
        if (workLink && workLink.hasAttribute('aria-expanded')) workLink.setAttribute('aria-expanded', 'false');
    }
    if (footerDropdown) {
        footerDropdown.classList.remove('active');
    }
}

// =============================================================================
// Smooth Scrolling for Anchor Links
// =============================================================================

/**
 * Initialize smooth scrolling for anchor links
 * Excludes dropdown portfolio links to prevent conflicts
 */
function initializeSmoothScrolling() {
    // Target anchor links but exclude dropdown portfolio links
    const anchorLinks = document.querySelectorAll('a[href^="#"]:not(.dropdown > a):not(.footer-dropdown > a)');
    
    anchorLinks.forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Skip if it's just a hash without target
            if (href === '#' || href === '#portfolio') {
                return;
            }
            
            let target = null;
            try { target = document.querySelector(href); } catch (err) { return; }
            if (target) {
                e.preventDefault();
                // 2026-11-08 accessibility pass: no motion for visitors who ask for less, the
                // address bar shows the section (back button and shared links work), and focus
                // moves to the section so keyboard and screen-reader users land there too.
                const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                target.scrollIntoView({
                    behavior: reduce ? 'auto' : 'smooth',
                    block: 'start'
                });
                if (history.pushState) history.pushState(null, '', href);
                if (!target.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) {
                    target.setAttribute('tabindex', '-1');
                }
                target.focus({ preventScroll: true });
            }
        });
    });
}

// =============================================================================
// Window Resize Handler
// =============================================================================

/**
 * Handle window resize events for responsive behavior
 */
function handleWindowResize() {
    const menu = document.getElementById('nav-menu');
    const headerDropdown = document.querySelector('.dropdown');
    const footerDropdown = document.querySelector('.footer-dropdown');
    
    // Reset mobile menu state on desktop
    if (window.innerWidth > 768) {
        if (menu) {
            menu.classList.remove('active');
            syncMenuToggle();
        }
        // aria-expanded on Work only describes the phone menu's tap-to-open state
        const workLink = headerDropdown ? headerDropdown.querySelector('a') : null;
        if (workLink) workLink.removeAttribute('aria-expanded');
        if (headerDropdown) {
            headerDropdown.classList.remove('active');
        }
        if (footerDropdown) {
            footerDropdown.classList.remove('active');
        }
    }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Debounce function to limit the rate of function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute immediately on first call
 */
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction() {
        const context = this;
        const args = arguments;
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

// =============================================================================
// --- NEW: Fade-in on Scroll Functionality (FINAL, MOST RELIABLE VERSION) ---
// =============================================================================
/**
 * Sets up an Intersection Observer to add a 'is-visible' class to elements
 * when they enter the viewport, triggering a CSS fade-in animation.
 * @param {string} selector - The CSS selector for the elements to observe.
 */
function initializeScrollFadeIn(selector) {
    const elementsToFade = document.querySelectorAll(selector);
    if (elementsToFade.length === 0) {
        return;
    }

    const observer = new IntersectionObserver((entries, observerInstance) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observerInstance.unobserve(entry.target);
            }
        });
    }, { 
        threshold: 0.1 
    });

    // --- CHANGE: Use requestAnimationFrame instead of setTimeout. ---
    // This is the browser's native way to handle animations and rendering.
    // It schedules the observer to start right before the next repaint,
    // which reliably prevents the race condition.
    requestAnimationFrame(() => {
        elementsToFade.forEach(element => {
            observer.observe(element);
        });
    });
}


// =============================================================================
// Performance Optimization
// =============================================================================

/**
 * Preload critical images to improve user experience
 */
function preloadCriticalImages() {
    // Only preload if not on a mobile connection to save bandwidth
    if (navigator.connection && navigator.connection.effectiveType === 'slow-2g') {
        return;
    }
    
    // Preload common images that appear across multiple pages
    const criticalImages = [
        // Add any commonly used images here
        // Example: '/images/logo.jpg'
    ];
    
    criticalImages.forEach(imageSrc => {
        const img = new Image();
        img.src = imageSrc;
    });
}

// =============================================================================
// Initialize Everything
// =============================================================================

/**
 * Main initialization function - runs when DOM is ready
 */
function initializeSharedFunctionality() {
    // Initialize core features
    initializeMobileDropdowns();
    initializeMenuToggleA11y();
    initializeSmoothScrolling();
    
    // Performance optimizations
    preloadCriticalImages();
    
    // Set up event listeners
    window.addEventListener('resize', debounce(handleWindowResize, 250));
    
    // IMPROVED: Close mobile menu and dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        const menu = document.getElementById('nav-menu');
        const menuToggle = document.querySelector('.menu-toggle');
        const headerDropdown = document.querySelector('.dropdown');
        const footerDropdown = document.querySelector('.footer-dropdown');
        
        // Close mobile hamburger menu when clicking outside
        if (menu && menuToggle && 
            !menu.contains(e.target) && 
            !menuToggle.contains(e.target) && 
            menu.classList.contains('active')) {
            menu.classList.remove('active');
        }
        
        // IMPROVED: Close dropdowns when clicking outside (only on mobile)
        if (window.innerWidth <= 768) {
            let clickedInsideDropdown = false;
            
            // Check if click was inside any dropdown
            if (headerDropdown && headerDropdown.contains(e.target)) {
                clickedInsideDropdown = true;
            }
            if (footerDropdown && footerDropdown.contains(e.target)) {
                clickedInsideDropdown = true;
            }
            
            // If click was outside all dropdowns, close them
            if (!clickedInsideDropdown) {
                closeAllDropdowns();
            }
        }
    });
}

// =============================================================================
// Auto-Initialize on DOM Ready
// =============================================================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSharedFunctionality);
} else {
    // DOM is already loaded
    initializeSharedFunctionality();
}

// Footer copyright year: keeps the year current on every page (his request
// 2026-09-24; the year had been hand-typed as 2025 site-wide). Additive only.
(function () {
    function setYear() {
        var y = String(new Date().getFullYear());
        document.querySelectorAll('.copyright-year').forEach(function (el) { el.textContent = y; });
    }
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', setYear); } else { setYear(); }
})();
