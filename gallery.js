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
let touchStartX = 0;
let touchEndX = 0;

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
        lightbox.classList.add('active');
        lightboxActive = true;
        document.body.style.overflow = 'hidden';
        
        // Focus management for accessibility
        lightbox.focus();
        
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
        
        // Return focus to the gallery item that was clicked
        const galleryItem = document.querySelector(`[onclick="openLightbox(${currentImageIndex})"]`);
        if (galleryItem) {
            galleryItem.focus();
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
    
    // Fade out current image
    lightboxImg.style.opacity = '0.5';
    
    // Load new image
    const img = new Image();
    img.onload = function() {
        lightboxImg.src = currentImage.src;
        lightboxImg.alt = currentImage.alt;
        lightboxImg.style.opacity = '1';
    };
    img.onerror = function() {
        console.error('Failed to load image:', currentImage.src);
        lightboxImg.style.opacity = '1';
    };
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
        const img = new Image();
        img.src = galleryImages[index].src;
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
    
    switch(e.key) {
        case 'Escape':
            e.preventDefault();
            closeLightbox();
            break;
        case 'ArrowRight':
        case ' ': // Spacebar
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
    // Check if galleryImages is defined globally (from page-specific script)
    if (typeof window.galleryImages !== 'undefined' && Array.isArray(window.galleryImages)) {
        initializeGallery(window.galleryImages);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInitializeGallery);
} else {
    autoInitializeGallery();
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