export class BackgroundRemover {
    constructor(options) {
        this.options = options;
        this.files = [];
        this.currentFileIndex = 0;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.initializeElements();
        this.initializeEventListeners();
    }

    initializeElements() {
        // Get DOM elements
        this.inputElement = document.querySelector(this.options.inputElement);
        this.previewElement = document.querySelector(this.options.previewElement);
        this.detectionModeElement = document.querySelector(this.options.detectionModeElement);
        this.edgeRefinementElement = document.querySelector(this.options.edgeRefinementElement);
        this.refinementValueElement = document.querySelector(this.options.refinementValueElement);
        this.outputFormatElement = document.querySelector(this.options.outputFormatElement);
        this.backgroundColorElement = document.querySelector(this.options.backgroundColorElement);
        this.customColorContainer = document.querySelector(this.options.customColorContainer);
        this.qualityElement = document.querySelector(this.options.qualityElement);
        this.qualityValueElement = document.querySelector(this.options.qualityValueElement);
        this.enhanceResultElement = document.querySelector(this.options.enhanceResultElement);
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
        this.edgeRefinementElement?.addEventListener('input', () => {
            this.refinementValueElement.textContent = this.edgeRefinementElement.value;
            this.updatePreview();
        });

        this.outputFormatElement?.addEventListener('change', () => {
            this.updatePreview();
        });

        this.backgroundColorElement?.addEventListener('input', () => {
            this.updatePreview();
        });

        this.qualityElement?.addEventListener('input', () => {
            this.qualityValueElement.textContent = this.qualityElement.value;
        });

        // Remove button
        this.removeButton?.addEventListener('click', () => this.processImages());
    }

    handleFiles(fileList) {
        this.files = Array.from(fileList).filter(file => 
            file.type.startsWith('image/') && 
            !file.type.includes('gif')
        );
        
        if (this.files.length === 0) {
            this.showError('Please upload valid image files (JPG, PNG, or WebP).');
            return;
        }

        // Show settings and preview sections
        document.querySelector('.settings-section').style.display = 'block';
        document.querySelector('.preview-section').style.display = 'block';

        // Generate previews
        this.generatePreviews();
    }

    async generatePreviews() {
        this.previewElement.innerHTML = '';
        
        for (const file of this.files) {
            try {
                const preview = document.createElement('div');
                preview.className = 'col-md-6';
                preview.innerHTML = `
                    <div class="preview-item">
                        <button class="remove-btn" onclick="this.closest('.col-md-6').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                        <div class="card">
                            <div class="preview-container">
                                <img src="${URL.createObjectURL(file)}" class="preview-image" alt="Preview">
                            </div>
                            <div class="card-body">
                                <p class="card-text text-truncate">${file.name}</p>
                            </div>
                        </div>
                    </div>
                `;
                this.previewElement.appendChild(preview);
            } catch (error) {
                console.error(`Error generating preview for ${file.name}:`, error);
                const preview = document.createElement('div');
                preview.className = 'col-md-6';
                preview.innerHTML = `
                    <div class="preview-item">
                        <div class="card">
                            <div class="card-body text-center text-danger">
                                <i class="fas fa-exclamation-circle fa-3x mb-2"></i>
                                <p class="card-text">Error loading preview for ${file.name}</p>
                            </div>
                        </div>
                    </div>
                `;
                this.previewElement.appendChild(preview);
            }
        }
    }

    async updatePreview() {
        const settings = this.getSettings();
        const previewImages = document.querySelectorAll('.preview-image');
        
        for (const img of previewImages) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            // Draw original image
            ctx.drawImage(img, 0, 0);

            // Apply background removal preview effect
            await this.applyPreviewEffect(canvas, settings);

            // Update preview
            img.src = canvas.toDataURL('image/png');
        }
    }

    async applyPreviewEffect(canvas, settings) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Simulate background removal effect for preview
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Simple background detection (this is just for preview)
            if (this.isBackgroundPixel(r, g, b)) {
                if (settings.outputFormat === 'png') {
                    data[i + 3] = 0; // Transparent
                } else {
                    const bgColor = this.getBackgroundColor(settings);
                    data[i] = bgColor.r;
                    data[i + 1] = bgColor.g;
                    data[i + 2] = bgColor.b;
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }

    async processImages() {
        try {
            document.querySelector('.progress-section').style.display = 'block';
            this.updateProgress(0);

            const settings = this.getSettings();
            const totalFiles = this.files.length;
            const processedImages = [];

            for (let i = 0; i < totalFiles; i++) {
                this.currentFileIndex = i;
                const progress = (i / totalFiles) * 100;
                this.updateProgress(progress);
                this.progressText.textContent = `Processing image ${i + 1} of ${totalFiles}...`;

                const processedImage = await this.processImage(this.files[i], settings);
                processedImages.push({
                    data: processedImage,
                    name: this.getOutputFilename(this.files[i].name, settings)
                });
            }

            this.updateProgress(100);
            this.progressText.textContent = 'Processing complete!';
            
            // Download processed images
            this.downloadResults(processedImages);

            setTimeout(() => {
                document.querySelector('.progress-section').style.display = 'none';
            }, 2000);

        } catch (error) {
            console.error('Error processing images:', error);
            this.showError('An error occurred while processing the images.');
        }
    }

    getSettings() {
        return {
            detectionMode: this.detectionModeElement.value,
            edgeRefinement: parseInt(this.edgeRefinementElement.value) / 100,
            outputFormat: this.outputFormatElement.value,
            backgroundColor: this.backgroundColorElement.value,
            quality: parseInt(this.qualityElement.value) / 100,
            enhanceResult: this.enhanceResultElement.checked
        };
    }

    async processImage(file, settings) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = async () => {
                try {
                    // Set canvas dimensions
                    this.canvas.width = img.width;
                    this.canvas.height = img.height;

                    // Draw original image
                    this.ctx.drawImage(img, 0, 0);

                    // Remove background
                    await this.removeBackground(this.canvas, settings);

                    // Get processed image data
                    const mimeType = settings.outputFormat.startsWith('jpg') ? 'image/jpeg' : 'image/png';
                    const dataUrl = this.canvas.toDataURL(mimeType, settings.quality);
                    
                    // Convert data URL to Blob
                    const response = await fetch(dataUrl);
                    const blob = await response.blob();
                    resolve(blob);
                } catch (error) {
                    reject(error);
                }
            };
            img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
            img.src = URL.createObjectURL(file);
        });
    }

    async removeBackground(canvas, settings) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Apply AI-based background removal
        await this.applyAIBackgroundRemoval(imageData, settings);

        // Refine edges if needed
        if (settings.edgeRefinement > 0) {
            this.refineEdges(imageData, settings.edgeRefinement);
        }

        // Set background color or transparency
        this.applyBackground(imageData, settings);

        // Enhance result if enabled
        if (settings.enhanceResult) {
            this.enhanceResult(imageData);
        }

        ctx.putImageData(imageData, 0, 0);
    }

    async applyAIBackgroundRemoval(imageData, settings) {
        // Implement AI-based background removal here
        // This is a placeholder for the actual AI implementation
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            if (this.isBackgroundPixel(data[i], data[i + 1], data[i + 2])) {
                data[i + 3] = 0; // Make background transparent
            }
        }
    }

    refineEdges(imageData, amount) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const radius = Math.ceil(amount * 5);

        // Apply edge refinement algorithm
        // This is a simplified version
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                if (data[i + 3] > 0 && data[i + 3] < 255) {
                    const alpha = this.calculateEdgeAlpha(data, i, width, height, radius);
                    data[i + 3] = alpha;
                }
            }
        }
    }

    calculateEdgeAlpha(data, index, width, height, radius) {
        let sum = 0;
        let count = 0;
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const x = (index / 4) % width + dx;
                const y = Math.floor((index / 4) / width) + dy;
                
                if (x >= 0 && x < width && y >= 0 && y < height) {
                    const i = (y * width + x) * 4;
                    sum += data[i + 3];
                    count++;
                }
            }
        }
        
        return Math.round(sum / count);
    }

    applyBackground(imageData, settings) {
        const data = imageData.data;
        const bgColor = this.getBackgroundColor(settings);

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) {
                if (settings.outputFormat !== 'png') {
                    data[i] = bgColor.r;
                    data[i + 1] = bgColor.g;
                    data[i + 2] = bgColor.b;
                    data[i + 3] = 255;
                }
            }
        }
    }

    enhanceResult(imageData) {
        const data = imageData.data;
        
        // Apply basic image enhancement
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) {
                // Increase contrast slightly
                data[i] = this.adjustContrast(data[i], 1.1);
                data[i + 1] = this.adjustContrast(data[i + 1], 1.1);
                data[i + 2] = this.adjustContrast(data[i + 2], 1.1);
            }
        }
    }

    adjustContrast(value, factor) {
        return Math.min(255, Math.max(0, Math.round(((value / 255 - 0.5) * factor + 0.5) * 255)));
    }

    isBackgroundPixel(r, g, b) {
        // Simple background detection
        // This should be replaced with more sophisticated AI-based detection
        const threshold = 240;
        return r > threshold && g > threshold && b > threshold;
    }

    getBackgroundColor(settings) {
        if (settings.outputFormat === 'jpg-white') {
            return { r: 255, g: 255, b: 255 };
        } else if (settings.outputFormat === 'jpg-black') {
            return { r: 0, g: 0, b: 0 };
        } else if (settings.outputFormat === 'jpg-custom') {
            const color = settings.backgroundColor;
            return {
                r: parseInt(color.slice(1, 3), 16),
                g: parseInt(color.slice(3, 5), 16),
                b: parseInt(color.slice(5, 7), 16)
            };
        }
        return { r: 0, g: 0, b: 0, a: 0 };
    }

    getOutputFilename(originalName, settings) {
        const extension = settings.outputFormat.startsWith('jpg') ? '.jpg' : '.png';
        return originalName.replace(/\.[^/.]+$/, '') + '_nobg' + extension;
    }

    downloadResults(processedImages) {
        if (processedImages.length === 1) {
            // Single file download
            const url = URL.createObjectURL(processedImages[0].data);
            const link = document.createElement('a');
            link.href = url;
            link.download = processedImages[0].name;
            link.click();
            URL.revokeObjectURL(url);
        } else {
            // Multiple files - create zip
            const zip = new JSZip();
            processedImages.forEach((image) => {
                zip.file(image.name, image.data);
            });

            zip.generateAsync({type: 'blob'}).then((content) => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = 'images_nobg.zip';
                link.click();
                URL.revokeObjectURL(link.href);
            });
        }
    }

    updateProgress(value) {
        this.progressBar.style.width = `${value}%`;
    }

    showError(message) {
        console.error(message);
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show mt-3';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        this.previewElement.parentElement.insertBefore(alertDiv, this.previewElement);
    }
} 