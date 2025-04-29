export class ImageCompressor {
    constructor(options) {
        // Initialize elements
        this.inputElement = document.querySelector(options.inputElement);
        this.previewElement = document.querySelector(options.previewElement);
        this.compressionElement = document.querySelector(options.compressionElement);
        this.compressionValueElement = document.querySelector(options.compressionValueElement);
        this.outputFormatElement = document.querySelector(options.outputFormatElement);
        this.resizeElement = document.querySelector(options.resizeElement);
        this.compressButton = document.querySelector(options.compressButton);
        this.progressBar = document.querySelector(options.progressBar);
        this.progressText = document.querySelector(options.progressText);

        // Initialize state
        this.currentFile = null;
        this.originalSize = 0;
        this.compressedSize = 0;

        // Supported formats and their mime types
        this.supportedFormats = {
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            webp: 'image/webp'
        };

        // Maximum file size (20MB)
        this.maxFileSize = 20 * 1024 * 1024;

        this.bindEvents();
    }

    bindEvents() {
        // File input events
        this.inputElement?.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Drag and drop events
        const uploadArea = this.inputElement?.closest('.upload-area');
        if (uploadArea) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, this.preventDefaults, false);
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => {
                    uploadArea.classList.add('drag-over');
                });
            });

            ['dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => {
                    uploadArea.classList.remove('drag-over');
                });
            });

            uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        }

        // Compression slider event
        this.compressionElement?.addEventListener('input', () => {
            const value = this.compressionElement.value;
            if (this.compressionValueElement) {
                this.compressionValueElement.textContent = `${value}%`;
            }
            this.updatePreview();
        });

        // Output format change event
        this.outputFormatElement?.addEventListener('change', () => this.updatePreview());

        // Resize option change event
        this.resizeElement?.addEventListener('change', () => this.updatePreview());

        // Compress button event
        this.compressButton?.addEventListener('click', () => this.compressImage());
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

        // Validate file type
        if (!this.isValidImageType(file.type)) {
            this.showError('Please select a valid image file (JPG, PNG, or WebP)');
            return;
        }

        // Validate file size
        if (file.size > this.maxFileSize) {
            this.showError(`File size exceeds maximum limit of ${this.formatFileSize(this.maxFileSize)}`);
            return;
        }

        this.currentFile = file;
        this.originalSize = file.size;

        try {
            await this.createPreview(file);
            document.querySelector('.settings-section').style.display = 'block';
            document.querySelector('.preview-section').style.display = 'block';
            
            // Show original file info
            this.updateFileInfo(file);
        } catch (error) {
            console.error('Error creating preview:', error);
            this.showError('Failed to load image');
        }
    }

    isValidImageType(type) {
        return Object.values(this.supportedFormats).includes(type.toLowerCase());
    }

    updateFileInfo(file) {
        const infoContainer = document.createElement('div');
        infoContainer.className = 'mt-3 text-center';
        infoContainer.innerHTML = `
            <p class="mb-1">Original Size: ${this.formatFileSize(file.size)}</p>
            <p class="mb-1">Format: ${file.type.split('/')[1].toUpperCase()}</p>
            <p class="mb-0">Dimensions: <span class="dimensions">Loading...</span></p>
        `;
        
        const img = new Image();
        img.onload = () => {
            infoContainer.querySelector('.dimensions').textContent = `${img.width} × ${img.height}`;
        };
        img.src = URL.createObjectURL(file);
        
        this.previewElement.appendChild(infoContainer);
    }

    async createPreview(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const container = this.previewElement;
                    container.innerHTML = '';
                    
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Apply resize if selected
                    const dimensions = this.getResizeDimensions(img.width, img.height);
                    canvas.width = dimensions.width;
                    canvas.height = dimensions.height;
                    
                    // Draw image
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    // Create preview image
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

    async updatePreview() {
        if (!this.currentFile) return;
        await this.createPreview(this.currentFile);
    }

    getResizeDimensions(width, height) {
        const option = this.resizeElement?.value || 'none';
        const ratio = height / width;

        switch (option) {
            case 'small':
                return { width: 800, height: Math.round(800 * ratio) };
            case 'medium':
                return { width: 1024, height: Math.round(1024 * ratio) };
            case 'large':
                return { width: 1920, height: Math.round(1920 * ratio) };
            default:
                return { width, height };
        }
    }

    async compressImage() {
        if (!this.currentFile) {
            this.showError('Please select an image first');
            return;
        }

        try {
            this.showProgress();
            
            const settings = {
                quality: parseInt(this.compressionElement?.value || 70) / 100,
                outputFormat: this.outputFormatElement?.value || 'auto',
                resize: this.resizeElement?.value || 'none'
            };

            const compressedBlob = await this.compress(this.currentFile, settings);
            this.compressedSize = compressedBlob.size;

            // Show compression results
            const savings = this.calculateSavings(this.originalSize, this.compressedSize);
            this.showSuccess(`Compression complete! Saved ${savings}%`);

            // Download the compressed image
            this.downloadFile(compressedBlob, settings.outputFormat);
        } catch (error) {
            console.error('Compression error:', error);
            this.showError('Failed to compress image');
        } finally {
            this.hideProgress();
        }
    }

    async compress(file, settings) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Get dimensions based on resize option
                const dimensions = this.getResizeDimensions(img.width, img.height);
                canvas.width = dimensions.width;
                canvas.height = dimensions.height;

                // Draw and compress
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Determine output format
                const outputFormat = settings.outputFormat === 'auto' 
                    ? file.type 
                    : `image/${settings.outputFormat}`;

                // Convert to blob with quality setting
                canvas.toBlob(
                    (blob) => resolve(blob),
                    outputFormat,
                    settings.quality
                );
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    calculateSavings(originalSize, compressedSize) {
        const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
        return savings;
    }

    downloadFile(blob, outputFormat) {
        const extension = outputFormat === 'auto' 
            ? this.currentFile.name.split('.').pop() 
            : outputFormat;
            
        const fileName = `compressed_${this.currentFile.name.split('.')[0]}.${extension}`;
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
            this.progressText.textContent = 'Compressing image...';
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
    }

    showError(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger alert-dismissible fade show mt-3';
        alert.innerHTML = `
            <i class="fas fa-exclamation-circle me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        this.previewElement.parentElement.insertBefore(alert, this.previewElement);
        setTimeout(() => alert.remove(), 5000);
    }

    showSuccess(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-success alert-dismissible fade show mt-3';
        alert.innerHTML = `
            <i class="fas fa-check-circle me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        this.previewElement.parentElement.insertBefore(alert, this.previewElement);
        setTimeout(() => alert.remove(), 5000);
    }
} 