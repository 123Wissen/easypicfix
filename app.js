import ImageTools from './image-tools.js';
import APIHandler from './js/api-handler.js';
import AnalyticsHandler from './js/analytics-handler.js';
import ComponentLoader from './js/component-loader.js';

class ImageProcessingApp {
    constructor() {
        // Initialize core components
        this.imageTools = new ImageTools();
        this.api = new APIHandler();
        this.analytics = new AnalyticsHandler();
        this.componentLoader = new ComponentLoader();

        // Load header and footer
        this.componentLoader.loadComponents();

        // Register service worker
        this.registerServiceWorker();

        // Initialize features
        this.initializeFeatures();

        // Bind event listeners
        this.bindEvents();

        // Start analytics tracking
        this.analytics.trackBehavior();
    }

    // Service Worker Registration
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('ServiceWorker registration successful');

                // Handle updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateNotification();
                        }
                    });
                });
            } catch (error) {
                console.error('ServiceWorker registration failed:', error);
                this.api.handleError(error);
            }
        }
    }

    // Initialize Features
    initializeFeatures() {
        // Initialize lazy loading
        this.initializeLazyLoading();

        // Initialize keyboard shortcuts
        this.initializeKeyboardShortcuts();

        // Initialize tooltips
        this.initializeTooltips();

        // Initialize offline support
        this.initializeOfflineSupport();

        // Initialize accessibility features
        this.initializeAccessibility();
    }

    // Lazy Loading
    initializeLazyLoading() {
        const images = document.querySelectorAll('img[data-src]');
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    }

    // Keyboard Shortcuts
    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + U: Quick Upload
            if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
                e.preventDefault();
                document.querySelector('#file-input').click();
            }

            // Ctrl/Cmd + S: Save/Download
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                const downloadBtn = document.querySelector('.download-btn');
                if (downloadBtn) downloadBtn.click();
            }

            // Esc: Close modals/popups
            if (e.key === 'Escape') {
                const modals = document.querySelectorAll('.modal.show');
                modals.forEach(modal => {
                    const bsModal = bootstrap.Modal.getInstance(modal);
                    if (bsModal) bsModal.hide();
                });
            }
        });
    }

    // Tooltips
    initializeTooltips() {
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        [...tooltipTriggerList].map(el => new bootstrap.Tooltip(el));
    }

    // Offline Support
    initializeOfflineSupport() {
        window.addEventListener('online', () => {
            this.showNotification('You are back online!', 'success');
            this.syncPendingOperations();
        });

        window.addEventListener('offline', () => {
            this.showNotification('You are offline. Some features may be limited.', 'warning');
        });
    }

    // Accessibility
    initializeAccessibility() {
        // Add ARIA labels
        document.querySelectorAll('button:not([aria-label])').forEach(button => {
            const text = button.textContent.trim();
            if (text) button.setAttribute('aria-label', text);
        });

        // Add skip links
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.className = 'skip-link';
        skipLink.textContent = 'Skip to main content';
        document.body.insertBefore(skipLink, document.body.firstChild);

        // Improve focus styles
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });

        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });
    }

    // Bind Events
    bindEvents() {
        // Conversion Tools
        this.bindConversionTools();

        // Editing Tools
        this.bindEditingTools();

        // Batch Processing
        this.bindBatchProcessingTools();

        // Upload Area
        this.setupUploadArea();

        // Error Handling
        this.setupErrorHandling();
    }

    // Show Notifications
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
        notification.style.zIndex = '9999';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }

    // Show Update Notification
    showUpdateNotification() {
        const notification = document.createElement('div');
        notification.className = 'update-notification position-fixed bottom-0 end-0 m-3 p-3 bg-primary text-white rounded-3';
        notification.innerHTML = `
            <p class="mb-2">A new version is available!</p>
            <button class="btn btn-light btn-sm me-2" onclick="window.location.reload()">Update Now</button>
            <button class="btn btn-outline-light btn-sm" onclick="this.parentElement.remove()">Later</button>
        `;
        document.body.appendChild(notification);
    }

    // Sync Pending Operations
    async syncPendingOperations() {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            try {
                await navigator.serviceWorker.ready;
                await navigator.serviceWorker.controller.postMessage({
                    type: 'SYNC_PENDING_OPERATIONS'
                });
            } catch (error) {
                console.error('Error syncing pending operations:', error);
            }
        }
    }

    // Error Handling
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            this.api.handleError(event.error);
            this.analytics.logError(event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.api.handleError(event.reason);
            this.analytics.logError(event.reason);
        });
    }

    bindConversionTools() {
        // PDF to Image Conversion
        const pdfToImageBtn = document.querySelector('#pdf-to-image');
        if (pdfToImageBtn) {
            pdfToImageBtn.addEventListener('click', this.handlePDFToImageConversion.bind(this));
        }

        // Format Conversion Buttons
        const formatConversionBtns = document.querySelectorAll('.format-conversion');
        formatConversionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetFormat = e.target.dataset.format;
                this.handleFormatConversion(targetFormat);
            });
        });
    }

    bindEditingTools() {
        // Resize Tool
        const resizeBtn = document.querySelector('#resize-image');
        if (resizeBtn) {
            resizeBtn.addEventListener('click', this.handleImageResize.bind(this));
        }

        // Crop Tool
        const cropBtn = document.querySelector('#crop-image');
        if (cropBtn) {
            cropBtn.addEventListener('click', this.handleImageCrop.bind(this));
        }

        // Rotate Tool
        const rotateBtn = document.querySelector('#rotate-image');
        if (rotateBtn) {
            rotateBtn.addEventListener('click', this.handleImageRotation.bind(this));
        }

        // Filter Tools
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filterType = e.target.dataset.filter;
                this.handleFilterApplication(filterType);
            });
        });
    }

    bindBatchProcessingTools() {
        // Batch Conversion
        const batchConvertBtn = document.querySelector('#batch-convert');
        if (batchConvertBtn) {
            batchConvertBtn.addEventListener('click', this.handleBatchConversion.bind(this));
        }

        // Batch Resize
        const batchResizeBtn = document.querySelector('#batch-resize');
        if (batchResizeBtn) {
            batchResizeBtn.addEventListener('click', this.handleBatchResize.bind(this));
        }
    }

    setupUploadArea() {
        const uploadArea = document.querySelector('.upload-area');
        const fileInput = document.querySelector('#file-input');

        // Drag and drop events
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, this.preventDefaults, false);
        });

        uploadArea.addEventListener('drop', this.handleDrop.bind(this), false);

        // Click to upload
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        this.handleFiles(files);
    }

    handleFiles(files) {
        // Preview uploaded files
        const previewContainer = document.querySelector('.upload-preview');
        previewContainer.innerHTML = ''; // Clear previous previews

        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.classList.add('preview-image');
                    previewContainer.appendChild(img);
                };
                reader.readAsDataURL(file);
            }
        });

        // Store files for further processing
        this.uploadedFiles = files;
    }

    async handlePDFToImageConversion() {
        // PDF to Image conversion (Note: Full PDF conversion requires additional libraries)
        console.log('PDF to Image conversion');
        // Placeholder for PDF conversion logic
    }

    async handleFormatConversion(targetFormat) {
        if (!this.uploadedFiles) {
            this.showNotification('Please upload an image first', 'warning');
            return;
        }

        try {
            const convertedFiles = await Promise.all(
                Array.from(this.uploadedFiles).map(file => 
                    this.imageTools.convertFormat(file, targetFormat)
                )
            );

            this.downloadFiles(convertedFiles, `converted_${targetFormat}`);
            this.showNotification(`Converted to ${targetFormat.toUpperCase()}`, 'success');
        } catch (error) {
            this.showNotification('Conversion failed', 'danger');
            console.error(error);
        }
    }

    async handleImageResize() {
        const widthInput = document.querySelector('#resize-width');
        const heightInput = document.querySelector('#resize-height');
        const width = parseInt(widthInput.value);
        const height = parseInt(heightInput.value);

        if (!this.uploadedFiles) {
            this.showNotification('Please upload an image first', 'warning');
            return;
        }

        try {
            const resizedFiles = await Promise.all(
                Array.from(this.uploadedFiles).map(file => 
                    this.imageTools.resize(file, width, height)
                )
            );

            this.downloadFiles(resizedFiles, 'resized');
            this.showNotification('Images resized successfully', 'success');
        } catch (error) {
            this.showNotification('Resize failed', 'danger');
            console.error(error);
        }
    }

    async handleImageCrop() {
        const xInput = document.querySelector('#crop-x');
        const yInput = document.querySelector('#crop-y');
        const widthInput = document.querySelector('#crop-width');
        const heightInput = document.querySelector('#crop-height');

        const x = parseInt(xInput.value);
        const y = parseInt(yInput.value);
        const width = parseInt(widthInput.value);
        const height = parseInt(heightInput.value);

        if (!this.uploadedFiles) {
            this.showNotification('Please upload an image first', 'warning');
            return;
        }

        try {
            const croppedFiles = await Promise.all(
                Array.from(this.uploadedFiles).map(file => 
                    this.imageTools.crop(file, x, y, width, height)
                )
            );

            this.downloadFiles(croppedFiles, 'cropped');
            this.showNotification('Images cropped successfully', 'success');
        } catch (error) {
            this.showNotification('Crop failed', 'danger');
            console.error(error);
        }
    }

    async handleImageRotation() {
        const degreesInput = document.querySelector('#rotate-degrees');
        const degrees = parseInt(degreesInput.value);

        if (!this.uploadedFiles) {
            this.showNotification('Please upload an image first', 'warning');
            return;
        }

        try {
            const rotatedFiles = await Promise.all(
                Array.from(this.uploadedFiles).map(file => 
                    this.imageTools.rotate(file, degrees)
                )
            );

            this.downloadFiles(rotatedFiles, 'rotated');
            this.showNotification('Images rotated successfully', 'success');
        } catch (error) {
            this.showNotification('Rotation failed', 'danger');
            console.error(error);
        }
    }

    async handleFilterApplication(filterType) {
        if (!this.uploadedFiles) {
            this.showNotification('Please upload an image first', 'warning');
            return;
        }

        try {
            const filteredFiles = await Promise.all(
                Array.from(this.uploadedFiles).map(file => 
                    this.imageTools.applyFilter(file, filterType)
                )
            );

            this.downloadFiles(filteredFiles, `${filterType}_filter`);
            this.showNotification(`Applied ${filterType} filter`, 'success');
        } catch (error) {
            this.showNotification('Filter application failed', 'danger');
            console.error(error);
        }
    }

    async handleBatchConversion() {
        const formatSelect = document.querySelector('#batch-format');
        const targetFormat = formatSelect.value;

        if (!this.uploadedFiles) {
            this.showNotification('Please upload images first', 'warning');
            return;
        }

        try {
            const convertedFiles = await this.imageTools.batchConvert(this.uploadedFiles, targetFormat);
            this.downloadFiles(convertedFiles, `batch_converted_${targetFormat}`);
            this.showNotification(`Batch converted to ${targetFormat.toUpperCase()}`, 'success');
        } catch (error) {
            this.showNotification('Batch conversion failed', 'danger');
            console.error(error);
        }
    }

    async handleBatchResize() {
        const widthInput = document.querySelector('#batch-resize-width');
        const heightInput = document.querySelector('#batch-resize-height');
        const width = parseInt(widthInput.value);
        const height = parseInt(heightInput.value);

        if (!this.uploadedFiles) {
            this.showNotification('Please upload images first', 'warning');
            return;
        }

        try {
            const resizedFiles = await this.imageTools.batchResize(this.uploadedFiles, width, height);
            this.downloadFiles(resizedFiles, 'batch_resized');
            this.showNotification('Batch resize completed', 'success');
        } catch (error) {
            this.showNotification('Batch resize failed', 'danger');
            console.error(error);
        }
    }

    downloadFiles(files, prefix) {
        files.forEach((file, index) => {
            const url = URL.createObjectURL(file);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${prefix}_${index + 1}.${file.type.split('/')[1]}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ImageProcessingApp();
});

export default ImageProcessingApp; 