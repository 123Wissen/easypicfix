export class ImageRotator {
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
        this.rotationTypeElement = document.querySelector(this.options.rotationTypeElement);
        this.presetAngleElement = document.querySelector(this.options.presetAngleElement);
        this.customAngleElement = document.querySelector(this.options.customAngleElement);
        this.outputFormatElement = document.querySelector(this.options.outputFormatElement);
        this.qualityElement = document.querySelector(this.options.qualityElement);
        this.qualityValueElement = document.querySelector(this.options.qualityValueElement);
        this.maintainDimensionsElement = document.querySelector(this.options.maintainDimensionsElement);
        this.preserveMetadataElement = document.querySelector(this.options.preserveMetadataElement);
        this.rotateButton = document.querySelector(this.options.rotateButton);
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
        this.rotationTypeElement?.addEventListener('change', () => this.updatePreviews());
        this.presetAngleElement?.addEventListener('change', () => this.updatePreviews());
        this.customAngleElement?.addEventListener('input', () => this.updatePreviews());

        // Rotate button
        this.rotateButton?.addEventListener('click', () => this.processImages());
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

        // Update previews with initial rotation
        this.updatePreviews();
    }

    updatePreviews() {
        const settings = this.getSettings();
        const previewImages = document.querySelectorAll('.preview-image');
        
        previewImages.forEach(img => {
            let rotation = 0;
            let flipX = 1;
            let flipY = 1;

            if (settings.rotationType === 'preset') {
                const angle = settings.presetAngle;
                if (angle === 'horizontal') {
                    flipX = -1;
                } else if (angle === 'vertical') {
                    flipY = -1;
                } else {
                    rotation = parseInt(angle);
                }
            } else if (settings.rotationType === 'custom') {
                rotation = settings.customAngle;
            }

            img.style.transform = `rotate(${rotation}deg) scale(${flipX}, ${flipY})`;
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
                this.progressText.textContent = `Rotating image ${i + 1} of ${totalFiles}...`;

                const processedImage = await this.processImage(this.files[i], settings);
                processedImages.push({
                    data: processedImage,
                    name: this.getOutputFilename(this.files[i].name, settings)
                });
            }

            this.updateProgress(100);
            this.progressText.textContent = 'Rotation complete!';
            
            // Download processed images
            this.downloadResults(processedImages);

            setTimeout(() => {
                document.querySelector('.progress-section').style.display = 'none';
            }, 2000);

        } catch (error) {
            console.error('Error rotating images:', error);
            this.showError('An error occurred while rotating the images.');
        }
    }

    getSettings() {
        return {
            rotationType: this.rotationTypeElement.value,
            presetAngle: this.presetAngleElement.value,
            customAngle: parseInt(this.customAngleElement.value),
            outputFormat: this.outputFormatElement.value,
            quality: parseInt(this.qualityElement.value) / 100,
            maintainDimensions: this.maintainDimensionsElement.checked,
            preserveMetadata: this.preserveMetadataElement.checked
        };
    }

    async processImage(file, settings) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    let rotation = 0;
                    let flipX = 1;
                    let flipY = 1;

                    // Calculate rotation and flip values
                    if (settings.rotationType === 'preset') {
                        const angle = settings.presetAngle;
                        if (angle === 'horizontal') {
                            flipX = -1;
                        } else if (angle === 'vertical') {
                            flipY = -1;
                        } else {
                            rotation = parseInt(angle);
                        }
                    } else if (settings.rotationType === 'custom') {
                        rotation = settings.customAngle;
                    } else if (settings.rotationType === 'auto') {
                        // TODO: Implement EXIF-based auto-rotation
                        rotation = 0;
                    }

                    // Calculate dimensions
                    let width = img.width;
                    let height = img.height;
                    
                    if (!settings.maintainDimensions && (rotation === 90 || rotation === 270)) {
                        [width, height] = [height, width];
                    }

                    // Set canvas dimensions
                    this.canvas.width = width;
                    this.canvas.height = height;

                    // Clear canvas
                    this.ctx.clearRect(0, 0, width, height);

                    // Apply transformations
                    this.ctx.save();
                    this.ctx.translate(width / 2, height / 2);
                    this.ctx.rotate((rotation * Math.PI) / 180);
                    this.ctx.scale(flipX, flipY);
                    this.ctx.drawImage(img, -img.width / 2, -img.height / 2);
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
        return originalName.replace(/\.[^/.]+$/, '') + '_rotated.' + extension;
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
                link.download = 'rotated_images.zip';
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