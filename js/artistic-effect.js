export class ArtisticEffect {
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
        this.effectTypeElement = document.querySelector(this.options.effectTypeElement);
        this.intensityElement = document.querySelector(this.options.intensityElement);
        this.intensityValueElement = document.querySelector(this.options.intensityValueElement);
        this.brushSizeElement = document.querySelector(this.options.brushSizeElement);
        this.brushSizeValueElement = document.querySelector(this.options.brushSizeValueElement);
        this.colorEnhanceElement = document.querySelector(this.options.colorEnhanceElement);
        this.colorEnhanceValueElement = document.querySelector(this.options.colorEnhanceValueElement);
        this.detailElement = document.querySelector(this.options.detailElement);
        this.detailValueElement = document.querySelector(this.options.detailValueElement);
        this.qualityElement = document.querySelector(this.options.qualityElement);
        this.qualityValueElement = document.querySelector(this.options.qualityValueElement);
        this.resetButton = document.querySelector(this.options.resetButton);
        this.applyButton = document.querySelector(this.options.applyButton);
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
        this.intensityElement?.addEventListener('input', () => {
            this.intensityValueElement.textContent = this.intensityElement.value;
            this.updatePreviewEffect();
        });

        this.brushSizeElement?.addEventListener('input', () => {
            this.brushSizeValueElement.textContent = this.brushSizeElement.value;
            this.updatePreviewEffect();
        });

        this.colorEnhanceElement?.addEventListener('input', () => {
            this.colorEnhanceValueElement.textContent = this.colorEnhanceElement.value;
            this.updatePreviewEffect();
        });

        this.detailElement?.addEventListener('input', () => {
            this.detailValueElement.textContent = this.detailElement.value;
            this.updatePreviewEffect();
        });

        this.qualityElement?.addEventListener('input', () => {
            this.qualityValueElement.textContent = this.qualityElement.value;
        });

        this.effectTypeElement?.addEventListener('change', () => {
            this.updatePreviewEffect();
        });

        // Reset button
        this.resetButton?.addEventListener('click', () => {
            this.resetSettings();
            this.updatePreviewEffect();
        });

        // Apply button
        this.applyButton?.addEventListener('click', () => this.processImages());
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
                preview.className = 'col-md-4';
                preview.innerHTML = `
                    <div class="preview-item">
                        <button class="remove-btn" onclick="this.closest('.col-md-4').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                        <div class="card">
                            <img src="${e.target.result}" class="card-img-top preview-image" alt="Preview">
                            <div class="card-body">
                                <p class="card-text text-truncate">${file.name}</p>
                            </div>
                        </div>
                    </div>
                `;
                this.previewElement.appendChild(preview);
                
                // Apply initial effect
                this.updatePreviewEffect();
            };
            reader.readAsDataURL(file);
        });
    }

    updatePreviewEffect() {
        const settings = this.getSettings();
        document.querySelectorAll('.preview-image').forEach(img => {
            this.applyPreviewEffect(img, settings);
        });
    }

    applyPreviewEffect(img, settings) {
        // Apply CSS filters for real-time preview
        const filters = [];
        
        switch (settings.effectType) {
            case 'oil-painting':
                filters.push(`saturate(${1 + settings.colorEnhance})`);
                filters.push(`contrast(${1 + settings.intensity * 0.5})`);
                break;
            case 'watercolor':
                filters.push(`blur(${settings.brushSize * 0.1}px)`);
                filters.push(`saturate(${1 + settings.colorEnhance * 0.5})`);
                break;
            case 'sketch':
                filters.push(`grayscale(${settings.intensity})`);
                filters.push(`contrast(${1 + settings.detail})`);
                break;
            case 'vintage':
                filters.push(`sepia(${settings.intensity})`);
                filters.push(`contrast(${1 + settings.detail * 0.3})`);
                break;
            case 'pop-art':
                filters.push(`saturate(${1 + settings.colorEnhance * 2})`);
                filters.push(`contrast(${1 + settings.intensity})`);
                break;
            case 'comic':
                filters.push(`contrast(${1 + settings.intensity * 2})`);
                filters.push(`saturate(${1 + settings.colorEnhance})`);
                break;
            case 'impressionist':
                filters.push(`blur(${settings.brushSize * 0.2}px)`);
                filters.push(`saturate(${1 + settings.colorEnhance * 0.7})`);
                break;
            case 'pointillism':
                filters.push(`grayscale(${settings.intensity * 0.5})`);
                filters.push(`contrast(${1 + settings.detail * 0.5})`);
                break;
        }

        img.style.filter = filters.join(' ');
    }

    resetSettings() {
        this.intensityElement.value = 50;
        this.intensityValueElement.textContent = '50';
        this.brushSizeElement.value = 5;
        this.brushSizeValueElement.textContent = '5';
        this.colorEnhanceElement.value = 50;
        this.colorEnhanceValueElement.textContent = '50';
        this.detailElement.value = 50;
        this.detailValueElement.textContent = '50';
        this.qualityElement.value = 90;
        this.qualityValueElement.textContent = '90';
    }

    async processImages() {
        try {
            document.querySelector('.progress-section').style.display = 'block';
            this.updateProgress(0);

            const totalFiles = this.files.length;
            const settings = this.getSettings();
            const processedImages = [];

            for (let i = 0; i < totalFiles; i++) {
                this.currentFileIndex = i;
                const progress = (i / totalFiles) * 100;
                this.updateProgress(progress);
                this.progressText.textContent = `Processing image ${i + 1} of ${totalFiles}...`;

                const processedImage = await this.processImage(this.files[i], settings);
                processedImages.push({
                    data: processedImage,
                    name: this.files[i].name
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
            this.showError('An error occurred while processing images.');
        }
    }

    getSettings() {
        return {
            effectType: this.effectTypeElement.value,
            intensity: parseInt(this.intensityElement.value) / 100,
            brushSize: parseInt(this.brushSizeElement.value),
            colorEnhance: parseInt(this.colorEnhanceElement.value) / 100,
            detail: parseInt(this.detailElement.value) / 100,
            quality: parseInt(this.qualityElement.value) / 100
        };
    }

    async processImage(file, settings) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const img = new Image();
                img.onload = () => {
                    try {
                        // Set canvas dimensions
                        this.canvas.width = img.width;
                        this.canvas.height = img.height;
                        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

                        // Apply artistic effect
                        switch (settings.effectType) {
                            case 'oil-painting':
                                this.applyOilPaintingEffect(img, settings);
                                break;
                            case 'watercolor':
                                this.applyWatercolorEffect(img, settings);
                                break;
                            case 'sketch':
                                this.applySketchEffect(img, settings);
                                break;
                            case 'vintage':
                                this.applyVintageEffect(img, settings);
                                break;
                            case 'pop-art':
                                this.applyPopArtEffect(img, settings);
                                break;
                            case 'comic':
                                this.applyComicEffect(img, settings);
                                break;
                            case 'impressionist':
                                this.applyImpressionistEffect(img, settings);
                                break;
                            case 'pointillism':
                                this.applyPointillismEffect(img, settings);
                                break;
                        }

                        resolve(this.canvas.toDataURL('image/jpeg', settings.quality));
                    } catch (error) {
                        reject(error);
                    }
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    applyOilPaintingEffect(img, settings) {
        // Draw original image
        this.ctx.drawImage(img, 0, 0);
        
        // Apply oil painting effect
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const pixels = imageData.data;
        const radius = Math.floor(settings.brushSize);
        const intensity = Math.floor(settings.intensity * 255);
        
        // Implement oil painting algorithm
        for (let y = 0; y < this.canvas.height; y++) {
            for (let x = 0; x < this.canvas.width; x++) {
                const index = (y * this.canvas.width + x) * 4;
                this.applyOilPaintingPixel(pixels, index, radius, intensity);
            }
        }
        
        this.ctx.putImageData(imageData, 0, 0);
        this.enhanceColors(settings.colorEnhance);
    }

    applyWatercolorEffect(img, settings) {
        // Draw original image
        this.ctx.drawImage(img, 0, 0);
        
        // Apply watercolor effect
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const pixels = imageData.data;
        
        // Implement watercolor algorithm
        this.applyWatercolorPixels(pixels, settings);
        
        this.ctx.putImageData(imageData, 0, 0);
        this.enhanceColors(settings.colorEnhance);
    }

    applySketchEffect(img, settings) {
        // Draw original image
        this.ctx.drawImage(img, 0, 0);
        
        // Convert to grayscale
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const pixels = imageData.data;
        
        // Implement sketch algorithm
        this.applySketchPixels(pixels, settings);
        
        this.ctx.putImageData(imageData, 0, 0);
    }

    applyVintageEffect(img, settings) {
        // Draw original image
        this.ctx.drawImage(img, 0, 0);
        
        // Apply vintage effect
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const pixels = imageData.data;
        
        // Implement vintage algorithm
        this.applyVintagePixels(pixels, settings);
        
        this.ctx.putImageData(imageData, 0, 0);
    }

    applyPopArtEffect(img, settings) {
        // Draw original image
        this.ctx.drawImage(img, 0, 0);
        
        // Apply pop art effect
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const pixels = imageData.data;
        
        // Implement pop art algorithm
        this.applyPopArtPixels(pixels, settings);
        
        this.ctx.putImageData(imageData, 0, 0);
        this.enhanceColors(settings.colorEnhance * 2);
    }

    applyComicEffect(img, settings) {
        // Draw original image
        this.ctx.drawImage(img, 0, 0);
        
        // Apply comic effect
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const pixels = imageData.data;
        
        // Implement comic effect algorithm
        this.applyComicPixels(pixels, settings);
        
        this.ctx.putImageData(imageData, 0, 0);
    }

    applyImpressionistEffect(img, settings) {
        // Draw original image
        this.ctx.drawImage(img, 0, 0);
        
        // Apply impressionist effect
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const pixels = imageData.data;
        
        // Implement impressionist algorithm
        this.applyImpressionistPixels(pixels, settings);
        
        this.ctx.putImageData(imageData, 0, 0);
        this.enhanceColors(settings.colorEnhance);
    }

    applyPointillismEffect(img, settings) {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw original image
        this.ctx.drawImage(img, 0, 0);
        
        // Get image data
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Clear canvas for drawing points
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply pointillism effect
        const spacing = Math.max(1, Math.floor((1 - settings.detail) * 10));
        const radius = Math.max(1, Math.floor(settings.brushSize / 2));
        
        for (let y = 0; y < this.canvas.height; y += spacing) {
            for (let x = 0; x < this.canvas.width; x += spacing) {
                const i = (y * this.canvas.width + x) * 4;
                const r = imageData.data[i];
                const g = imageData.data[i + 1];
                const b = imageData.data[i + 2];
                const a = imageData.data[i + 3];
                
                if (a > 0) {
                    this.ctx.fillStyle = `rgba(${r},${g},${b},${settings.intensity})`;
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }
    }

    enhanceColors(amount) {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const pixels = imageData.data;
        
        for (let i = 0; i < pixels.length; i += 4) {
            pixels[i] = Math.min(255, pixels[i] * (1 + amount));     // Red
            pixels[i + 1] = Math.min(255, pixels[i + 1] * (1 + amount)); // Green
            pixels[i + 2] = Math.min(255, pixels[i + 2] * (1 + amount)); // Blue
        }
        
        this.ctx.putImageData(imageData, 0, 0);
    }

    applyOilPaintingPixel(pixels, index, radius, intensity) {
        const r = pixels[index];
        const g = pixels[index + 1];
        const b = pixels[index + 2];
        
        // Apply oil painting effect to pixel
        const avgColor = (r + g + b) / 3;
        const level = Math.floor(avgColor * (intensity / 255));
        
        pixels[index] = level;
        pixels[index + 1] = level;
        pixels[index + 2] = level;
    }

    applyWatercolorPixels(pixels, settings) {
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            
            // Simplify colors
            const levels = Math.floor(5 * settings.intensity);
            pixels[i] = Math.floor(r / 255 * levels) / levels * 255;
            pixels[i + 1] = Math.floor(g / 255 * levels) / levels * 255;
            pixels[i + 2] = Math.floor(b / 255 * levels) / levels * 255;
        }
    }

    applySketchPixels(pixels, settings) {
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            
            // Convert to grayscale
            const gray = (r + g + b) / 3;
            const sketch = 255 - gray;
            
            pixels[i] = sketch;
            pixels[i + 1] = sketch;
            pixels[i + 2] = sketch;
        }
    }

    applyVintagePixels(pixels, settings) {
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            
            // Apply sepia effect
            pixels[i] = Math.min(255, (r * 0.393 + g * 0.769 + b * 0.189) * (1 + settings.intensity));
            pixels[i + 1] = Math.min(255, (r * 0.349 + g * 0.686 + b * 0.168) * (1 + settings.intensity));
            pixels[i + 2] = Math.min(255, (r * 0.272 + g * 0.534 + b * 0.131) * (1 + settings.intensity));
        }
    }

    applyPopArtPixels(pixels, settings) {
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            
            // Quantize colors
            const levels = Math.floor(4 * settings.intensity);
            pixels[i] = Math.floor(r / 255 * levels) / levels * 255;
            pixels[i + 1] = Math.floor(g / 255 * levels) / levels * 255;
            pixels[i + 2] = Math.floor(b / 255 * levels) / levels * 255;
        }
    }

    applyComicPixels(pixels, settings) {
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            
            // Apply comic effect
            const gray = (r + g + b) / 3;
            const threshold = 128 * settings.intensity;
            
            pixels[i] = gray > threshold ? 255 : 0;
            pixels[i + 1] = gray > threshold ? 255 : 0;
            pixels[i + 2] = gray > threshold ? 255 : 0;
        }
    }

    applyImpressionistPixels(pixels, settings) {
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            
            // Add random color variation
            const variation = (Math.random() - 0.5) * settings.intensity * 50;
            
            pixels[i] = Math.min(255, Math.max(0, r + variation));
            pixels[i + 1] = Math.min(255, Math.max(0, g + variation));
            pixels[i + 2] = Math.min(255, Math.max(0, b + variation));
        }
    }

    downloadResults(processedImages) {
        if (processedImages.length === 1) {
            // Single file download
            const link = document.createElement('a');
            link.href = processedImages[0].data;
            link.download = `artistic_${processedImages[0].name}`;
            link.click();
        } else {
            // Multiple files - create zip
            const zip = new JSZip();
            processedImages.forEach((image) => {
                const filename = `artistic_${image.name}`;
                zip.file(filename, image.data.split(',')[1], {base64: true});
            });

            zip.generateAsync({type: 'blob'}).then((content) => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = 'artistic_images.zip';
                link.click();
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