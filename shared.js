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
        document.body.style.overflow = menu.classList.contains('active') ? 'hidden' : 'auto';
    }
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
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
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
        }
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
