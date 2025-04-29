export class ImageFlipper {
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
        this.flipTypeElement = document.querySelector(this.options.flipTypeElement);
        this.outputFormatElement = document.querySelector(this.options.outputFormatElement);
        this.qualityElement = document.querySelector(this.options.qualityElement);
        this.qualityValueElement = document.querySelector(this.options.qualityValueElement);
        this.preserveMetadataElement = document.querySelector(this.options.preserveMetadataElement);
        this.flipButton = document.querySelector(this.options.flipButton);
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
        this.qualityElement?.addEventListener('input', () => {
            this.qualityValueElement.textContent = this.qualityElement.value;
        });

        // Preview updates
        this.flipTypeElement?.addEventListener('change', () => this.updatePreviews());

        // Flip button
        this.flipButton?.addEventListener('click', () => this.processImages());
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
                const preview = document.createElement('div');
                preview.className = 'col-md-4';
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

        // Update previews with initial flip
        this.updatePreviews();
    }

    updatePreviews() {
        const settings = this.getSettings();
        const previewImages = document.querySelectorAll('.preview-image');
        
        previewImages.forEach(img => {
            let scaleX = 1;
            let scaleY = 1;

            switch (settings.flipType) {
                case 'horizontal':
                    scaleX = -1;
                    break;
                case 'vertical':
                    scaleY = -1;
                    break;
                case 'both':
                    scaleX = -1;
                    scaleY = -1;
                    break;
            }

            img.style.transform = `scale(${scaleX}, ${scaleY})`;
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
                this.progressText.textContent = `Flipping image ${i + 1} of ${totalFiles}...`;

                const processedImage = await this.processImage(this.files[i], settings);
                processedImages.push({
                    data: processedImage,
                    name: this.getOutputFilename(this.files[i].name, settings)
                });
            }

            this.updateProgress(100);
            this.progressText.textContent = 'Flipping complete!';
            
            // Download processed images
            this.downloadResults(processedImages);

            setTimeout(() => {
                document.querySelector('.progress-section').style.display = 'none';
            }, 2000);

        } catch (error) {
            console.error('Error flipping images:', error);
            this.showError('An error occurred while flipping the images.');
        }
    }

    getSettings() {
        return {
            flipType: this.flipTypeElement.value,
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
                    // Set canvas dimensions
                    this.canvas.width = img.width;
                    this.canvas.height = img.height;

                    // Clear canvas
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

                    // Apply transformations
                    this.ctx.save();
                    this.ctx.translate(
                        settings.flipType === 'horizontal' || settings.flipType === 'both' ? this.canvas.width : 0,
                        settings.flipType === 'vertical' || settings.flipType === 'both' ? this.canvas.height : 0
                    );
                    this.ctx.scale(
                        settings.flipType === 'horizontal' || settings.flipType === 'both' ? -1 : 1,
                        settings.flipType === 'vertical' || settings.flipType === 'both' ? -1 : 1
                    );
                    this.ctx.drawImage(img, 0, 0);
                    this.ctx.restore();

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
        return originalName.replace(/\.[^/.]+$/, '') + '_flipped.' + extension;
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
                link.download = 'flipped_images.zip';
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