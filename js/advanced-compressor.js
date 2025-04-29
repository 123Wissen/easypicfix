export class AdvancedCompressor {
    constructor(options) {
        // Initialize UI elements
        this.previewElement = document.querySelector(options.previewElement);
        this.compressionLevelSelect = document.querySelector(options.compressionLevelSelect);
        this.qualitySlider = document.querySelector(options.qualitySlider);
        this.optimizationSelect = document.querySelector(options.optimizationSelect);
        this.maxWidthInput = document.querySelector(options.maxWidthInput);
        this.maxHeightInput = document.querySelector(options.maxHeightInput);
        this.resampleSelect = document.querySelector(options.resampleSelect);
        this.colorSpaceSelect = document.querySelector(options.colorSpaceSelect);
        this.customDPIInput = document.querySelector(options.customDPIInput);
        this.jpegQualityInput = document.querySelector(options.jpegQualityInput);
        this.pngCompressionInput = document.querySelector(options.pngCompressionInput);
        this.webpQualityInput = document.querySelector(options.webpQualityInput);
        this.compressButton = document.querySelector(options.compressButton);
        this.resetButton = document.querySelector(options.resetButton);
        this.progressBar = document.querySelector(options.progressBar);
        this.progressText = document.querySelector(options.progressText);

        // Initialize state
        this.currentFile = null;
        this.originalSize = 0;
        this.compressedSize = 0;

        this.bindEvents();
    }

    bindEvents() {
        // File input events
        const fileInput = document.querySelector('#file-input');
        fileInput?.addEventListener('change', (e) => this.handleFileSelect(e));

        // Drag and drop events
        const uploadArea = document.querySelector('.upload-area');
        if (uploadArea) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, this.preventDefaults, false);
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => {
                    uploadArea.classList.add('border-primary');
                });
            });

            ['dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => {
                    uploadArea.classList.remove('border-primary');
                });
            });

            uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        }

        // Compression level change event
        this.compressionLevelSelect?.addEventListener('change', () => {
            this.updateCompressionSettings();
        });

        // Button events
        this.compressButton?.addEventListener('click', () => this.compressImage());
        this.resetButton?.addEventListener('click', () => this.resetSettings());
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            this.handleFileSelect({ target: { files: [files[0]] } });
        }
    }

    async handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
            this.showError('Please select a valid image or PDF file');
            return;
        }

        this.currentFile = file;
        this.originalSize = file.size;

        try {
            await this.createPreview(file);
            document.querySelector('.compression-settings').style.display = 'block';
            document.querySelector('.image-settings').style.display = 'block';
            document.querySelector('.advanced-settings').style.display = 'block';
            document.querySelector('.preview-section').style.display = 'block';
            document.querySelector('#action-buttons').style.display = 'block';
        } catch (error) {
            console.error('Error creating preview:', error);
            this.showError('Failed to load file');
        }
    }

    async createPreview(file) {
        if (file.type === 'application/pdf') {
            // Handle PDF preview
            return this.createPDFPreview(file);
        } else {
            // Handle image preview
            return this.createImagePreview(file);
        }
    }

    async createImagePreview(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const container = this.previewElement;
                    container.innerHTML = '';
                    
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    const preview = document.createElement('img');
                    preview.src = canvas.toDataURL();
                    preview.className = 'img-fluid rounded';
                    container.appendChild(preview);
                    
                    resolve();
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async createPDFPreview(file) {
        // Implement PDF preview if needed
        const container = this.previewElement;
        container.innerHTML = '<div class="alert alert-info">PDF preview not available</div>';
        return Promise.resolve();
    }

    updateCompressionSettings() {
        const level = this.compressionLevelSelect.value;
        switch (level) {
            case 'low':
                this.qualitySlider.value = 90;
                this.jpegQualityInput.value = 90;
                this.pngCompressionInput.value = 3;
                this.webpQualityInput.value = 90;
                break;
            case 'medium':
                this.qualitySlider.value = 80;
                this.jpegQualityInput.value = 80;
                this.pngCompressionInput.value = 6;
                this.webpQualityInput.value = 80;
                break;
            case 'high':
                this.qualitySlider.value = 60;
                this.jpegQualityInput.value = 60;
                this.pngCompressionInput.value = 9;
                this.webpQualityInput.value = 60;
                break;
            case 'custom':
                // Keep current values
                break;
        }
    }

    resetSettings() {
        this.compressionLevelSelect.value = 'medium';
        this.updateCompressionSettings();
        this.maxWidthInput.value = '';
        this.maxHeightInput.value = '';
        this.resampleSelect.value = 'high';
        this.colorSpaceSelect.value = 'rgb';
        this.customDPIInput.value = '';
        this.optimizationSelect.value = 'auto';
    }

    getCompressionSettings() {
        return {
            quality: parseInt(this.qualitySlider.value) / 100,
            optimization: this.optimizationSelect.value,
            maxWidth: this.maxWidthInput.value ? parseInt(this.maxWidthInput.value) : null,
            maxHeight: this.maxHeightInput.value ? parseInt(this.maxHeightInput.value) : null,
            resample: this.resampleSelect.value,
            colorSpace: this.colorSpaceSelect.value,
            dpi: this.customDPIInput.value ? parseInt(this.customDPIInput.value) : 72,
            jpegQuality: parseInt(this.jpegQualityInput.value),
            pngCompression: parseInt(this.pngCompressionInput.value),
            webpQuality: parseInt(this.webpQualityInput.value)
        };
    }

    async compressImage() {
        if (!this.currentFile) {
            this.showError('Please select a file first');
            return;
        }

        const settings = this.getCompressionSettings();
        
        try {
            this.showProgress();
            
            const compressedBlob = await this.compress(this.currentFile, settings);
            this.compressedSize = compressedBlob.size;
            
            const savings = this.calculateSavings(this.originalSize, this.compressedSize);
            
            this.downloadFile(compressedBlob);
            
            this.hideProgress();
            this.showSuccess(`Compression complete! Reduced size by ${savings}%`);
        } catch (error) {
            console.error('Compression error:', error);
            this.hideProgress();
            this.showError('Failed to compress file');
        }
    }

    async compress(file, settings) {
        if (file.type === 'application/pdf') {
            return this.compressPDF(file, settings);
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    let width = img.width;
                    let height = img.height;

                    if (settings.maxWidth && width > settings.maxWidth) {
                        height = (settings.maxWidth / width) * height;
                        width = settings.maxWidth;
                    }

                    if (settings.maxHeight && height > settings.maxHeight) {
                        width = (settings.maxHeight / height) * width;
                        height = settings.maxHeight;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    if (settings.colorSpace === 'grayscale') {
                        ctx.filter = 'grayscale(100%)';
                    }

                    ctx.drawImage(img, 0, 0, width, height);

                    let format = file.type;
                    let quality = settings.quality;

                    switch (settings.optimization) {
                        case 'jpeg':
                            format = 'image/jpeg';
                            quality = settings.jpegQuality / 100;
                            break;
                        case 'png':
                            format = 'image/png';
                            break;
                        case 'webp':
                            format = 'image/webp';
                            quality = settings.webpQuality / 100;
                            break;
                    }

                    canvas.toBlob(
                        (blob) => resolve(blob),
                        format,
                        quality
                    );
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async compressPDF(file, settings) {
        // Implement PDF compression if needed
        return Promise.reject(new Error('PDF compression not implemented'));
    }

    calculateSavings(originalSize, compressedSize) {
        const savings = ((originalSize - compressedSize) / originalSize) * 100;
        return Math.round(savings);
    }

    downloadFile(blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `compressed-${this.currentFile.name}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    showProgress() {
        const progressSection = document.querySelector('.progress-section');
        if (progressSection) {
            progressSection.style.display = 'block';
        }
        if (this.progressBar) {
            this.progressBar.style.width = '100%';
        }
        if (this.progressText) {
            this.progressText.textContent = 'Processing...';
        }
    }

    hideProgress() {
        const progressSection = document.querySelector('.progress-section');
        if (progressSection) {
            progressSection.style.display = 'none';
        }
        if (this.progressBar) {
            this.progressBar.style.width = '0%';
        }
        if (this.progressText) {
            this.progressText.textContent = '';
        }
    }

    showError(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger alert-dismissible fade show';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.querySelector('.card-body').insertBefore(alert, document.querySelector('.upload-section'));
        setTimeout(() => alert.remove(), 5000);
    }

    showSuccess(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-success alert-dismissible fade show';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.querySelector('.card-body').insertBefore(alert, document.querySelector('.upload-section'));
        setTimeout(() => alert.remove(), 5000);
    }
} 