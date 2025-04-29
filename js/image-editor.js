export class ImageEditor {
    constructor(options) {
        this.options = options;
        this.input = document.querySelector(options.inputElement);
        this.preview = document.querySelector(options.previewElement);
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Initialize adjustment controls
        this.brightness = document.querySelector(options.brightnessElement);
        this.contrast = document.querySelector(options.contrastElement);
        this.saturation = document.querySelector(options.saturationElement);
        this.sharpness = document.querySelector(options.sharpnessElement);
        this.hue = document.querySelector(options.hueElement);
        
        // Initialize value displays
        this.brightnessValue = document.querySelector(options.brightnessValueElement);
        this.contrastValue = document.querySelector(options.contrastValueElement);
        this.saturationValue = document.querySelector(options.saturationValueElement);
        this.sharpnessValue = document.querySelector(options.sharpnessValueElement);
        this.hueValue = document.querySelector(options.hueValueElement);
        
        // Output settings
        this.quality = document.querySelector(options.qualityElement);
        this.qualityValue = document.querySelector(options.qualityValueElement);
        this.outputFormat = document.querySelector('#output-format');
        
        // Buttons
        this.applyBtn = document.querySelector(options.applyButton);
        this.resetBtn = document.querySelector(options.resetButton);
        
        // Progress elements
        this.progressBar = document.querySelector(options.progressBar);
        this.progressText = document.querySelector(options.progressText);
        
        // Store original image data
        this.originalImage = null;
        this.currentImage = null;
        
        this.bindEvents();
    }

    bindEvents() {
        // File input events
        this.input.addEventListener('change', this.handleFileSelect.bind(this));
        
        // Adjustment events
        if (this.brightness) {
            this.brightness.addEventListener('input', () => this.updatePreview());
        }
        if (this.contrast) {
            this.contrast.addEventListener('input', () => this.updatePreview());
        }
        if (this.saturation) {
            this.saturation.addEventListener('input', () => this.updatePreview());
        }
        if (this.sharpness) {
            this.sharpness.addEventListener('input', () => this.updatePreview());
        }
        if (this.hue) {
            this.hue.addEventListener('input', () => this.updatePreview());
        }
        
        // Button events
        if (this.applyBtn) {
            this.applyBtn.addEventListener('click', this.applyChanges.bind(this));
        }
        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', this.resetAdjustments.bind(this));
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

            // Show editor section
            document.querySelector('.editor-section').style.display = 'block';
            
            // Load and display image
            this.originalImage = await this.loadImage(file);
            this.currentImage = this.originalImage;
            this.preview.src = this.originalImage.src;
            
            // Enable controls
            this.enableControls();
            
            // Initial preview setup
            this.updatePreview();
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

    async updatePreview() {
        if (!this.currentImage) return;

        try {
            // Set canvas dimensions
            this.canvas.width = this.currentImage.width;
            this.canvas.height = this.currentImage.height;

            // Clear canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // Draw original image
            this.ctx.drawImage(this.currentImage, 0, 0);

            // Get image data
            let imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            
            // Apply adjustments
            imageData = this.applyBrightness(imageData);
            imageData = this.applyContrast(imageData);
            imageData = this.applySaturation(imageData);
            imageData = this.applyHue(imageData);
            if (this.sharpness.value > 0) {
                imageData = this.applySharpness(imageData);
            }

            // Put image data back
            this.ctx.putImageData(imageData, 0, 0);

            // Update preview
            this.preview.src = this.canvas.toDataURL();
        } catch (error) {
            console.error('Error updating preview:', error);
            this.showError('Error applying adjustments');
        }
    }

    applyBrightness(imageData) {
        const brightness = parseInt(this.brightness.value);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, data[i] + brightness));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + brightness));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + brightness));
        }
        
        return imageData;
    }

    applyContrast(imageData) {
        const contrast = parseInt(this.contrast.value);
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
            data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
            data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
        }
        
        return imageData;
    }

    applySaturation(imageData) {
        const saturation = parseInt(this.saturation.value);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const gray = 0.2989 * data[i] + 0.5870 * data[i + 1] + 0.1140 * data[i + 2];
            const factor = 1 + saturation / 100;
            
            data[i] = Math.min(255, Math.max(0, gray + factor * (data[i] - gray)));
            data[i + 1] = Math.min(255, Math.max(0, gray + factor * (data[i + 1] - gray)));
            data[i + 2] = Math.min(255, Math.max(0, gray + factor * (data[i + 2] - gray)));
        }
        
        return imageData;
    }

    applyHue(imageData) {
        const hue = parseInt(this.hue.value);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const [h, s, l] = this.rgbToHsl(data[i], data[i + 1], data[i + 2]);
            const newHue = (h + hue / 360) % 1;
            const [r, g, b] = this.hslToRgb(newHue, s, l);
            
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
        }
        
        return imageData;
    }

    applySharpness(imageData) {
        const sharpness = parseInt(this.sharpness.value) / 100;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const data = imageData.data;
        const tempData = new Uint8ClampedArray(data);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                
                for (let c = 0; c < 3; c++) {
                    const current = tempData[idx + c];
                    const neighbors = [
                        tempData[idx - width * 4 + c],
                        tempData[idx + width * 4 + c],
                        tempData[idx - 4 + c],
                        tempData[idx + 4 + c]
                    ];
                    
                    const diff = current - neighbors.reduce((a, b) => a + b) / 4;
                    data[idx + c] = Math.min(255, Math.max(0, current + diff * sharpness));
                }
            }
        }
        
        return imageData;
    }

    rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            
            h /= 6;
        }

        return [h, s, l];
    }

    hslToRgb(h, s, l) {
        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    async applyChanges() {
        try {
            this.showProgress();
            
            // Get final canvas data
            const format = this.outputFormat.value === 'same' ? 
                this.getInputFormat() : this.outputFormat.value;
            const quality = parseInt(this.quality.value) / 100;
            
            // Convert to blob
            const blob = await new Promise(resolve => {
                this.canvas.toBlob(resolve, `image/${format}`, quality);
            });
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `edited_image.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            this.hideProgress();
            this.showSuccess('Image saved successfully!');
        } catch (error) {
            console.error('Error saving image:', error);
            this.hideProgress();
            this.showError('Error saving image');
        }
    }

    getInputFormat() {
        const src = this.originalImage.src;
        if (src.includes('data:image/')) {
            return src.split('data:image/')[1].split(';')[0];
        }
        return 'jpeg'; // Default format
    }

    resetAdjustments() {
        // Reset all adjustment inputs
        this.brightness.value = 0;
        this.contrast.value = 0;
        this.saturation.value = 0;
        this.sharpness.value = 0;
        this.hue.value = 0;
        
        // Reset value displays
        this.brightnessValue.textContent = '0';
        this.contrastValue.textContent = '0';
        this.saturationValue.textContent = '0';
        this.sharpnessValue.textContent = '0';
        this.hueValue.textContent = '0';
        
        // Reset preview
        if (this.originalImage) {
            this.preview.src = this.originalImage.src;
        }
    }

    enableControls() {
        const controls = [
            this.brightness, this.contrast, this.saturation, 
            this.sharpness, this.hue, this.quality, 
            this.outputFormat, this.applyBtn, this.resetBtn
        ];
        
        controls.forEach(control => {
            if (control) control.disabled = false;
        });
    }

    showProgress() {
        const progressSection = document.querySelector('.progress-section');
        if (progressSection) {
            progressSection.style.display = 'block';
            this.progressBar.style.width = '100%';
        }
    }

    hideProgress() {
        const progressSection = document.querySelector('.progress-section');
        if (progressSection) {
            progressSection.style.display = 'none';
            this.progressBar.style.width = '0%';
        }
    }

    showError(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger alert-dismissible fade show mt-3';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        this.preview.parentElement.insertBefore(alert, this.preview);
        setTimeout(() => alert.remove(), 5000);
    }

    showSuccess(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-success alert-dismissible fade show mt-3';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        this.preview.parentElement.insertBefore(alert, this.preview);
        setTimeout(() => alert.remove(), 5000);
    }
} 