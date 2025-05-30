export class WatermarkRemover {
    constructor(options) {
        this.options = options;
        this.files = [];
        this.currentFileIndex = 0;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.selection = null;
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.initializeElements();
        this.initializeEventListeners();
    }

    initializeElements() {
        // Get DOM elements
        this.inputElement = document.querySelector(this.options.inputElement);
        this.previewElement = document.querySelector(this.options.previewElement);
        this.removalMethodElement = document.querySelector(this.options.removalMethodElement);
        this.intensityElement = document.querySelector(this.options.intensityElement);
        this.intensityValueElement = document.querySelector(this.options.intensityValueElement);
        this.featherElement = document.querySelector(this.options.featherElement);
        this.featherValueElement = document.querySelector(this.options.featherValueElement);
        this.qualityElement = document.querySelector(this.options.qualityElement);
        this.qualityValueElement = document.querySelector(this.options.qualityValueElement);
        this.manualSettingsElement = document.querySelector(this.options.manualSettingsElement);
        this.removeButton = document.querySelector(this.options.removeButton);
        this.progressBar = document.querySelector(this.options.progressBar);
        this.progressText = document.querySelector(this.options.progressText);

        // Initialize settings section
        document.querySelector('.settings-section').style.display = 'none';
        document.querySelector('.preview-section').style.display = 'none';
        document.querySelector('.progress-section').style.display = 'none';
    }

    initializeEventListeners() {
        // File input handling
        this.inputElement.addEventListener('change', (e) => this.handleFiles(e.target.files));
        
        // Drag and drop handling
        const dropZone = this.inputElement.closest('.upload-area');
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            this.handleFiles(e.dataTransfer.files);
        });

        // Settings controls
        this.intensityElement.addEventListener('input', () => {
            this.intensityValueElement.textContent = this.intensityElement.value;
        });

        this.featherElement.addEventListener('input', () => {
            this.featherValueElement.textContent = this.featherElement.value;
        });

        this.qualityElement.addEventListener('input', () => {
            this.qualityValueElement.textContent = this.qualityElement.value;
        });

        // Remove button
        this.removeButton.addEventListener('click', () => this.processImages());

        // Manual selection handling
        if (this.removalMethodElement.value === 'manual') {
            this.initializeManualSelection();
        }
    }

    handleFiles(fileList) {
        this.files = Array.from(fileList).filter(file => file.type.startsWith('image/'));
        
        if (this.files.length === 0) {
            this.showError('Please upload valid image files.');
            return;
        }

        // Show settings and preview sections
        document.querySelector('.settings-section').style.display = 'block';
        document.querySelector('.preview-section').style.display = 'block';

        // Generate previews
        this.generatePreviews();
    }

    generatePreviews() {
        this.previewElement.innerHTML = '';
        
        this.files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.createElement('div');
                preview.className = 'col-md-4 mb-3';
                preview.innerHTML = `
                    <div class="card">
                        <img src="${e.target.result}" class="card-img-top" alt="Preview">
                        <div class="card-body">
                            <p class="card-text text-truncate">${file.name}</p>
                        </div>
                    </div>
                `;
                this.previewElement.appendChild(preview);
            };
            reader.readAsDataURL(file);
        });
    }

    async processImages() {
        try {
            document.querySelector('.progress-section').style.display = 'block';
            this.updateProgress(0);

            const totalFiles = this.files.length;
            const settings = this.getSettings();

            for (let i = 0; i < totalFiles; i++) {
                this.currentFileIndex = i;
                const progress = (i / totalFiles) * 100;
                this.updateProgress(progress);
                this.progressText.textContent = `Processing image ${i + 1} of ${totalFiles}...`;

                await this.processImage(this.files[i], settings);
            }

            this.updateProgress(100);
            this.progressText.textContent = 'Processing complete!';
            
            // Trigger download
            this.downloadResults();

                setTimeout(() => {
                document.querySelector('.progress-section').style.display = 'none';
            }, 2000);

        } catch (error) {
            console.error('Error processing images:', error);
            this.showError('An error occurred while processing images.');
        }
    }

    getSettings() {
        return {
            method: this.removalMethodElement.value,
            intensity: parseInt(this.intensityElement.value) / 100,
            feather: parseInt(this.featherElement.value),
            quality: parseInt(this.qualityElement.value) / 100,
            selection: this.selection
        };
    }

    async processImage(file, settings) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const img = new Image();
                img.onload = async () => {
                    try {
                        // Create processing canvas
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        
                        // Draw original image
                        ctx.drawImage(img, 0, 0);

                        // Apply watermark removal based on method
                        if (settings.method === 'auto') {
                            await this.autoRemoveWatermark(ctx, settings);
                        } else {
                            await this.manualRemoveWatermark(ctx, settings);
                        }

                        // Store processed image
                        const processedImage = canvas.toDataURL('image/jpeg', settings.quality);
                        this.files[this.currentFileIndex].processed = processedImage;
                        
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    async autoRemoveWatermark(ctx, settings) {
        const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
        const pixels = imageData.data;

        // Apply intelligent watermark detection and removal
        // This is a simplified version - in practice, you'd use more sophisticated algorithms
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const a = pixels[i + 3];

            // Detect potential watermark pixels (simplified)
            if (this.isWatermarkPixel(r, g, b, a)) {
                // Apply removal based on intensity
                pixels[i + 3] *= (1 - settings.intensity);
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }

    async manualRemoveWatermark(ctx, settings) {
        if (!settings.selection) return;

        // Scale selection to image size
        const scale = ctx.canvas.width / this.canvas.width;
        const selection = {
            x: settings.selection.x * scale,
            y: settings.selection.y * scale,
            width: settings.selection.width * scale,
            height: settings.selection.height * scale
        };

        // Get selected area
        const imageData = ctx.getImageData(
            selection.x,
            selection.y,
            selection.width,
            selection.height
        );

        // Apply feathering and removal
        this.applyFeathering(imageData, settings.feather);
        this.applyRemoval(imageData, settings.intensity);

        // Put processed data back
        ctx.putImageData(imageData, selection.x, selection.y);
    }

    isWatermarkPixel(r, g, b, a) {
        // Simplified watermark detection
        // In practice, you'd use more sophisticated algorithms
        const brightness = (r + g + b) / 3;
        return brightness > 200 && a > 0;
    }

    applyFeathering(imageData, featherSize) {
        // Implement feathering effect
        // This would blur the edges of the selection
        // Simplified version - in practice, you'd use a more sophisticated algorithm
    }

    applyRemoval(imageData, intensity) {
        const pixels = imageData.data;
        for (let i = 0; i < pixels.length; i += 4) {
            pixels[i + 3] *= (1 - intensity);
        }
    }

    downloadResults() {
        this.files.forEach((file, index) => {
            if (file.processed) {
        const link = document.createElement('a');
                link.href = file.processed;
                link.download = `watermark-removed-${file.name}`;
        link.click();
            }
        });
    }

    initializeManualSelection() {
        this.previewElement.addEventListener('mousedown', (e) => this.startSelection(e));
        this.previewElement.addEventListener('mousemove', (e) => this.updateSelection(e));
        this.previewElement.addEventListener('mouseup', () => this.endSelection());
        this.previewElement.addEventListener('mouseleave', () => this.endSelection());
    }

    updateProgress(value) {
            this.progressBar.style.width = `${value}%`;
    }

    showError(message) {
        // Implement error display
        console.error(message);
        alert(message);
    }
} 