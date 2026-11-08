/**
 * Michael J. Kelley Photography - Gallery JavaScript
 * Image gallery and lightbox functionality for portfolio pages
 */

// =============================================================================
// Gallery Configuration and State
// =============================================================================

let currentImageIndex = 0;
let galleryImages = [];
let lightboxActive = false;
let lightboxOpener = null;   // element that had focus when the lightbox opened
let touchStartX = 0;
let touchEndX = 0;
// Incremented on every lightbox update so a slow earlier load cannot overwrite a later one.
let lightboxRequestToken = 0;

/**
 * Applies an entry's responsive candidates to an image element, in the only order that
 * works: sizes, then srcset, then the caller sets src. A stale srcset left in place would
 * keep the previous image selected even after src changes, so entries without candidates
 * (project-page galleries pass plain {src, alt}) get both attributes removed.
 * @param {HTMLImageElement} imgEl
 * @param {Object} entry - gallery image entry, optionally carrying srcset and sizes
 */
// Project pages (2026-11-03): an entry may carry `avifSrcset`, a 1200w + original AVIF set, used
// once this probe has shown the browser decodes AVIF; until then, or without support, the entry's
// own srcset (if any) or its JPG src is used. Galleries pass `srcset` already in their best format.
let lightboxAvifOk = false;
(function () {
    const probe = new Image();
    probe.onload = function () { lightboxAvifOk = probe.width > 0; };
    probe.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABcAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB9tZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
})();

// "x.avif" / "x.webp" -> "x.jpg": every site image has a JPG of the same name
function jpgOf(url) {
    return String(url).replace(/\.(avif|webp)(?=$|[?#])/i, '.jpg');
}

function applyResponsiveAttributes(imgEl, entry) {
    const srcset = entry && (entry.avifSrcset && lightboxAvifOk ? entry.avifSrcset : entry.srcset);
    if (srcset) {
        if (entry.sizes) {
            imgEl.setAttribute('sizes', entry.sizes);
        } else {
            imgEl.removeAttribute('sizes');
        }
        imgEl.setAttribute('srcset', srcset);
    } else {
        imgEl.removeAttribute('srcset');
        imgEl.removeAttribute('sizes');
    }
}

// =============================================================================
// Lightbox Core Functions
// =============================================================================

/**
 * Opens the lightbox with the specified image index
 * @param {number} index - Index of the image to display
 */
function openLightbox(index) {
    if (index < 0 || index >= galleryImages.length) {
        console.warn('Invalid image index:', index);
        return;
    }
    
    currentImageIndex = index;
    updateLightboxImage();
    
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        // Remember where focus was so closing can put it back (2026-11-08 accessibility pass).
        if (!lightboxActive) {
            const active = document.activeElement;
            lightboxOpener = active && active !== document.body && !lightbox.contains(active) ? active : null;
        }
        lightbox.classList.add('active');
        lightboxActive = true;
        document.body.style.overflow = 'hidden';
        
        // Focus management for accessibility: focus the close control inside the dialog
        const closeCtl = lightbox.querySelector('.lightbox-close');
        (closeCtl || lightbox).focus({ preventScroll: true });
        
        // Preload adjacent images for smoother navigation
        preloadAdjacentImages();
    }
}

/**
 * Closes the lightbox and restores page state
 */
function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.classList.remove('active');
        lightboxActive = false;
        document.body.style.overflow = 'auto';
        
        // Return focus to whatever opened the lightbox; fall back to the tile of the photo shown
        const galleryItem = (lightboxOpener && document.contains(lightboxOpener))
            ? lightboxOpener
            : document.querySelector(`[onclick="openLightbox(${currentImageIndex})"]`);
        lightboxOpener = null;
        if (galleryItem) {
            galleryItem.focus({ preventScroll: true });
        }
    }
}

/**
 * Navigate to the next image in the gallery
 */
function nextImage() {
    if (galleryImages.length === 0) return;
    
    currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
    updateLightboxImage();
    preloadAdjacentImages();
}

/**
 * Navigate to the previous image in the gallery
 */
function previousImage() {
    if (galleryImages.length === 0) return;
    
    currentImageIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
    updateLightboxImage();
    preloadAdjacentImages();
}

/**
 * Updates the lightbox with the current image
 */
function updateLightboxImage() {
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCounter = document.getElementById('lightbox-counter');
    
    if (!lightboxImg || !galleryImages[currentImageIndex]) return;
    
    const currentImage = galleryImages[currentImageIndex];
    const requestToken = ++lightboxRequestToken;

    // Fade out current image
    lightboxImg.style.opacity = '0.5';

    // Load new image (the probe carries the same candidates, so it warms the cache
    // with the file the displayed image will actually pick)
    let candidatesFailed = false;
    let probeRetried = false;
    let jpgRetried = false;
    let displaySrc = currentImage.src;
    const img = new Image();
    img.onload = function() {
        if (requestToken !== lightboxRequestToken) return; // a newer image won the race
        // One-shot recovery: if the chosen candidate 404s or will not decode, drop the
        // candidates and show the original as a JPG (always present).
        lightboxImg.onerror = function() {
            this.onerror = null;
            this.removeAttribute('srcset');
            this.removeAttribute('sizes');
            this.src = jpgOf(currentImage.src);
        };
        applyResponsiveAttributes(lightboxImg, candidatesFailed ? null : currentImage);
        lightboxImg.src = displaySrc;
        lightboxImg.alt = currentImage.alt;
        lightboxImg.style.opacity = '1';
    };
    img.onerror = function() {
        if (requestToken !== lightboxRequestToken) return;
        // A missing derivative must not stop the lightbox from showing the image:
        // retry the probe once on the plain original, then once as a JPG.
        if (!probeRetried && img.hasAttribute('srcset')) {
            probeRetried = true;
            candidatesFailed = true;
            applyResponsiveAttributes(img, null);
            img.src = displaySrc;
            return;
        }
        if (!jpgRetried && jpgOf(displaySrc) !== displaySrc) {
            jpgRetried = true;
            candidatesFailed = true;
            displaySrc = jpgOf(displaySrc);
            img.src = displaySrc;
            return;
        }
        console.error('Failed to load image:', currentImage.src);
        lightboxImg.style.opacity = '1';
    };
    applyResponsiveAttributes(img, currentImage);
    img.src = currentImage.src;

    // Update counter
    if (lightboxCounter) {
        lightboxCounter.textContent = `${currentImageIndex + 1} / ${galleryImages.length}`;
    }
    
    // Update navigation button states
    updateNavigationButtons();
}

/**
 * Updates navigation button visibility and accessibility
 */
function updateNavigationButtons() {
    const prevButton = document.querySelector('.lightbox-prev');
    const nextButton = document.querySelector('.lightbox-next');
    
    if (!prevButton || !nextButton) return;
    
    // Single image - hide navigation
    if (galleryImages.length <= 1) {
        prevButton.style.display = 'none';
        nextButton.style.display = 'none';
    } else {
        prevButton.style.display = 'block';
        nextButton.style.display = 'block';
        
        // Update ARIA labels for accessibility
        prevButton.setAttribute('aria-label', `Previous image (${currentImageIndex === 0 ? galleryImages.length : currentImageIndex} of ${galleryImages.length})`);
        nextButton.setAttribute('aria-label', `Next image (${currentImageIndex + 2 > galleryImages.length ? 1 : currentImageIndex + 2} of ${galleryImages.length})`);
    }
}

// =============================================================================
// Performance Optimization
// =============================================================================

/**
 * Preloads adjacent images for smoother navigation
 */
function preloadAdjacentImages() {
    if (galleryImages.length <= 1) return;
    
    const preloadIndexes = [
        (currentImageIndex + 1) % galleryImages.length,
        (currentImageIndex - 1 + galleryImages.length) % galleryImages.length
    ];
    
    preloadIndexes.forEach(index => {
        const entry = galleryImages[index];
        if (!entry) return;
        const img = new Image();
        applyResponsiveAttributes(img, entry);
        img.src = entry.src;
    });
}

/**
 * Lazy loads gallery images using Intersection Observer
 */
function initializeLazyLoading() {
    if (!('IntersectionObserver' in window)) {
        // Fallback for older browsers - load all images immediately
        return;
    }
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const dataSrc = img.getAttribute('data-src');
                
                if (dataSrc) {
                    img.src = dataSrc;
                    img.removeAttribute('data-src');
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            }
        });
    }, {
        rootMargin: '50px 0px',
        threshold: 0.01
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// =============================================================================
// Event Handlers
// =============================================================================

/**
 * Handles keyboard navigation in the lightbox
 * @param {KeyboardEvent} e - The keyboard event
 */
function handleKeyboardNavigation(e) {
    if (!lightboxActive) return;
    // Standard photo-viewer keys (2026-11-08, his question "why is space bar the forward
    // button?"): arrows move, Home/End jump, Escape closes, Tab stays inside. Space and Enter
    // are left alone so they press whichever button has focus, as everywhere else on the web.
    
    switch(e.key) {
        case 'Escape':
            e.preventDefault();
            closeLightbox();
            break;
        case 'Tab':
            trapLightboxFocus(e);
            break;
        case 'ArrowRight':
            e.preventDefault();
            nextImage();
            break;
        case 'ArrowLeft':
            e.preventDefault();
            previousImage();
            break;
        case 'Home':
            e.preventDefault();
            currentImageIndex = 0;
            updateLightboxImage();
            break;
        case 'End':
            e.preventDefault();
            currentImageIndex = galleryImages.length - 1;
            updateLightboxImage();
            break;
    }
}

/**
 * Handles touch events for mobile swipe navigation
 * @param {TouchEvent} e - The touch event
 */
function handleTouchStart(e) {
    if (!lightboxActive) return;
    touchStartX = e.changedTouches[0].screenX;
}

/**
 * Handles touch end events for mobile swipe navigation
 * @param {TouchEvent} e - The touch event
 */
function handleTouchEnd(e) {
    if (!lightboxActive) return;
    
    touchEndX = e.changedTouches[0].screenX;
    handleSwipeGesture();
}

/**
 * Processes swipe gestures for navigation
 */
function handleSwipeGesture() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // Swiped left - next image
            nextImage();
        } else {
            // Swiped right - previous image
            previousImage();
        }
    }
}

// =============================================================================
// Gallery Initialization
// =============================================================================

/**
 * Initializes the gallery with provided image data
 * @param {Array} images - Array of image objects with src and alt properties
 */
function trapLightboxFocus(e) {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;
    const focusables = Array.from(lightbox.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])'))
        .filter(el => !el.disabled && el.offsetParent !== null);
    if (!focusables.length) { e.preventDefault(); return; }
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (!lightbox.contains(document.activeElement)) { e.preventDefault(); first.focus(); return; }
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

/**
 * Keyboard and screen-reader support for galleries and the lightbox (2026-11-08, his go on
 * the accessibility pass). Works on both gallery systems - category pages (tiles built by
 * image-automation.js) and project pages (tiles in the HTML) - without changing their markup:
 * tiles become focusable buttons that open with Enter or Space, the lightbox is announced as a
 * dialog with a named close control, and the counter is read out as photos change.
 */
function enhanceGalleryAccessibility() {
    const tiles = document.querySelectorAll('.gallery-item[onclick^="openLightbox("]');
    const total = tiles.length;
    tiles.forEach(function (tile, i) {
        if (!tile.hasAttribute('tabindex')) tile.setAttribute('tabindex', '0');
        tile.setAttribute('role', 'button');
        const img = tile.querySelector('img');
        const alt = img && img.getAttribute('alt') ? img.getAttribute('alt').trim() : '';
        tile.setAttribute('aria-label', 'Open photo ' + (i + 1) + ' of ' + total + (alt ? ': ' + alt : ''));
    });

    const lightbox = document.getElementById('lightbox');
    if (lightbox && !lightbox.hasAttribute('role')) {
        lightbox.setAttribute('role', 'dialog');
        lightbox.setAttribute('aria-modal', 'true');
        lightbox.setAttribute('aria-label', 'Photo viewer');
        lightbox.setAttribute('tabindex', '-1');
        const closeCtl = lightbox.querySelector('.lightbox-close');
        if (closeCtl && closeCtl.tagName !== 'BUTTON') {
            closeCtl.setAttribute('role', 'button');
            closeCtl.setAttribute('tabindex', '0');
        }
        if (closeCtl) closeCtl.setAttribute('aria-label', 'Close photo viewer');
        const prev = lightbox.querySelector('.lightbox-prev');
        const next = lightbox.querySelector('.lightbox-next');
        if (prev) { prev.setAttribute('type', 'button'); prev.setAttribute('aria-label', 'Previous photo'); }
        if (next) { next.setAttribute('type', 'button'); next.setAttribute('aria-label', 'Next photo'); }
        const counter = document.getElementById('lightbox-counter');
        if (counter) counter.setAttribute('aria-live', 'polite');
    }

    if (!document.documentElement.hasAttribute('data-gallery-keys')) {
        document.documentElement.setAttribute('data-gallery-keys', '');
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            const t = e.target;
            if (!t || !t.matches) return;
            if (t.matches('.gallery-item[role="button"]') || t.matches('.lightbox-close[role="button"]')) {
                e.preventDefault();
                e.stopPropagation();
                t.click();
            }
        }, true);
    }
}

function initializeGallery(images) {
    if (!Array.isArray(images) || images.length === 0) {
        console.warn('Gallery initialization failed: Invalid or empty image array');
        return;
    }
    
    galleryImages = images;
    
    // Validate image objects
    galleryImages = galleryImages.filter(img => {
        if (!img.src || !img.alt) {
            console.warn('Invalid image object:', img);
            return false;
        }
        return true;
    });
    
    if (galleryImages.length === 0) {
        console.warn('No valid images found for gallery');
        return;
    }
    
    // Set up event listeners
    setupEventListeners();
    enhanceGalleryAccessibility();
    
    // Initialize lazy loading if supported
    initializeLazyLoading();
    
    console.log(`Gallery initialized with ${galleryImages.length} images`);
}

/**
 * Sets up all event listeners for the gallery
 */
function setupEventListeners() {
    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboardNavigation);
    
    // Touch events for mobile
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.addEventListener('touchstart', handleTouchStart, { passive: true });
        lightbox.addEventListener('touchend', handleTouchEnd, { passive: true });
    }
    
    // Prevent context menu on lightbox images (optional)
    document.addEventListener('contextmenu', function(e) {
        if (lightboxActive && e.target.tagName === 'IMG') {
            e.preventDefault();
        }
    });
    
    // Handle window resize for responsive lightbox
    window.addEventListener('resize', debounceResize);
}

/**
 * Debounced resize handler for gallery responsiveness
 */
const debounceResize = debounce(function() {
    if (lightboxActive) {
        // Recalculate lightbox positioning if needed
        updateLightboxImage();
    }
}, 250);

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Debounce function (if not already available from shared.js)
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

/**
 * Gets image dimensions for responsive sizing
 * @param {string} src - Image source URL
 * @returns {Promise} Promise that resolves with image dimensions
 */
function getImageDimensions(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            resolve({
                width: this.width,
                height: this.height,
                aspectRatio: this.width / this.height
            });
        };
        img.onerror = reject;
        img.src = src;
    });
}

/**
 * Generates gallery HTML for dynamic galleries (optional utility)
 * @param {Array} images - Array of image objects
 * @param {string} containerId - ID of the container element
 */
function generateGalleryHTML(images, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Gallery container not found:', containerId);
        return;
    }
    
    const galleryHTML = images.map((img, index) => `
        <div class="gallery-item" onclick="openLightbox(${index})">
            <img src="${img.src}" alt="${img.alt}" loading="lazy">
            <div class="overlay">
                <div class="overlay-text">${img.caption || 'View Image'}</div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = galleryHTML;
}

// =============================================================================
// Auto-Initialize
// =============================================================================

/**
 * Auto-initialize gallery if galleryImages array exists on the page
 */
function autoInitializeGallery() {
    // Skip if automation system is handling initialization
    if (typeof window.GalleryAutomation !== 'undefined') {
        console.log('🤖 Gallery automation detected, skipping auto-init');
        return;
    }
    
    // Check if galleryImages is defined globally (from page-specific script)
    if (typeof window.galleryImages !== 'undefined' && Array.isArray(window.galleryImages)) {
        initializeGallery(window.galleryImages);
        console.log('Gallery auto-initialized from global array');
    } else {
        console.log('No global galleryImages found for auto-initialization');
    }
}

// =============================================================================
// Public API
// =============================================================================

// Expose functions for external use
window.GalleryAPI = {
    initialize: initializeGallery,
    open: openLightbox,
    close: closeLightbox,
    next: nextImage,
    previous: previousImage,
    getCurrentIndex: () => currentImageIndex,
    getImages: () => [...galleryImages],
    generateHTML: generateGalleryHTML
};