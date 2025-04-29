// Image adjustments module for basic transformations
export class ImageAdjustments {
    constructor(options) {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.image = null;
        this.originalImageData = null;
        
        // Get DOM elements
        this.inputElement = document.querySelector(options.inputElement);
        this.previewContainer = document.querySelector(options.previewElement);
        this.previewImage = this.previewContainer.querySelector('img');
        this.beforeAfterToggle = document.querySelector(options.beforeAfterToggle);
        this.resetAllButton = document.querySelector(options.resetAllButton);
        this.applyButton = document.querySelector(options.applyButton);
        this.downloadButton = document.querySelector('#download-btn');
        
        // Get slider elements
        this.brightnessSlider = document.querySelector(options.brightnessSlider);
        this.contrastSlider = document.querySelector(options.contrastSlider);
        this.saturationSlider = document.querySelector(options.saturationSlider);
        this.exposureSlider = document.querySelector(options.exposureSlider);
        this.temperatureSlider = document.querySelector(options.temperatureSlider);
        this.tintSlider = document.querySelector(options.tintSlider);
        this.sharpnessSlider = document.querySelector(options.sharpnessSlider);
        this.noiseSlider = document.querySelector(options.noiseSlider);
        
        // Get value display elements
        this.brightnessValue = document.querySelector(options.brightnessValue);
        this.contrastValue = document.querySelector(options.contrastValue);
        this.saturationValue = document.querySelector(options.saturationValue);
        this.exposureValue = document.querySelector(options.exposureValue);
        this.temperatureValue = document.querySelector(options.temperatureValue);
        this.tintValue = document.querySelector(options.tintValue);
        this.sharpnessValue = document.querySelector(options.sharpnessValue);
        this.noiseValue = document.querySelector(options.noiseValue);

        this.bindEvents();
    }

    bindEvents() {
        // Bind slider events
        const sliders = [
            { slider: this.brightnessSlider, value: this.brightnessValue },
            { slider: this.contrastSlider, value: this.contrastValue },
            { slider: this.saturationSlider, value: this.saturationValue },
            { slider: this.exposureSlider, value: this.exposureValue },
            { slider: this.temperatureSlider, value: this.temperatureValue },
            { slider: this.tintSlider, value: this.tintValue },
            { slider: this.sharpnessSlider, value: this.sharpnessValue },
            { slider: this.noiseSlider, value: this.noiseValue }
        ];

        sliders.forEach(({ slider, value }) => {
            if (slider && value) {
                slider.addEventListener('input', () => {
                    value.textContent = slider.value;
                    this.updatePreview();
                });
            }
        });

        // Bind button events
        this.resetAllButton?.addEventListener('click', () => this.resetAdjustments());
        this.applyButton?.addEventListener('click', () => this.applyAdjustments());
        this.downloadButton?.addEventListener('click', () => this.downloadImage());
        this.beforeAfterToggle?.addEventListener('click', () => this.toggleBeforeAfter());
    }

    async loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
            const img = new Image();
                
            img.onload = () => {
                this.image = img;
                this.canvas.width = img.width;
                this.canvas.height = img.height;
                this.ctx.drawImage(img, 0, 0);
                    this.originalImageData = this.ctx.getImageData(0, 0, img.width, img.height);
                    
                    // Show preview image
                    this.previewImage.src = e.target.result;
                    this.previewImage.style.display = 'block';
                    
                    resolve();
                };
                
                img.onerror = () => {
                    reject(new Error('Failed to load image'));
                };
                
                img.src = e.target.result;
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsDataURL(file);
        });
    }

    updatePreview() {
        if (!this.image) return;

        // Reset canvas and draw original image
        this.canvas.width = this.image.width;
        this.canvas.height = this.image.height;
        this.ctx.putImageData(this.originalImageData, 0, 0);

        // Apply adjustments
        this.applyBrightness(this.brightnessSlider?.value || 0);
        this.applyContrast(this.contrastSlider?.value || 0);
        this.applySaturation(this.saturationSlider?.value || 0);
        this.applyExposure(this.exposureSlider?.value || 0);
        this.applyTemperature(this.temperatureSlider?.value || 0);
        this.applyTint(this.tintSlider?.value || 0);
        this.applySharpness(this.sharpnessSlider?.value || 0);
        this.applyNoiseReduction(this.noiseSlider?.value || 0);

        // Update preview
        this.previewImage.src = this.canvas.toDataURL();
    }

    applyBrightness(value) {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        const brightness = parseInt(value) * 2.55;

        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, data[i] + brightness));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + brightness));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + brightness));
        }

        this.ctx.putImageData(imageData, 0, 0);
    }

    applyContrast(value) {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        const factor = (259 * (value + 255)) / (255 * (259 - value));

        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
            data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
            data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
        }

        this.ctx.putImageData(imageData, 0, 0);
    }

    applySaturation(value) {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        const adjustment = parseInt(value) / 100 + 1;

        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = Math.min(255, Math.max(0, avg + (data[i] - avg) * adjustment));
            data[i + 1] = Math.min(255, Math.max(0, avg + (data[i + 1] - avg) * adjustment));
            data[i + 2] = Math.min(255, Math.max(0, avg + (data[i + 2] - avg) * adjustment));
        }

        this.ctx.putImageData(imageData, 0, 0);
    }

    applyExposure(value) {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        const adjustment = parseInt(value) / 100;

        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, data[i] * adjustment));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * adjustment));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * adjustment));
        }

        this.ctx.putImageData(imageData, 0, 0);
    }

    applyTemperature(value) {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        const adjustment = parseInt(value) / 100;

        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, data[i] + adjustment * 10));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] - adjustment * 10));
        }

        this.ctx.putImageData(imageData, 0, 0);
    }

    applyTint(value) {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        const adjustment = parseInt(value) / 100;

        for (let i = 0; i < data.length; i += 4) {
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + adjustment * 10));
        }

        this.ctx.putImageData(imageData, 0, 0);
    }

    applySharpness(value) {
        if (value === 0) return;

        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const strength = parseInt(value) / 100;

        const tempData = new Uint8ClampedArray(data);

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                for (let c = 0; c < 3; c++) {
                    const current = data[idx + c];
                    const neighbors = [
                        data[idx - width * 4 + c],  // top
                        data[idx + width * 4 + c],  // bottom
                        data[idx - 4 + c],          // left
                        data[idx + 4 + c]           // right
                    ];
                    const avg = neighbors.reduce((a, b) => a + b, 0) / 4;
                    tempData[idx + c] = Math.min(255, Math.max(0, current + (current - avg) * strength));
                }
            }
        }

        imageData.data.set(tempData);
        this.ctx.putImageData(imageData, 0, 0);
    }

    applyNoiseReduction(value) {
        // Implementation of noise reduction logic
    }

    resetAdjustments() {
        // Reset all sliders to 0
        const sliders = [
            this.brightnessSlider, this.contrastSlider, this.saturationSlider,
            this.exposureSlider, this.temperatureSlider, this.tintSlider,
            this.sharpnessSlider, this.noiseSlider
        ];

        sliders.forEach(slider => {
            if (slider) {
                slider.value = 0;
                const valueDisplay = document.querySelector(`#${slider.id}-value`);
                if (valueDisplay) valueDisplay.textContent = '0';
            }
        });

        // Reset preview to original image
        if (this.originalImageData) {
            this.ctx.putImageData(this.originalImageData, 0, 0);
            this.previewImage.src = this.canvas.toDataURL();
        }
    }

    applyAdjustments() {
        this.updatePreview();
        this.downloadButton.style.display = 'inline-block';
    }

    downloadImage() {
        const link = document.createElement('a');
        link.download = 'adjusted-image.png';
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }

    toggleBeforeAfter() {
        const isShowingOriginal = this.previewImage.src === this.canvas.toDataURL();
        if (isShowingOriginal && this.originalImageData) {
            this.previewImage.src = URL.createObjectURL(this.originalFile);
        } else {
            this.updatePreview();
        }
    }
} 