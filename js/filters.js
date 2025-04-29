export class ImageFilters {
    constructor(options) {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.image = null;
        this.originalImageData = null;
        this.currentFilter = null;

        // Initialize UI elements
        this.previewElement = document.querySelector(options.previewElement);
        this.filterButtons = document.querySelectorAll(options.filterButtons);
        this.applyButton = document.querySelector(options.applyButton);
        this.downloadButton = document.querySelector(options.downloadButton);
        this.resetButton = document.querySelector(options.resetButton);
        this.progressBar = document.querySelector(options.progressBar);
        this.progressText = document.querySelector(options.progressText);
        this.intensitySlider = document.getElementById('filter-intensity');

        this.bindEvents();
    }

    bindEvents() {
        // Handle filter button clicks
        this.filterButtons?.forEach(button => {
            button.addEventListener('click', () => {
                this.filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                this.currentFilter = button.dataset.filter;
                this.applyFilter(this.currentFilter);
            });
        });

        // Handle intensity slider
        this.intensitySlider?.addEventListener('input', (e) => {
            const value = e.target.value;
            document.getElementById('intensity-value').textContent = `${value}%`;
            if (this.currentFilter) {
                this.applyFilter(this.currentFilter);
            }
        });

        // Handle action buttons
        this.applyButton?.addEventListener('click', () => this.applyChanges());
        this.downloadButton?.addEventListener('click', () => this.downloadImage());
        this.resetButton?.addEventListener('click', () => {
            this.resetImage();
            this.filterButtons.forEach(btn => btn.classList.remove('active'));
            this.currentFilter = null;
            if (this.intensitySlider) {
                this.intensitySlider.value = 100;
                document.getElementById('intensity-value').textContent = '100%';
            }
        });
    }

    async handleImageUpload(file) {
        try {
            await this.validateFile(file);
            this.showProgress(true, 'Loading image...');
            this.image = await this.loadImage(file);
            await this.updatePreview();
            this.showFilterOptions();
            this.showProgress(false);
        } catch (error) {
            this.showError(error.message);
            this.showProgress(false);
        }
    }

    validateFile(file) {
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

            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve(img);
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image'));
            };
            img.src = url;
        });
    }

    async updatePreview() {
        if (!this.image) return;

        // Set canvas dimensions
        this.canvas.width = this.image.width;
        this.canvas.height = this.image.height;

        // Draw original image
        this.ctx.drawImage(this.image, 0, 0);
        this.originalImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

        // Update preview
        this.previewElement.src = this.canvas.toDataURL();
    }

    applyFilter(filterType) {
        if (!this.image) return;

        // Get intensity value
        const intensity = document.getElementById('filter-intensity')?.value || 100;
        const intensityFactor = intensity / 100;

        // Reset to original image
        this.ctx.putImageData(this.originalImageData, 0, 0);
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;

        switch (filterType) {
            case 'grayscale':
                for (let i = 0; i < data.length; i += 4) {
                    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    const diff = avg - data[i];
                    data[i] = data[i] + (diff * intensityFactor);
                    data[i + 1] = data[i + 1] + (diff * intensityFactor);
                    data[i + 2] = data[i + 2] + (diff * intensityFactor);
                }
                break;

            case 'sepia':
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const sepiaR = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
                    const sepiaG = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
                    const sepiaB = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
                    
                    data[i] = r + ((sepiaR - r) * intensityFactor);
                    data[i + 1] = g + ((sepiaG - g) * intensityFactor);
                    data[i + 2] = b + ((sepiaB - b) * intensityFactor);
                }
                break;

            case 'invert':
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    data[i] = r + ((255 - 2 * r) * intensityFactor);
                    data[i + 1] = g + ((255 - 2 * g) * intensityFactor);
                    data[i + 2] = b + ((255 - 2 * b) * intensityFactor);
                }
                break;

            case 'blur':
                const radius = Math.ceil(5 * intensityFactor);
                const tempData = new Uint8ClampedArray(data);
                for (let y = 0; y < this.canvas.height; y++) {
                    for (let x = 0; x < this.canvas.width; x++) {
                        let r = 0, g = 0, b = 0, count = 0;
                        for (let dy = -radius; dy <= radius; dy++) {
                            for (let dx = -radius; dx <= radius; dx++) {
                                const px = x + dx;
                                const py = y + dy;
                                if (px >= 0 && px < this.canvas.width && py >= 0 && py < this.canvas.height) {
                                    const i = (py * this.canvas.width + px) * 4;
                                    r += tempData[i];
                                    g += tempData[i + 1];
                                    b += tempData[i + 2];
                                    count++;
                                }
                            }
                        }
                        const i = (y * this.canvas.width + x) * 4;
                        data[i] = r / count;
                        data[i + 1] = g / count;
                        data[i + 2] = b / count;
                    }
                }
                break;

            case 'warm':
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, data[i] + (20 * intensityFactor));  // Increase red
                    data[i + 1] = Math.min(255, data[i + 1] + (10 * intensityFactor));  // Slight increase in green
                    data[i + 2] = Math.max(0, data[i + 2] - (10 * intensityFactor));  // Decrease blue
                }
                break;

            case 'cool':
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.max(0, data[i] - (10 * intensityFactor));  // Decrease red
                    data[i + 1] = Math.min(255, data[i + 1] + (5 * intensityFactor));  // Slight increase in green
                    data[i + 2] = Math.min(255, data[i + 2] + (20 * intensityFactor));  // Increase blue
                }
                break;

            case 'vintage':
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    // Desaturate
                    const gray = (r + g + b) / 3;
                    const desaturatedR = r + ((gray - r) * 0.3 * intensityFactor);
                    const desaturatedG = g + ((gray - g) * 0.3 * intensityFactor);
                    const desaturatedB = b + ((gray - b) * 0.3 * intensityFactor);
                    
                    // Add sepia tint
                    data[i] = Math.min(255, desaturatedR + (40 * intensityFactor));
                    data[i + 1] = Math.min(255, desaturatedG + (20 * intensityFactor));
                    data[i + 2] = Math.max(0, desaturatedB - (20 * intensityFactor));
                }
                break;

            case 'dramatic':
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    // Increase contrast
                    const factor = (259 * (100 + 128 * intensityFactor)) / (255 * (100 - 128 * intensityFactor));
                    data[i] = Math.min(255, Math.max(0, factor * (r - 128) + 128));
                    data[i + 1] = Math.min(255, Math.max(0, factor * (g - 128) + 128));
                    data[i + 2] = Math.min(255, Math.max(0, factor * (b - 128) + 128));
                }
                break;
        }

        this.ctx.putImageData(imageData, 0, 0);
        this.previewElement.src = this.canvas.toDataURL();
    }

    showFilterOptions() {
        // Show filter categories
        const filterCategories = document.querySelector('.filter-categories');
        if (filterCategories) {
            filterCategories.style.display = 'block';
        }

        // Show preview section and enable buttons
        const previewSection = document.querySelector('.preview-section');
        if (previewSection) {
            previewSection.style.display = 'block';
        }

        // Show download button
        if (this.downloadButton) {
            this.downloadButton.style.display = 'inline-block';
        }
    }

    showProgress(show, text = '') {
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
            <div class="d-flex align-items-center">
                <i class="fas fa-exclamation-circle me-2"></i>
                <div class="flex-grow-1">${message}</div>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        document.querySelector('.upload-section').appendChild(alert);
        setTimeout(() => alert.remove(), 5000);
    }

    applyChanges() {
        if (!this.image) return;
        
        // Show download button when changes are applied
        if (this.downloadButton) {
            this.downloadButton.style.display = 'inline-block';
        }
        
        // Save the current state as the new base state
        this.originalImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    }

    downloadImage() {
        if (!this.canvas) return;

        const timestamp = new Date().getTime();
        const link = document.createElement('a');
        link.download = `filtered-image-${timestamp}.png`;
        link.href = this.canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    resetImage() {
        if (!this.originalImageData) return;
        
        // Reset the image to original state
        this.ctx.putImageData(this.originalImageData, 0, 0);
        this.previewElement.src = this.canvas.toDataURL();
        
        // Reset UI state
        this.currentFilter = null;
        if (this.intensitySlider) {
            this.intensitySlider.value = 100;
            document.getElementById('intensity-value').textContent = '100%';
        }
        
        // Update preview
        this.previewElement.src = this.canvas.toDataURL();
    }
}
 