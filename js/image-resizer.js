export class ImageResizer {
    constructor(options) {
        this.options = options;
        this.input = document.querySelector(options.inputElement);
        this.preview = document.querySelector(options.previewElement);
        this.widthInput = document.querySelector(options.widthElement);
        this.heightInput = document.querySelector(options.heightElement);
        this.maintainRatio = document.querySelector(options.maintainRatioElement);
        this.quality = document.querySelector(options.qualityElement);
        this.qualityValue = document.querySelector(options.qualityValueElement);
        this.resizeBtn = document.querySelector(options.resizeButton);
        this.progressBar = document.querySelector(options.progressBar);
        this.progressText = document.querySelector(options.progressText);
        
        // Store original image data
        this.originalImage = null;
        this.currentImage = null;
        this.aspectRatio = 1;
        
        this.bindEvents();
    }

    bindEvents() {
        // File input events
        this.input.addEventListener('change', this.handleFileSelect.bind(this));
        
        // Dimension input events
        if (this.widthInput) {
            this.widthInput.addEventListener('input', this.handleWidthChange.bind(this));
        }
        if (this.heightInput) {
            this.heightInput.addEventListener('input', this.handleHeightChange.bind(this));
        }
        if (this.maintainRatio) {
            this.maintainRatio.addEventListener('change', this.updateAspectRatio.bind(this));
        }
        
        // Quality slider event
        if (this.quality) {
            this.quality.addEventListener('input', () => {
                if (this.qualityValue) {
                    this.qualityValue.textContent = this.quality.value + '%';
                }
            });
        }
        
        // Resize button event
        if (this.resizeBtn) {
            this.resizeBtn.addEventListener('click', this.resizeImage.bind(this));
        }
        
        // Drag and drop events
        const uploadArea = this.input.closest('.upload-area');
        if (uploadArea) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, this.preventDefaults.bind(this));
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => uploadArea.classList.add('drag-active'));
            });

            ['dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('drag-active'));
            });

            uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        }
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDrop(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleFileSelect({ target: { files: [files[0]] } });
        }
    }

    async handleFileSelect(e) {
        try {
            const file = e.target.files[0];
            if (!file) return;

            // Validate file
            if (!this.validateFile(file)) {
                this.showError('Please select a valid image file (JPG, PNG, or WebP)');
                return;
            }

            // Load and display image
            this.originalImage = await this.loadImage(file);
            this.currentImage = this.originalImage;
            
            // Set initial dimensions
            this.widthInput.value = this.originalImage.width;
            this.heightInput.value = this.originalImage.height;
            this.aspectRatio = this.originalImage.width / this.originalImage.height;
            
            // Update preview
            this.updatePreview();
            
            // Show settings and preview sections
            document.querySelector('.settings-section').style.display = 'block';
            document.querySelector('.preview-section').style.display = 'block';
        } catch (error) {
            console.error('Error handling file:', error);
            this.showError('Error loading image');
        }
    }

    validateFile(file) {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        return validTypes.includes(file.type);
    }

    loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    handleWidthChange() {
        if (this.maintainRatio.checked && this.aspectRatio) {
            this.heightInput.value = Math.round(this.widthInput.value / this.aspectRatio);
        }
        this.updatePreview();
    }

    handleHeightChange() {
        if (this.maintainRatio.checked && this.aspectRatio) {
            this.widthInput.value = Math.round(this.heightInput.value * this.aspectRatio);
        }
        this.updatePreview();
    }

    updateAspectRatio() {
        if (this.maintainRatio.checked && this.widthInput.value && this.heightInput.value) {
            this.aspectRatio = this.widthInput.value / this.heightInput.value;
        }
    }

    updatePreview() {
        if (!this.currentImage) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set preview dimensions (scaled down if necessary)
        const maxPreviewSize = 800;
        let previewWidth = parseInt(this.widthInput.value);
        let previewHeight = parseInt(this.heightInput.value);
        
        if (previewWidth > maxPreviewSize || previewHeight > maxPreviewSize) {
            const ratio = Math.min(maxPreviewSize / previewWidth, maxPreviewSize / previewHeight);
            previewWidth *= ratio;
            previewHeight *= ratio;
        }
        
        canvas.width = previewWidth;
        canvas.height = previewHeight;
        
        // Use high-quality image scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw scaled image
        ctx.drawImage(this.currentImage, 0, 0, previewWidth, previewHeight);
        
        // Update preview
        this.preview.src = canvas.toDataURL();
    }

    async resizeImage() {
        try {
            this.showProgress();
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set output dimensions
            canvas.width = parseInt(this.widthInput.value);
            canvas.height = parseInt(this.heightInput.value);
            
            // Use high-quality image scaling
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Draw resized image
            ctx.drawImage(this.currentImage, 0, 0, canvas.width, canvas.height);
            
            // Get output format
            const outputFormat = document.querySelector('#output-format').value;
            const format = outputFormat === 'same' ? this.getInputFormat() : outputFormat;
            
            // Convert to blob
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, `image/${format}`, parseInt(this.quality.value) / 100);
            });
            
            // Create download link
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `resized-image.${format}`;
            link.click();
            
            this.hideProgress();
            this.showSuccess('Image resized successfully!');
        } catch (error) {
            console.error('Error resizing image:', error);
            this.hideProgress();
            this.showError('Error resizing image');
        }
    }

    getInputFormat() {
        const src = this.originalImage.src;
        if (src.includes('data:image/png')) return 'png';
        if (src.includes('data:image/webp')) return 'webp';
        return 'jpeg';
    }

    showProgress() {
        if (this.progressBar) {
            this.progressBar.style.width = '100%';
        }
        if (this.progressText) {
            this.progressText.textContent = 'Resizing image...';
        }
        if (this.resizeBtn) {
            this.resizeBtn.disabled = true;
        }
    }

    hideProgress() {
        if (this.progressBar) {
            this.progressBar.style.width = '0%';
        }
        if (this.progressText) {
            this.progressText.textContent = '';
        }
        if (this.resizeBtn) {
            this.resizeBtn.disabled = false;
        }
    }

    showError(message) {
        const alertContainer = document.createElement('div');
        alertContainer.className = 'alert alert-danger alert-dismissible fade show mt-3';
        alertContainer.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-exclamation-circle me-2"></i>
                <div class="flex-grow-1">${message}</div>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        document.querySelector('.upload-section').appendChild(alertContainer);
        setTimeout(() => alertContainer.remove(), 5000);
    }

    showSuccess(message) {
        const alertContainer = document.createElement('div');
        alertContainer.className = 'alert alert-success alert-dismissible fade show mt-3';
        alertContainer.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-check-circle me-2"></i>
                <div class="flex-grow-1">${message}</div>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        document.querySelector('.upload-section').appendChild(alertContainer);
        setTimeout(() => alertContainer.remove(), 5000);
    }
} 