export class ImageAdjuster {
    constructor(options) {
        // Initialize elements
        this.input = document.querySelector(options.inputElement);
        this.preview = document.querySelector(options.previewElement);
        this.brightness = document.querySelector(options.brightnessElement);
        this.brightnessValue = document.querySelector(options.brightnessValueElement);
        this.contrast = document.querySelector(options.contrastElement);
        this.contrastValue = document.querySelector(options.contrastValueElement);
        this.saturation = document.querySelector(options.saturationElement);
        this.saturationValue = document.querySelector(options.saturationValueElement);
        this.sharpness = document.querySelector(options.sharpnessElement);
        this.sharpnessValue = document.querySelector(options.sharpnessValueElement);
        this.temperature = document.querySelector(options.temperatureElement);
        this.temperatureValue = document.querySelector(options.temperatureValueElement);
        this.tint = document.querySelector(options.tintElement);
        this.tintValue = document.querySelector(options.tintValueElement);
        this.outputFormat = document.querySelector(options.outputFormatElement);
        this.quality = document.querySelector(options.qualityElement);
        this.qualityValue = document.querySelector(options.qualityValueElement);
        this.resetBtn = document.querySelector(options.resetButton);
        this.saveBtn = document.querySelector(options.saveButton);
        this.progressBar = document.querySelector(options.progressBar);
        this.progressText = document.querySelector(options.progressText);

        // Initialize state
        this.currentFile = null;
        this.originalImage = null;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');

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
        this.input?.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Drag and drop events
        const uploadArea = this.input?.closest('.upload-area');
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

        // Adjustment events
        [
            this.brightness, this.contrast, this.saturation,
            this.sharpness, this.temperature, this.tint
        ].forEach(element => {
            element?.addEventListener('input', () => {
                this.updateAdjustmentValue(element);
                this.updatePreview();
            });
        });

        // Reset button event
        this.resetBtn?.addEventListener('click', () => this.resetAdjustments());

        // Save button event
        this.saveBtn?.addEventListener('click', () => this.saveImage());
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

        try {
            await this.loadImage(file);
            document.querySelector('.adjustment-section').style.display = 'block';
            document.querySelector('.settings-section').style.display = 'block';
            document.querySelector('.preview-section').style.display = 'block';
            
            // Show original file info
            this.updateFileInfo(file);
        } catch (error) {
            console.error('Error loading image:', error);
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
        
        const existingInfo = this.preview.parentElement.querySelector('.mt-3');
        if (existingInfo) {
            existingInfo.remove();
        }
        this.preview.parentElement.appendChild(infoContainer);
    }

    async loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    this.originalImage = img;
                    this.canvas.width = img.width;
                    this.canvas.height = img.height;
                    this.updatePreview();
                    resolve();
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    updateAdjustmentValue(element) {
        const valueElement = document.querySelector(element.id + '-value');
        if (valueElement) {
            valueElement.textContent = element.value;
        }
    }

    updatePreview() {
        if (!this.originalImage) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw original image
        this.ctx.drawImage(this.originalImage, 0, 0);

        // Apply adjustments
        this.applyAdjustments();

        // Update preview
        this.preview.src = this.canvas.toDataURL();
    }

    applyAdjustments() {
        // Get adjustment values
        const brightness = parseInt(this.brightness.value) / 100;
        const contrast = parseInt(this.contrast.value) / 100;
        const saturation = parseInt(this.saturation.value) / 100;
        const sharpness = parseInt(this.sharpness.value) / 100;
        const temperature = parseInt(this.temperature.value) / 100;
        const tint = parseInt(this.tint.value) / 100;

        // Get image data
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;

        // Apply adjustments to each pixel
        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            // Apply brightness
            r += 255 * brightness;
            g += 255 * brightness;
            b += 255 * brightness;

            // Apply contrast
            const factor = (259 * (contrast + 1)) / (255 * (1 - contrast));
            r = factor * (r - 128) + 128;
            g = factor * (g - 128) + 128;
            b = factor * (b - 128) + 128;

            // Apply saturation
            const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
            r = gray * (1 - saturation) + r * saturation;
            g = gray * (1 - saturation) + g * saturation;
            b = gray * (1 - saturation) + b * saturation;

            // Apply temperature (warm/cool)
            r += 255 * temperature;
            b -= 255 * temperature;

            // Apply tint (green/magenta)
            g += 255 * tint;

            // Clamp values
            data[i] = Math.max(0, Math.min(255, r));
            data[i + 1] = Math.max(0, Math.min(255, g));
            data[i + 2] = Math.max(0, Math.min(255, b));
        }

        // Apply sharpness if needed
        if (sharpness > 0) {
            const sharp = this.createSharpenMatrix(sharpness);
            imageData = this.applyConvolution(imageData, sharp);
        }

        // Put image data back
        this.ctx.putImageData(imageData, 0, 0);
    }

    createSharpenMatrix(amount) {
        const a = -1 * amount;
        return [
            [a, a, a],
            [a, 1 - (8 * a), a],
            [a, a, a]
        ];
    }

    applyConvolution(imageData, kernel) {
        const side = Math.round(Math.sqrt(kernel.length));
        const halfSide = Math.floor(side / 2);
        const src = imageData.data;
        const sw = imageData.width;
        const sh = imageData.height;
        const w = sw;
        const h = sh;
        const output = new ImageData(w, h);
        const dst = output.data;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const sy = y;
                const sx = x;
                const dstOff = (y * w + x) * 4;
                let r = 0, g = 0, b = 0;

                for (let cy = 0; cy < side; cy++) {
                    for (let cx = 0; cx < side; cx++) {
                        const scy = sy + cy - halfSide;
                        const scx = sx + cx - halfSide;

                        if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
                            const srcOff = (scy * sw + scx) * 4;
                            const wt = kernel[cy][cx];
                            r += src[srcOff] * wt;
                            g += src[srcOff + 1] * wt;
                            b += src[srcOff + 2] * wt;
                        }
                    }
                }

                dst[dstOff] = Math.max(0, Math.min(255, r));
                dst[dstOff + 1] = Math.max(0, Math.min(255, g));
                dst[dstOff + 2] = Math.max(0, Math.min(255, b));
                dst[dstOff + 3] = src[dstOff + 3];
            }
        }

        return output;
    }

    resetAdjustments() {
        // Reset all adjustment values
        this.brightness.value = 0;
        this.contrast.value = 0;
        this.saturation.value = 0;
        this.sharpness.value = 0;
        this.temperature.value = 0;
        this.tint.value = 0;

        // Update displayed values
        [
            this.brightness, this.contrast, this.saturation,
            this.sharpness, this.temperature, this.tint
        ].forEach(element => {
            this.updateAdjustmentValue(element);
        });

        // Update preview
        this.updatePreview();
    }

    async saveImage() {
        if (!this.originalImage) {
            this.showError('Please select an image first');
            return;
        }

        try {
            this.showProgress();
            this.saveBtn.disabled = true;

            // Get output format
            const format = this.outputFormat.value === 'same' 
                ? this.currentFile.type 
                : this.supportedFormats[this.outputFormat.value];

            // Get quality
            const quality = parseInt(this.quality.value) / 100;

            // Convert canvas to blob
            const blob = await new Promise(resolve => {
                this.canvas.toBlob(resolve, format, quality);
            });

            // Download the image
            this.downloadFile(blob);

            this.hideProgress();
            this.showSuccess('Image saved successfully!');
        } catch (error) {
            console.error('Error saving image:', error);
            this.hideProgress();
            this.showError('Failed to save image');
        } finally {
            this.saveBtn.disabled = false;
        }
    }

    downloadFile(blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Generate filename
        const originalExt = this.currentFile.name.split('.').pop();
        const newExt = this.outputFormat.value === 'same' ? originalExt : this.outputFormat.value;
        const filename = this.currentFile.name.replace(/\.[^/.]+$/, '');
        link.download = `${filename}-adjusted.${newExt}`;
        
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
            this.progressText.textContent = 'Processing image...';
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
        this.preview.parentElement.insertBefore(alert, this.preview);
        setTimeout(() => alert.remove(), 5000);
    }

    showSuccess(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-success alert-dismissible fade show mt-3';
        alert.innerHTML = `
            <i class="fas fa-check-circle me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        this.preview.parentElement.insertBefore(alert, this.preview);
        setTimeout(() => alert.remove(), 5000);
    }
} 