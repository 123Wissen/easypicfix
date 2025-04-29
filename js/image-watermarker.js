export class ImageWatermarker {
    constructor(options) {
        this.options = options;
        this.files = [];
        this.currentFileIndex = 0;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.watermarkImage = null;
        this.initializeElements();
        this.initializeEventListeners();
    }

    initializeElements() {
        // Get DOM elements
        this.inputElement = document.querySelector(this.options.inputElement);
        this.previewElement = document.querySelector(this.options.previewElement);
        this.watermarkTypeElement = document.querySelector(this.options.watermarkTypeElement);
        this.watermarkTextElement = document.querySelector(this.options.watermarkTextElement);
        this.watermarkImageElement = document.querySelector(this.options.watermarkImageElement);
        this.fontSizeElement = document.querySelector(this.options.fontSizeElement);
        this.fontSizeValueElement = document.querySelector(this.options.fontSizeValueElement);
        this.textColorElement = document.querySelector(this.options.textColorElement);
        this.watermarkSizeElement = document.querySelector(this.options.watermarkSizeElement);
        this.sizeValueElement = document.querySelector(this.options.sizeValueElement);
        this.positionElement = document.querySelector(this.options.positionElement);
        this.opacityElement = document.querySelector(this.options.opacityElement);
        this.opacityValueElement = document.querySelector(this.options.opacityValueElement);
        this.qualityElement = document.querySelector(this.options.qualityElement);
        this.qualityValueElement = document.querySelector(this.options.qualityValueElement);
        this.watermarkButton = document.querySelector(this.options.watermarkButton);
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
        this.fontSizeElement?.addEventListener('input', () => {
            this.fontSizeValueElement.textContent = this.fontSizeElement.value;
        });

        this.watermarkSizeElement?.addEventListener('input', () => {
            this.sizeValueElement.textContent = this.watermarkSizeElement.value;
        });

        this.opacityElement?.addEventListener('input', () => {
            this.opacityValueElement.textContent = this.opacityElement.value;
        });

        this.qualityElement?.addEventListener('input', () => {
            this.qualityValueElement.textContent = this.qualityElement.value;
        });

        // Watermark image handling
        this.watermarkImageElement?.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        this.watermarkImage = img;
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });

        // Process button
        this.watermarkButton?.addEventListener('click', () => this.processImages());
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
                            <img src="${e.target.result}" class="card-img-top" alt="Preview">
                            <div class="card-body">
                                <p class="card-text text-truncate">${file.name}</p>
                            </div>
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
            type: this.watermarkTypeElement.value,
            text: this.watermarkTextElement.value,
            fontSize: parseInt(this.fontSizeElement.value),
            textColor: this.textColorElement.value,
            watermarkImage: this.watermarkImage,
            size: parseInt(this.watermarkSizeElement.value) / 100,
            position: this.positionElement.value,
            opacity: parseInt(this.opacityElement.value) / 100,
            quality: parseInt(this.qualityElement.value) / 100
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
                        this.canvas.width = img.width;
                        this.canvas.height = img.height;
                        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                        this.ctx.drawImage(img, 0, 0);

                        // Add watermark
                        if (settings.type === 'text') {
                            this.addTextWatermark(settings);
                        } else {
                            await this.addImageWatermark(settings);
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

    addTextWatermark(settings) {
        // Calculate font size based on image dimensions and user settings
        const baseFontSize = Math.min(this.canvas.width * 0.1, this.canvas.height * 0.1);
        const fontSize = baseFontSize * settings.size;
        
        // Set text properties
        this.ctx.font = `${fontSize}px Arial`;
        this.ctx.fillStyle = settings.textColor;
        this.ctx.globalAlpha = settings.opacity;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Measure text width for positioning
        const textMetrics = this.ctx.measureText(settings.text);
        const textWidth = textMetrics.width;
        const textHeight = fontSize;

        // Get position considering text dimensions
        const position = this.calculatePosition(settings.position, textWidth, textHeight);
        
        // Draw the text
        this.ctx.fillText(settings.text, position.x, position.y);
        
        // Reset opacity
        this.ctx.globalAlpha = 1;
    }

    async addImageWatermark(settings) {
        if (!settings.watermarkImage) return;

        const watermarkWidth = this.canvas.width * settings.size;
        const watermarkHeight = (watermarkWidth / settings.watermarkImage.width) * settings.watermarkImage.height;
        
        this.ctx.globalAlpha = settings.opacity;
        const position = this.calculatePosition(settings.position, watermarkWidth, watermarkHeight);
        this.ctx.drawImage(settings.watermarkImage, position.x - watermarkWidth/2, position.y - watermarkHeight/2, watermarkWidth, watermarkHeight);
        this.ctx.globalAlpha = 1;
    }

    calculatePosition(position, width, height) {
        const x = this.canvas.width / 2;
        const y = this.canvas.height / 2;

        switch (position) {
            case 'top-left':
                return { x: width/2 + 20, y: height/2 + 20 };
            case 'top-right':
                return { x: this.canvas.width - width/2 - 20, y: height/2 + 20 };
            case 'bottom-left':
                return { x: width/2 + 20, y: this.canvas.height - height/2 - 20 };
            case 'bottom-right':
                return { x: this.canvas.width - width/2 - 20, y: this.canvas.height - height/2 - 20 };
            default: // center
                return { x, y };
        }
    }

    downloadResults(processedImages) {
        if (processedImages.length === 1) {
            // Single file download
            const link = document.createElement('a');
            link.href = processedImages[0].data;
            link.download = `watermarked_${processedImages[0].name}`;
            link.click();
        } else {
            // Multiple files - create zip
            const zip = new JSZip();
            processedImages.forEach((image, index) => {
                const filename = `watermarked_${image.name}`;
                zip.file(filename, image.data.split(',')[1], {base64: true});
            });

            zip.generateAsync({type: 'blob'}).then((content) => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = 'watermarked_images.zip';
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