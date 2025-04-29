export class WatermarkTools {
    constructor(options) {
        this.options = options;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.image = null;
        this.watermarkImage = null;
        this.objectUrls = new Set();
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.watermarkPosition = { x: 0, y: 0 };
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        // UI Elements
        this.uploadArea = document.querySelector(this.options.uploadArea);
        this.previewArea = document.querySelector(this.options.previewArea);
        this.watermarkTypeSelect = document.querySelector(this.options.watermarkTypeSelect);
        this.textOptions = document.querySelector(this.options.textOptions);
        this.imageOptions = document.querySelector(this.options.imageOptions);
        this.watermarkText = document.querySelector(this.options.watermarkText);
        this.watermarkImageInput = document.querySelector(this.options.watermarkImageInput);
        this.fontFamilySelect = document.querySelector(this.options.fontFamilySelect);
        this.fontSizeInput = document.querySelector(this.options.fontSizeInput);
        this.textColorInput = document.querySelector(this.options.textColorInput);
        this.textOpacityInput = document.querySelector(this.options.textOpacityInput);
        this.watermarkSizeInput = document.querySelector(this.options.watermarkSizeInput);
        this.imageOpacityInput = document.querySelector(this.options.imageOpacityInput);
        this.positionSelect = document.querySelector(this.options.positionSelect);
        this.applyButton = document.querySelector(this.options.applyButton);
        this.downloadButton = document.querySelector(this.options.downloadButton);
        this.resetButton = document.querySelector(this.options.resetButton);
        this.progressBar = document.querySelector(this.options.progressBar);
        this.progressText = document.querySelector(this.options.progressText);

        // Initialize progress elements
        this.showProgress(false);
    }

    setupEventListeners() {
        this.uploadArea?.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea?.addEventListener('drop', this.handleDrop.bind(this));
        this.watermarkTypeSelect?.addEventListener('change', this.handleWatermarkTypeChange.bind(this));
        this.watermarkImageInput?.addEventListener('change', this.handleWatermarkImageUpload.bind(this));
        this.fontSizeInput?.addEventListener('input', this.handleFontSizeChange.bind(this));
        this.textOpacityInput?.addEventListener('input', this.handleTextOpacityChange.bind(this));
        this.watermarkSizeInput?.addEventListener('input', this.handleWatermarkSizeChange.bind(this));
        this.imageOpacityInput?.addEventListener('input', this.handleImageOpacityChange.bind(this));
        this.positionSelect?.addEventListener('change', this.handlePositionChange.bind(this));
        this.applyButton?.addEventListener('click', this.applyWatermark.bind(this));
        this.downloadButton?.addEventListener('click', this.downloadImage.bind(this));

        // Add input validation
        this.watermarkText?.addEventListener('input', this.validateTextInput.bind(this));
        this.fontSizeInput?.addEventListener('change', this.validateNumberInput.bind(this));
        this.textOpacityInput?.addEventListener('change', this.validateOpacityInput.bind(this));

        // Add drag and drop for watermark positioning
        this.canvas.addEventListener('mousedown', this.startDragging.bind(this));
        this.canvas.addEventListener('mousemove', this.handleDragging.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDragging.bind(this));
        this.canvas.addEventListener('mouseleave', this.stopDragging.bind(this));

        // Add reset button handler
        this.resetButton?.addEventListener('click', this.resetWatermark.bind(this));

        // Add input handlers for new features
        this.fontFamilySelect?.addEventListener('change', this.updatePreview.bind(this));
        this.textColorInput?.addEventListener('input', this.updatePreview.bind(this));
    }

    handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        this.uploadArea.classList.add('drag-over');
    }

    async handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        this.uploadArea.classList.remove('drag-over');

        const files = event.dataTransfer.files;
        if (files.length > 0) {
            await this.handleImageUpload(files[0]);
        }
    }

    async handleImageUpload(file) {
        try {
            await this.validateFile(file);
            this.showProgress(true, 'Loading image...');
            this.image = await this.loadImage(file);
            await this.updatePreview();
            this.showProgress(false);
            this.showWatermarkOptions();
        } catch (error) {
            this.showError(error.message);
            this.showProgress(false);
        }
    }

    async validateFile(file) {
        if (!file) {
            throw new Error('No file selected');
        }

        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            throw new Error('Invalid file type. Please use JPG, PNG, or WebP images.');
        }

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            throw new Error('File size exceeds 10MB limit');
        }
    }

    async loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            this.objectUrls.add(url);

            img.onload = () => resolve(img);
            img.onerror = () => {
                this.releaseObjectUrl(url);
                reject(new Error('Failed to load image'));
            };
            img.src = url;
        });
    }

    async updatePreview() {
        if (!this.image) return;

        // Calculate max dimensions for preview
        const maxWidth = 800;
        const maxHeight = 600;
        let width = this.image.width;
        let height = this.image.height;

        if (width > maxWidth) {
            height = (maxWidth * height) / width;
            width = maxWidth;
        }
        if (height > maxHeight) {
            width = (maxHeight * width) / height;
            height = maxHeight;
        }

        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.drawImage(this.image, 0, 0, width, height);

        if (this.watermarkTypeSelect.value === 'text' && this.watermarkText.value) {
            await this.applyTextWatermark();
        } else if (this.watermarkTypeSelect.value === 'image' && this.watermarkImage) {
            await this.applyImageWatermark();
        }

        this.previewArea.src = this.canvas.toDataURL();
    }

    async applyTextWatermark() {
        const text = this.watermarkText.value;
        const fontSize = parseInt(this.fontSizeInput.value);
        const fontFamily = this.fontFamilySelect.value;
        const opacity = parseInt(this.textOpacityInput.value) / 100;
        const color = this.textColorInput.value;

        let position;
        if (this.positionSelect.value === 'custom') {
            position = this.watermarkPosition;
        } else {
            position = this.calculatePosition(
                this.ctx.measureText(text).width,
                fontSize,
                this.canvas
            );
            this.watermarkPosition = position;
        }

        this.ctx.save();
        this.ctx.globalAlpha = opacity;
        this.ctx.font = `${fontSize}px ${fontFamily}`;
        this.ctx.fillStyle = color;
        this.ctx.fillText(text, position.x, position.y);
        this.ctx.restore();
    }

    async applyImageWatermark() {
        if (!this.watermarkImage) return;

        const size = parseInt(this.watermarkSizeInput.value) / 100;
        const opacity = parseInt(this.imageOpacityInput.value) / 100;
        const watermarkWidth = this.image.width * size;
        const watermarkHeight = (this.watermarkImage.height * watermarkWidth) / this.watermarkImage.width;

        let position;
        if (this.positionSelect.value === 'custom') {
            position = this.watermarkPosition;
        } else {
            position = this.calculatePosition(
                watermarkWidth,
                watermarkHeight,
                this.canvas
            );
            this.watermarkPosition = position;
        }

        this.ctx.save();
        this.ctx.globalAlpha = opacity;
        this.ctx.drawImage(
            this.watermarkImage,
            position.x,
            position.y,
            watermarkWidth,
            watermarkHeight
        );
        this.ctx.restore();
    }

    calculatePosition(width, height, canvas) {
        const padding = 20;
        const position = this.positionSelect.value;
        let x, y;

        switch (position) {
            case 'top-left':
                x = padding;
                y = padding + height;
                break;
            case 'top-right':
                x = canvas.width - width - padding;
                y = padding + height;
                break;
            case 'bottom-left':
                x = padding;
                y = canvas.height - padding;
                break;
            case 'bottom-right':
                x = canvas.width - width - padding;
                y = canvas.height - padding;
                break;
            case 'center':
                x = (canvas.width - width) / 2;
                y = (canvas.height + height) / 2;
                break;
            default:
                x = (canvas.width - width) / 2;
                y = (canvas.height + height) / 2;
        }

        return { x, y };
    }

    validateTextInput(event) {
        const maxLength = 100;
        if (event.target.value.length > maxLength) {
            event.target.value = event.target.value.slice(0, maxLength);
            this.showWarning(`Text length limited to ${maxLength} characters`);
        }
    }

    validateNumberInput(event) {
        const value = parseInt(event.target.value);
        const min = parseInt(event.target.min);
        const max = parseInt(event.target.max);

        if (isNaN(value) || value < min) {
            event.target.value = min;
        } else if (value > max) {
            event.target.value = max;
        }
    }

    validateOpacityInput(event) {
        const value = parseFloat(event.target.value);
        if (isNaN(value) || value < 0) {
            event.target.value = 0;
        } else if (value > 1) {
            event.target.value = 1;
        }
    }

    showProgress(show, text = '') {
        const progressSection = document.querySelector('.progress-section');
        if (progressSection) {
            progressSection.style.display = show ? 'block' : 'none';
        }
        if (this.progressBar) {
            this.progressBar.style.width = show ? '100%' : '0%';
        }
        if (this.progressText) {
            this.progressText.textContent = text;
        }
    }

    showError(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger alert-dismissible fade show';
        alert.innerHTML = `
            <strong>Error:</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        this.uploadArea.parentNode.insertBefore(alert, this.uploadArea);
        setTimeout(() => alert.remove(), 5000);
    }

    showWarning(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-warning alert-dismissible fade show';
        alert.innerHTML = `
            <strong>Warning:</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        this.uploadArea.parentNode.insertBefore(alert, this.uploadArea);
        setTimeout(() => alert.remove(), 3000);
    }

    releaseObjectUrl(url) {
        if (this.objectUrls.has(url)) {
            URL.revokeObjectURL(url);
            this.objectUrls.delete(url);
        }
    }

    cleanup() {
        // Clean up object URLs
        this.objectUrls.forEach(url => URL.revokeObjectURL(url));
        this.objectUrls.clear();

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.canvas.width = 0;
        this.canvas.height = 0;

        // Reset variables
        this.image = null;
        this.watermarkImage = null;
    }

    showWatermarkOptions() {
        // Show preview section
        const previewSection = document.querySelector('.preview-section');
        if (previewSection) {
            previewSection.style.display = 'block';
        }

        // Show watermark options
        const watermarkOptions = document.querySelector('.watermark-options');
        if (watermarkOptions) {
            watermarkOptions.style.display = 'block';
        }

        // Show action buttons
        const actionButtons = document.querySelector('.action-buttons');
        if (actionButtons) {
            actionButtons.style.display = 'block';
        }

        // Show text options by default and hide image options
        if (this.textOptions && this.imageOptions) {
            this.textOptions.style.display = 'block';
            this.imageOptions.style.display = 'none';
        }
    }

    startDragging(event) {
        if (this.positionSelect.value !== 'custom') return;

        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Check if click is within watermark bounds
        const watermarkBounds = this.getWatermarkBounds();
        if (x >= watermarkBounds.x && x <= watermarkBounds.x + watermarkBounds.width &&
            y >= watermarkBounds.y && y <= watermarkBounds.y + watermarkBounds.height) {
            this.isDragging = true;
            this.dragOffset.x = x - watermarkBounds.x;
            this.dragOffset.y = y - watermarkBounds.y;
        }
    }

    handleDragging(event) {
        if (!this.isDragging) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        this.watermarkPosition.x = x - this.dragOffset.x;
        this.watermarkPosition.y = y - this.dragOffset.y;

        // Keep watermark within canvas bounds
        const watermarkBounds = this.getWatermarkBounds();
        this.watermarkPosition.x = Math.max(0, Math.min(this.canvas.width - watermarkBounds.width, this.watermarkPosition.x));
        this.watermarkPosition.y = Math.max(0, Math.min(this.canvas.height - watermarkBounds.height, this.watermarkPosition.y));

        this.updatePreview();
    }

    stopDragging() {
        this.isDragging = false;
    }

    getWatermarkBounds() {
        if (this.watermarkTypeSelect.value === 'text') {
            const text = this.watermarkText.value;
            const fontSize = parseInt(this.fontSizeInput.value);
            this.ctx.font = `${fontSize}px ${this.fontFamilySelect.value}`;
            const metrics = this.ctx.measureText(text);
            return {
                x: this.watermarkPosition.x,
                y: this.watermarkPosition.y - fontSize,
                width: metrics.width,
                height: fontSize
            };
        } else if (this.watermarkImage) {
            const size = parseInt(this.watermarkSizeInput.value) / 100;
            const width = this.image.width * size;
            const height = (this.watermarkImage.height * width) / this.watermarkImage.width;
            return {
                x: this.watermarkPosition.x,
                y: this.watermarkPosition.y - height,
                width: width,
                height: height
            };
        }
        return { x: 0, y: 0, width: 0, height: 0 };
    }

    resetWatermark() {
        // Reset watermark position
        this.watermarkPosition = { x: 0, y: 0 };
        
        // Reset form inputs
        this.watermarkText.value = '';
        this.fontFamilySelect.value = 'Arial';
        this.fontSizeInput.value = '48';
        this.textColorInput.value = '#ffffff';
        this.textOpacityInput.value = '80';
        this.watermarkSizeInput.value = '30';
        this.imageOpacityInput.value = '80';
        this.positionSelect.value = 'center';
        
        // Clear watermark image if any
        this.watermarkImage = null;
        this.watermarkImageInput.value = '';
        
        // Update preview
        this.updatePreview();
    }
}