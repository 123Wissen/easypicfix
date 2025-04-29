export class ImageFramer {
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
        this.frameStyleElement = document.querySelector(this.options.frameStyleElement);
        this.frameColorElement = document.querySelector(this.options.frameColorElement);
        this.frameWidthElement = document.querySelector(this.options.frameWidthElement);
        this.widthValueElement = document.querySelector(this.options.widthValueElement);
        this.framePaddingElement = document.querySelector(this.options.framePaddingElement);
        this.paddingValueElement = document.querySelector(this.options.paddingValueElement);
        this.cornerStyleElement = document.querySelector(this.options.cornerStyleElement);
        this.outputFormatElement = document.querySelector(this.options.outputFormatElement);
        this.qualityElement = document.querySelector(this.options.qualityElement);
        this.qualityValueElement = document.querySelector(this.options.qualityValueElement);
        this.preserveMetadataElement = document.querySelector(this.options.preserveMetadataElement);
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
        this.frameWidthElement?.addEventListener('input', () => {
            this.widthValueElement.textContent = this.frameWidthElement.value;
            this.updatePreviews();
        });

        this.framePaddingElement?.addEventListener('input', () => {
            this.paddingValueElement.textContent = this.framePaddingElement.value;
            this.updatePreviews();
        });

        this.qualityElement?.addEventListener('input', () => {
            this.qualityValueElement.textContent = this.qualityElement.value;
        });

        // Frame style and color changes
        this.frameStyleElement?.addEventListener('change', () => this.updatePreviews());
        this.frameColorElement?.addEventListener('input', () => this.updatePreviews());
        this.cornerStyleElement?.addEventListener('change', () => this.updatePreviews());

        // Apply button
        this.applyButton?.addEventListener('click', () => this.processImages());
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
                preview.className = 'col-md-4';
                preview.innerHTML = `
                    <div class="preview-item">
                        <button class="remove-btn" onclick="this.closest('.col-md-4').remove()">
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
                this.showError(`Error loading preview for ${file.name}`);
            }
        }

        // Apply initial frame preview
        this.updatePreviews();
    }

    updatePreviews() {
        const settings = this.getSettings();
        const previewContainers = document.querySelectorAll('.preview-container');
        
        previewContainers.forEach(container => {
            // Reset existing styles
            container.style.border = '';
            container.style.padding = '';
            container.style.borderRadius = '';
            container.style.boxShadow = '';
            container.style.background = '';

            // Apply frame style
            switch (settings.frameStyle) {
                case 'simple':
                    container.style.border = `${settings.frameWidth}px solid ${settings.frameColor}`;
                    break;
                case 'double':
                    container.style.border = `${settings.frameWidth/2}px double ${settings.frameColor}`;
                    break;
                case 'polaroid':
                    container.style.padding = `${settings.framePadding}px`;
                    container.style.background = 'white';
                    container.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                    break;
                case 'vintage':
                    container.style.border = `${settings.frameWidth}px solid ${settings.frameColor}`;
                    container.style.padding = `${settings.framePadding}px`;
                    container.style.background = '#f4f1ea';
                    container.style.boxShadow = '2px 3px 6px rgba(0,0,0,0.3)';
                    break;
                case 'modern':
                    container.style.border = `${settings.frameWidth}px solid ${settings.frameColor}`;
                    container.style.padding = `${settings.framePadding}px`;
                    container.style.background = 'white';
                    container.style.boxShadow = `0 10px 20px rgba(0,0,0,0.2)`;
                    break;
                case 'shadow':
                    container.style.boxShadow = `0 0 ${settings.frameWidth}px ${settings.frameColor}`;
                    container.style.padding = `${settings.framePadding}px`;
                    break;
                case 'gradient':
                    container.style.border = `${settings.frameWidth}px solid ${settings.frameColor}`;
                    container.style.background = `linear-gradient(45deg, ${settings.frameColor}, transparent)`;
                    container.style.padding = `${settings.framePadding}px`;
                    break;
                case 'pattern':
                    container.style.border = `${settings.frameWidth}px solid ${settings.frameColor}`;
                    container.style.background = `repeating-linear-gradient(
                        45deg,
                        ${settings.frameColor}22,
                        ${settings.frameColor}22 10px,
                        transparent 10px,
                        transparent 20px
                    )`;
                    container.style.padding = `${settings.framePadding}px`;
                    break;
            }

            // Apply corner style
            switch (settings.cornerStyle) {
                case 'rounded':
                    container.style.borderRadius = '10px';
                    break;
                case 'circle':
                    container.style.borderRadius = '50%';
                    break;
                default:
                    container.style.borderRadius = '0';
            }
        });
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
            frameStyle: this.frameStyleElement.value,
            frameColor: this.frameColorElement.value,
            frameWidth: parseInt(this.frameWidthElement.value),
            framePadding: parseInt(this.framePaddingElement.value),
            cornerStyle: this.cornerStyleElement.value,
            outputFormat: this.outputFormatElement.value,
            quality: parseInt(this.qualityElement.value) / 100,
            preserveMetadata: this.preserveMetadataElement.checked
        };
    }

    async processImage(file, settings) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    // Calculate dimensions including frame
                    const totalWidth = img.width + (settings.framePadding * 2);
                    const totalHeight = img.height + (settings.framePadding * 2);

                    // Set canvas size
                    this.canvas.width = totalWidth;
                    this.canvas.height = totalHeight;

                    // Clear canvas
                    this.ctx.clearRect(0, 0, totalWidth, totalHeight);

                    // Apply frame style
                    switch (settings.frameStyle) {
                        case 'simple':
                            this.applySimpleFrame(img, settings);
                            break;
                        case 'double':
                            this.applyDoubleFrame(img, settings);
                            break;
                        case 'polaroid':
                            this.applyPolaroidFrame(img, settings);
                            break;
                        case 'vintage':
                            this.applyVintageFrame(img, settings);
                            break;
                        case 'modern':
                            this.applyModernFrame(img, settings);
                            break;
                        case 'shadow':
                            this.applyShadowFrame(img, settings);
                            break;
                        case 'gradient':
                            this.applyGradientFrame(img, settings);
                            break;
                        case 'pattern':
                            this.applyPatternFrame(img, settings);
                            break;
                    }

                    // Convert to desired format
                    const mimeType = this.getMimeType(settings.outputFormat, file.type);
                    const dataUrl = this.canvas.toDataURL(mimeType, settings.quality);
                    
                    // Convert data URL to Blob
                    fetch(dataUrl)
                        .then(res => res.blob())
                        .then(blob => {
                            if (settings.preserveMetadata) {
                                // TODO: Implement metadata preservation
                                resolve(blob);
                            } else {
                                resolve(blob);
                            }
                        })
                        .catch(reject);
                } catch (error) {
                    reject(error);
                }
            };
            img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
            img.src = URL.createObjectURL(file);
        });
    }

    applySimpleFrame(img, settings) {
        // Draw background/frame
        this.ctx.fillStyle = settings.frameColor;
        this.applyCornerStyle(0, 0, this.canvas.width, this.canvas.height, settings);
        this.ctx.fill();

        // Draw image
        this.ctx.drawImage(
            img,
            settings.frameWidth,
            settings.frameWidth,
            this.canvas.width - (settings.frameWidth * 2),
            this.canvas.height - (settings.frameWidth * 2)
        );
    }

    applyDoubleFrame(img, settings) {
        // Outer frame
        this.ctx.fillStyle = settings.frameColor;
        this.applyCornerStyle(0, 0, this.canvas.width, this.canvas.height, settings);
        this.ctx.fill();

        // Inner frame
        const innerWidth = settings.frameWidth / 3;
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(
            innerWidth,
            innerWidth,
            this.canvas.width - (innerWidth * 2),
            this.canvas.height - (innerWidth * 2)
        );

        // Draw image
        this.ctx.drawImage(
            img,
            settings.frameWidth,
            settings.frameWidth,
            this.canvas.width - (settings.frameWidth * 2),
            this.canvas.height - (settings.frameWidth * 2)
        );
    }

    applyPolaroidFrame(img, settings) {
        // White background
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw image with padding
        this.ctx.drawImage(
            img,
            settings.framePadding,
            settings.framePadding,
            this.canvas.width - (settings.framePadding * 2),
            this.canvas.height - (settings.framePadding * 2)
        );

        // Add shadow effect
        this.ctx.shadowColor = 'rgba(0,0,0,0.2)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 4;
    }

    applyVintageFrame(img, settings) {
        // Vintage background
        this.ctx.fillStyle = '#f4f1ea';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw frame
        this.ctx.strokeStyle = settings.frameColor;
        this.ctx.lineWidth = settings.frameWidth;
        this.ctx.strokeRect(
            settings.frameWidth / 2,
            settings.frameWidth / 2,
            this.canvas.width - settings.frameWidth,
            this.canvas.height - settings.frameWidth
        );

        // Draw image with padding
        this.ctx.drawImage(
            img,
            settings.framePadding + settings.frameWidth,
            settings.framePadding + settings.frameWidth,
            this.canvas.width - ((settings.framePadding + settings.frameWidth) * 2),
            this.canvas.height - ((settings.framePadding + settings.frameWidth) * 2)
        );
    }

    applyModernFrame(img, settings) {
        // White background
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw image with padding
        this.ctx.drawImage(
            img,
            settings.framePadding,
            settings.framePadding,
            this.canvas.width - (settings.framePadding * 2),
            this.canvas.height - (settings.framePadding * 2)
        );

        // Add modern shadow
        this.ctx.shadowColor = 'rgba(0,0,0,0.2)';
        this.ctx.shadowBlur = 20;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 10;
    }

    applyShadowFrame(img, settings) {
        // Draw image
        this.ctx.drawImage(
            img,
            settings.framePadding,
            settings.framePadding,
            this.canvas.width - (settings.framePadding * 2),
            this.canvas.height - (settings.framePadding * 2)
        );

        // Add shadow
        this.ctx.shadowColor = settings.frameColor;
        this.ctx.shadowBlur = settings.frameWidth;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
    }

    applyGradientFrame(img, settings) {
        // Create gradient
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, settings.frameColor);
        gradient.addColorStop(1, 'transparent');

        // Draw gradient background
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw image with padding
        this.ctx.drawImage(
            img,
            settings.framePadding,
            settings.framePadding,
            this.canvas.width - (settings.framePadding * 2),
            this.canvas.height - (settings.framePadding * 2)
        );
    }

    applyPatternFrame(img, settings) {
        // Create pattern
        const patternCanvas = document.createElement('canvas');
        const patternCtx = patternCanvas.getContext('2d');
        patternCanvas.width = 20;
        patternCanvas.height = 20;

        patternCtx.strokeStyle = settings.frameColor;
        patternCtx.lineWidth = 2;
        patternCtx.beginPath();
        patternCtx.moveTo(0, 0);
        patternCtx.lineTo(20, 20);
        patternCtx.stroke();

        const pattern = this.ctx.createPattern(patternCanvas, 'repeat');

        // Draw pattern background
        this.ctx.fillStyle = pattern;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw image with padding
        this.ctx.drawImage(
            img,
            settings.framePadding,
            settings.framePadding,
            this.canvas.width - (settings.framePadding * 2),
            this.canvas.height - (settings.framePadding * 2)
        );
    }

    applyCornerStyle(x, y, width, height, settings) {
        this.ctx.beginPath();
        switch (settings.cornerStyle) {
            case 'rounded':
                const radius = 10;
                this.ctx.moveTo(x + radius, y);
                this.ctx.arcTo(x + width, y, x + width, y + height, radius);
                this.ctx.arcTo(x + width, y + height, x, y + height, radius);
                this.ctx.arcTo(x, y + height, x, y, radius);
                this.ctx.arcTo(x, y, x + width, y, radius);
                break;
            case 'circle':
                this.ctx.arc(
                    x + width / 2,
                    y + height / 2,
                    Math.min(width, height) / 2,
                    0,
                    Math.PI * 2
                );
                break;
            default:
                this.ctx.rect(x, y, width, height);
        }
        this.ctx.closePath();
    }

    getMimeType(outputFormat, originalType) {
        if (outputFormat === 'same') {
            return originalType;
        }
        switch (outputFormat) {
            case 'jpg':
                return 'image/jpeg';
            case 'png':
                return 'image/png';
            case 'webp':
                return 'image/webp';
            default:
                return originalType;
        }
    }

    getOutputFilename(originalName, settings) {
        const extension = settings.outputFormat === 'same' 
            ? originalName.split('.').pop() 
            : settings.outputFormat;
        return originalName.replace(/\.[^/.]+$/, '') + '_framed.' + extension;
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
                link.download = 'framed_images.zip';
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