export class ImageConverter {
    constructor(options) {
        this.options = options;
        this.input = document.querySelector(options.inputElement);
        this.preview = document.querySelector(options.previewElement);
        this.quality = document.querySelector(options.qualityElement);
        this.qualityValue = document.querySelector(options.qualityValueElement);
        this.resize = document.querySelector(options.resizeElement);
        this.convertBtn = document.querySelector(options.convertButton);
        this.progressBar = document.querySelector(options.progressBar);
        this.progressText = document.querySelector(options.progressText);
        
        this.sourceFormat = options.sourceFormat;
        this.targetFormat = options.targetFormat;
        
        // Supported formats and their mime types
        this.supportedFormats = {
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            webp: 'image/webp',
            gif: 'image/gif'
        };
        
        // Maximum file size (10MB)
        this.maxFileSize = 10 * 1024 * 1024;
        
        // Store files for batch processing
        this.filesToConvert = [];
        
        this.bindEvents();
    }

    bindEvents() {
        // File input events
        this.input.addEventListener('change', this.handleFileSelect.bind(this));
        
        // Quality slider events
        if (this.quality && this.qualityValue) {
            this.quality.addEventListener('input', () => {
                this.qualityValue.textContent = `${this.quality.value}%`;
                this.updatePreviews();
            });
        }
        
        // Convert button events
        if (this.convertBtn) {
            this.convertBtn.addEventListener('click', this.convertImages.bind(this));
        }
        
        // Drag and drop events
        const uploadArea = this.input.closest('.upload-area');
        if (uploadArea) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, this.preventDefaults.bind(this));
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => {
                    uploadArea.classList.add('drag-active');
                });
            });

            ['dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => {
                    uploadArea.classList.remove('drag-active');
                });
            });

            uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        }
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDrop(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleFileSelect({ target: { files } });
        }
    }

    validateFile(file) {
        // Check file size
        if (file.size > this.maxFileSize) {
            throw new Error(`File "${file.name}" exceeds maximum size of 10MB`);
        }

        // Check file type
        const fileType = file.type.toLowerCase();
        const isValidSource = this.sourceFormat ? 
            fileType === this.supportedFormats[this.sourceFormat] :
            Object.values(this.supportedFormats).includes(fileType);

        if (!isValidSource) {
            throw new Error(`File "${file.name}" is not a valid ${this.sourceFormat || 'image'} file`);
        }

        return true;
    }

    async handleFileSelect(e) {
        try {
            const files = Array.from(e.target.files);
            this.filesToConvert = [];
            
            // Validate each file
            for (const file of files) {
                try {
                    this.validateFile(file);
                    this.filesToConvert.push(file);
                } catch (error) {
                    this.showError(error.message);
                }
            }

            if (this.filesToConvert.length === 0) {
                return;
            }

            // Show settings and preview sections
            document.querySelector('.settings-section').style.display = 'block';
            document.querySelector('.preview-section').style.display = 'block';

            // Clear previous previews
            this.preview.innerHTML = '';

            // Create previews for valid files
            for (const file of this.filesToConvert) {
                await this.createPreview(file);
            }
        } catch (error) {
            console.error('Error handling files:', error);
            this.showError('Error processing selected files');
        }
    }

    async createPreview(file) {
        try {
            const reader = new FileReader();
            
            const preview = await new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const col = document.createElement('div');
            col.className = 'col-md-4 mb-3';
            
            const card = document.createElement('div');
            card.className = 'card h-100';
            
            const img = document.createElement('img');
            img.src = preview;
            img.className = 'card-img-top';
            img.style.objectFit = 'cover';
            img.style.height = '200px';
            
            const cardBody = document.createElement('div');
            cardBody.className = 'card-body';
            cardBody.innerHTML = `
                <h6 class="card-title text-truncate">${file.name}</h6>
                <p class="card-text">
                    <small class="text-muted">
                        Size: ${this.formatFileSize(file.size)}<br>
                        Type: ${file.type.split('/')[1].toUpperCase()}<br>
                        Status: Ready to convert
                    </small>
                </p>
            `;
            
            card.appendChild(img);
            card.appendChild(cardBody);
            col.appendChild(card);
            this.preview.appendChild(col);
        } catch (error) {
            console.error('Error creating preview:', error);
            this.showError(`Error creating preview for ${file.name}`);
        }
    }

    async convertImages() {
        if (this.filesToConvert.length === 0) {
            this.showError('Please select files to convert');
            return;
        }

        try {
            this.showProgress();
            this.convertBtn.disabled = true;

            const quality = parseInt(this.quality?.value || 90) / 100;
            const resizeOption = this.resize?.value || 'none';
            const totalFiles = this.filesToConvert.length;
            const convertedFiles = [];

            for (let i = 0; i < totalFiles; i++) {
                const file = this.filesToConvert[i];
                const progress = ((i + 1) / totalFiles) * 100;
                
                this.updateProgress(progress, `Converting ${i + 1} of ${totalFiles}`);

                try {
                    const convertedFile = await this.convertImage(file, quality, resizeOption);
                    convertedFiles.push(convertedFile);
                } catch (error) {
                    console.error(`Error converting ${file.name}:`, error);
                    this.showError(`Error converting ${file.name}`);
                }
            }

            if (convertedFiles.length > 0) {
                this.downloadFiles(convertedFiles);
                this.showSuccess(`Successfully converted ${convertedFiles.length} files`);
            }
        } catch (error) {
            console.error('Error converting images:', error);
            this.showError('Error converting images');
        } finally {
            this.hideProgress();
            this.convertBtn.disabled = false;
        }
    }

    async convertImage(file, quality, resizeOption) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            img.onload = () => {
                try {
                    // Apply resize if needed
                    const dimensions = this.getResizeDimensions(resizeOption);
                    if (dimensions) {
                        canvas.width = dimensions.width;
                        canvas.height = dimensions.height;
                    } else {
                        canvas.width = img.width;
                        canvas.height = img.height;
                    }

                    // Draw image
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    // Convert to target format
                    canvas.toBlob((blob) => {
                        if (!blob) {
                            reject(new Error('Failed to convert image'));
                            return;
                        }

                        const convertedFile = new File(
                            [blob],
                            `converted_${file.name.replace(/\.[^/.]+$/, '')}.${this.targetFormat}`,
                            { type: this.supportedFormats[this.targetFormat] }
                        );
                        resolve(convertedFile);
                    }, this.supportedFormats[this.targetFormat], quality);
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = URL.createObjectURL(file);
        });
    }

    getResizeDimensions(option) {
        switch (option) {
            case 'small':
                return { width: 800, height: 600 };
            case 'medium':
                return { width: 1024, height: 768 };
            case 'large':
                return { width: 1920, height: 1080 };
            default:
                return null;
        }
    }

    downloadFiles(files) {
        if (files.length === 1) {
            // Single file download
            const url = URL.createObjectURL(files[0]);
            const link = document.createElement('a');
            link.href = url;
            link.download = files[0].name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } else {
            // Multiple files - create zip
            const zip = new JSZip();
            files.forEach(file => zip.file(file.name, file));
            
            zip.generateAsync({ type: 'blob' })
                .then(content => {
                    const url = URL.createObjectURL(content);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `converted_images.zip`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                })
                .catch(error => {
                    console.error('Error creating zip:', error);
                    this.showError('Error creating zip file');
                });
        }
    }

    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
    }

    showProgress() {
        const progressSection = document.querySelector('.progress-section');
        if (progressSection) {
            progressSection.style.display = 'block';
        }
    }

    hideProgress() {
        const progressSection = document.querySelector('.progress-section');
        if (progressSection) {
            progressSection.style.display = 'none';
        }
    }

    updateProgress(percent, text) {
        if (this.progressBar) {
            this.progressBar.style.width = `${percent}%`;
        }
        if (this.progressText) {
            this.progressText.textContent = text;
        }
    }

    showError(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger alert-dismissible fade show mt-3';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        this.preview.parentElement.insertBefore(alert, this.preview);
        setTimeout(() => alert.remove(), 5000);
    }

    showSuccess(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-success alert-dismissible fade show mt-3';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        this.preview.parentElement.insertBefore(alert, this.preview);
        setTimeout(() => alert.remove(), 5000);
    }
} 