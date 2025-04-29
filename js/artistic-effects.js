export class ArtisticEffects {
    constructor(options) {
        // Initialize DOM elements
        this.previewElement = document.querySelector(options.previewElement);
        this.effectButtons = document.querySelectorAll(options.effectButtons);
        this.intensitySlider = document.querySelector(options.intensitySlider);
        this.intensityValue = document.querySelector(options.intensityValue);
        this.detailSlider = document.querySelector(options.detailSlider);
        this.detailValue = document.querySelector(options.detailValue);
        this.applyButton = document.querySelector(options.applyButton);
        this.downloadButton = document.querySelector(options.downloadButton);
        this.resetButton = document.querySelector(options.resetButton);
        this.progressBar = document.querySelector(options.progressBar);
        this.progressText = document.querySelector(options.progressText);

        // Initialize canvas and state
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.image = null;
        this.originalImageData = null;
        this.currentEffect = null;
        this.isProcessing = false;

        // Bind event handlers
        this.bindEvents();
    }

    bindEvents() {
        // Effect buttons
        this.effectButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.effectButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                this.currentEffect = button.dataset.effect;
                this.updatePreview();
            });
        });

        // Sliders
        this.intensitySlider?.addEventListener('input', (e) => {
            this.intensityValue.textContent = `${e.target.value}%`;
            this.updatePreview();
        });

        this.detailSlider?.addEventListener('input', (e) => {
            this.detailValue.textContent = `${e.target.value}%`;
            this.updatePreview();
        });

        // Buttons
        this.applyButton?.addEventListener('click', () => this.applyEffect());
        this.downloadButton?.addEventListener('click', () => this.downloadImage());
        this.resetButton?.addEventListener('click', () => this.resetImage());
    }

    async handleImageUpload(file) {
        try {
            // Show loading state
            this.showProgress('Loading image...', 0);
            
            // Validate file
            if (!file.type.startsWith('image/')) {
                throw new Error('Please select a valid image file.');
            }

            // Load image
            await this.loadImage(file);
            
            // Show UI elements
            document.querySelector('.effect-categories').style.display = 'block';
            document.querySelector('.preview-section').style.display = 'block';
            
            // Hide progress
            this.hideProgress();
            
        } catch (error) {
            this.hideProgress();
            this.showError(error.message);
        }
    }

    async loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.image = img;
                
                // Set canvas size while maintaining aspect ratio
                const maxWidth = 1200;
                const maxHeight = 800;
                let width = img.width;
                let height = img.height;
                
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
                
                // Draw image and store original data
                this.ctx.drawImage(img, 0, 0, width, height);
                this.originalImageData = this.ctx.getImageData(0, 0, width, height);
                
                // Update preview
                this.updatePreview();
                resolve();
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    updatePreview() {
        if (!this.image || !this.currentEffect) return;
        
        const intensity = this.intensitySlider ? parseFloat(this.intensitySlider.value) / 100 : 1;
        const detail = this.detailSlider ? parseFloat(this.detailSlider.value) / 100 : 0.5;
        
        this.applyEffectToCanvas(this.currentEffect, intensity, detail);
        this.previewElement.src = this.canvas.toDataURL();
    }

    applyEffectToCanvas(effect, intensity, detail) {
        this.ctx.putImageData(this.originalImageData, 0, 0);
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const pixels = imageData.data;

        switch (effect) {
            case 'grayscale':
                this.applyGrayscale(pixels);
                break;
            case 'sepia':
                this.applySepia(pixels, intensity);
                break;
            case 'vintage':
                this.applyVintage(pixels, intensity);
                break;
            case 'blur':
                this.applyBlur(imageData, intensity * 5);
                break;
            case 'sharpen':
                this.applySharpen(imageData, intensity);
                break;
            case 'vignette':
                this.applyVignette(imageData, intensity);
                break;
            case 'noise':
                this.applyNoise(pixels, intensity);
                break;
            case 'pixelate':
                this.applyPixelate(imageData, intensity * 20);
                break;
            case 'duotone':
                this.applyDuotone(pixels, intensity);
                break;
        }

        this.ctx.putImageData(imageData, 0, 0);
    }

    applyGrayscale(pixels) {
        for (let i = 0; i < pixels.length; i += 4) {
            const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
            pixels[i] = pixels[i + 1] = pixels[i + 2] = avg;
        }
    }

    applySepia(pixels, intensity) {
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];

            pixels[i] = Math.min(255, (r * (1 - 0.607 * intensity)) + (g * 0.769 * intensity) + (b * 0.189 * intensity));
            pixels[i + 1] = Math.min(255, (r * 0.349 * intensity) + (g * (1 - 0.314 * intensity)) + (b * 0.168 * intensity));
            pixels[i + 2] = Math.min(255, (r * 0.272 * intensity) + (g * 0.534 * intensity) + (b * (1 - 0.869 * intensity)));
        }
    }

    applyVintage(pixels, intensity) {
        for (let i = 0; i < pixels.length; i += 4) {
            pixels[i] *= (1 + 0.5 * intensity);
            pixels[i + 1] *= (1 - 0.1 * intensity);
            pixels[i + 2] *= (1 - 0.3 * intensity);
        }
    }

    applyBlur(imageData, radius) {
        const pixels = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const tempPixels = new Uint8ClampedArray(pixels);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, a = 0, count = 0;

                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const px = x + dx;
                        const py = y + dy;

                        if (px >= 0 && px < width && py >= 0 && py < height) {
                            const i = (py * width + px) * 4;
                            r += tempPixels[i];
                            g += tempPixels[i + 1];
                            b += tempPixels[i + 2];
                            a += tempPixels[i + 3];
                            count++;
                        }
                    }
                }

                const i = (y * width + x) * 4;
                pixels[i] = r / count;
                pixels[i + 1] = g / count;
                pixels[i + 2] = b / count;
                pixels[i + 3] = a / count;
            }
        }
    }

    applySharpen(imageData, intensity) {
        const pixels = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const tempPixels = new Uint8ClampedArray(pixels);
        const kernel = [
            0, -1, 0,
            -1, 5, -1,
            0, -1, 0
        ];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const i = (y * width + x) * 4;
                let r = 0, g = 0, b = 0;

                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4;
                        const kernelIdx = (ky + 1) * 3 + (kx + 1);
                        r += tempPixels[idx] * kernel[kernelIdx];
                        g += tempPixels[idx + 1] * kernel[kernelIdx];
                        b += tempPixels[idx + 2] * kernel[kernelIdx];
                    }
                }

                pixels[i] = Math.min(255, Math.max(0, r * intensity));
                pixels[i + 1] = Math.min(255, Math.max(0, g * intensity));
                pixels[i + 2] = Math.min(255, Math.max(0, b * intensity));
            }
        }
    }

    applyVignette(imageData, intensity) {
        const pixels = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.sqrt(centerX * centerX + centerY * centerY);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                const vignette = 1 - (distance / radius) * intensity;

                pixels[i] *= vignette;
                pixels[i + 1] *= vignette;
                pixels[i + 2] *= vignette;
            }
        }
    }

    applyNoise(pixels, intensity) {
        for (let i = 0; i < pixels.length; i += 4) {
            const noise = (Math.random() - 0.5) * intensity * 100;
            pixels[i] = Math.min(255, Math.max(0, pixels[i] + noise));
            pixels[i + 1] = Math.min(255, Math.max(0, pixels[i + 1] + noise));
            pixels[i + 2] = Math.min(255, Math.max(0, pixels[i + 2] + noise));
        }
    }

    applyPixelate(imageData, size) {
        const pixels = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const tempPixels = new Uint8ClampedArray(pixels);

        for (let y = 0; y < height; y += size) {
            for (let x = 0; x < width; x += size) {
                let r = 0, g = 0, b = 0, a = 0, count = 0;

                for (let dy = 0; dy < size && y + dy < height; dy++) {
                    for (let dx = 0; dx < size && x + dx < width; dx++) {
                        const i = ((y + dy) * width + (x + dx)) * 4;
                        r += tempPixels[i];
                        g += tempPixels[i + 1];
                        b += tempPixels[i + 2];
                        a += tempPixels[i + 3];
                        count++;
                    }
                }

                r = Math.round(r / count);
                g = Math.round(g / count);
                b = Math.round(b / count);
                a = Math.round(a / count);

                for (let dy = 0; dy < size && y + dy < height; dy++) {
                    for (let dx = 0; dx < size && x + dx < width; dx++) {
                        const i = ((y + dy) * width + (x + dx)) * 4;
                        pixels[i] = r;
                        pixels[i + 1] = g;
                        pixels[i + 2] = b;
                        pixels[i + 3] = a;
                    }
                }
            }
        }
    }

    applyDuotone(pixels, intensity) {
        const color1 = { r: 255, g: 87, b: 34 }; // Orange
        const color2 = { r: 63, g: 81, b: 181 }; // Indigo

        for (let i = 0; i < pixels.length; i += 4) {
            const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
            const t = avg / 255;

            pixels[i] = Math.min(255, (color1.r * (1 - t) + color2.r * t) * intensity);
            pixels[i + 1] = Math.min(255, (color1.g * (1 - t) + color2.g * t) * intensity);
            pixels[i + 2] = Math.min(255, (color1.b * (1 - t) + color2.b * t) * intensity);
        }
    }

    applyEffect() {
        this.updatePreview();
    }

    resetImage() {
        if (!this.originalImageData) return;
        this.ctx.putImageData(this.originalImageData, 0, 0);
        this.previewElement.src = this.canvas.toDataURL();
        
        // Reset UI
        this.effectButtons.forEach(btn => btn.classList.remove('active'));
        if (this.intensitySlider) this.intensitySlider.value = 100;
        if (this.detailSlider) this.detailSlider.value = 50;
        if (this.intensityValue) this.intensityValue.textContent = '100%';
        if (this.detailValue) this.detailValue.textContent = '50%';
    }

    downloadImage() {
        if (!this.canvas) return;
        
        const link = document.createElement('a');
        link.download = 'artistic-effect.png';
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }

    showProgress(text, progress) {
        if (this.progressBar && this.progressText) {
            this.progressBar.style.width = `${progress}%`;
            this.progressText.textContent = text;
            this.progressBar.parentElement.style.display = 'block';
        }
    }

    hideProgress() {
        if (this.progressBar) {
            this.progressBar.parentElement.style.display = 'none';
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
    }
} 