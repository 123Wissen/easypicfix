export class BatchConverter {
    constructor(options) {
        this.options = options;
        this.files = [];
        this.maxFiles = 50;
        this.supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.inputElement = document.querySelector(this.options.inputElement);
        this.previewElement = document.querySelector(this.options.previewElement);
        this.targetFormatElement = document.querySelector(this.options.targetFormatElement);
        this.qualityElement = document.querySelector(this.options.qualityElement);
        this.qualityValueElement = document.querySelector(this.options.qualityValueElement);
        this.resizeElement = document.querySelector(this.options.resizeElement);
        this.customWidthElement = document.querySelector(this.options.customWidthElement);
        this.customHeightElement = document.querySelector(this.options.customHeightElement);
        this.preserveMetadataElement = document.querySelector(this.options.preserveMetadataElement);
        this.clearButton = document.querySelector(this.options.clearButton);
        this.convertButton = document.querySelector(this.options.convertButton);
        this.progressBar = document.querySelector(this.options.progressBar);
        this.progressText = document.querySelector(this.options.progressText);

        // Show settings and preview sections
        this.settingsSection = document.querySelector('.settings-section');
        this.previewSection = document.querySelector('.preview-section');
        this.progressSection = document.querySelector('.progress-section');
    }

    bindEvents() {
        // File input change event
        this.inputElement.addEventListener('change', (e) => this.handleFileSelect(e));

        // Drag and drop events
        const dropArea = this.inputElement.closest('.upload-area');
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.add('drag-over');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.remove('drag-over');
            }, false);
        });

        dropArea.addEventListener('drop', (e) => this.handleDrop(e), false);

        // Quality slider change event
        this.qualityElement.addEventListener('input', () => {
            this.qualityValueElement.textContent = this.qualityElement.value;
        });

        // Clear button click event
        this.clearButton.addEventListener('click', () => {
            this.files = [];
            this.previewElement.innerHTML = '';
            this.settingsSection.style.display = 'none';
            this.previewSection.style.display = 'none';
        });

        // Convert button click event
        this.convertButton.addEventListener('click', () => this.convertImages());
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        this.handleFiles(files);
    }

    async handleFileSelect(e) {
        const files = e.target.files;
        this.handleFiles(files);
    }

    handleFiles(files) {
        if (this.files.length + files.length > this.maxFiles) {
            this.showError(`Maximum ${this.maxFiles} files allowed at once`);
            return;
        }

        Array.from(files).forEach(file => {
            if (this.supportedTypes.includes(file.type)) {
                this.files.push(file);
            } else {
                this.showError(`Unsupported file type: ${file.name}`);
            }
        });

        if (this.files.length > 0) {
            this.settingsSection.style.display = 'block';
            this.previewSection.style.display = 'block';
            this.generatePreviews();
        }
    }

    async generatePreviews() {
        this.previewElement.innerHTML = '';
        
        for (const file of this.files) {
            const previewContainer = document.createElement('div');
            previewContainer.className = 'col-md-4 preview-item';

            const img = document.createElement('img');
            img.className = 'img-fluid rounded';
            
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.onclick = () => {
                this.files = this.files.filter(f => f !== file);
                previewContainer.remove();
                if (this.files.length === 0) {
                    this.settingsSection.style.display = 'none';
                    this.previewSection.style.display = 'none';
                }
            };

            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-info mt-2';
            fileInfo.textContent = `${file.name} (${this.formatFileSize(file.size)})`;

            previewContainer.appendChild(img);
            previewContainer.appendChild(removeBtn);
            previewContainer.appendChild(fileInfo);
            this.previewElement.appendChild(previewContainer);
        }
    }

    async convertImages() {
        if (this.files.length === 0) {
            this.showError('No files selected');
            return;
        }

        const settings = this.getSettings();
        if (settings.resizeOption === 'custom' && (!settings.customWidth || !settings.customHeight)) {
            this.showError('Please enter custom dimensions');
            return;
        }

        this.showProgress();
        const zip = new JSZip();
        const processedImages = [];

        try {
            for (let i = 0; i < this.files.length; i++) {
                const file = this.files[i];
                const percent = Math.round((i / this.files.length) * 100);
                this.updateProgress(percent, `Converting ${file.name}...`);

                const result = await this.processImage(file, settings);
                if (result) {
                    processedImages.push(result);
                    zip.file(result.filename, result.blob);
                }
            }

            this.updateProgress(100, 'Preparing download...');
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const zipFilename = `converted-images-${timestamp}.zip`;
            
            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(zipBlob);
            downloadLink.download = zipFilename;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(downloadLink.href);

            this.showSuccess(`Successfully converted ${processedImages.length} images`);
        } catch (error) {
            this.showError('Error converting images: ' + error.message);
        } finally {
            this.hideProgress();
        }
    }

    getSettings() {
        return {
            targetFormat: this.targetFormatElement.value,
            quality: parseInt(this.qualityElement.value) / 100,
            resizeOption: this.resizeElement.value,
            customWidth: parseInt(this.customWidthElement.value),
            customHeight: parseInt(this.customHeightElement.value),
            preserveMetadata: this.preserveMetadataElement.checked
        };
    }

    async processImage(file, settings) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            img.onload = () => {
                try {
                    // Calculate dimensions
                    let width = img.width;
                    let height = img.height;

                    if (settings.resizeOption !== 'none') {
                        const dimensions = this.getResizeDimensions(settings, width, height);
                        width = dimensions.width;
                        height = dimensions.height;
                    }

                    // Set canvas size
                    canvas.width = width;
                    canvas.height = height;

                    // Draw image with high quality
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to desired format
                    const mimeType = this.getMimeType(settings.targetFormat);
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                const filename = this.getOutputFilename(file.name, settings);
                                resolve({ blob, filename });
                            } else {
                                reject(new Error('Failed to convert image'));
                            }
                        },
                        mimeType,
                        settings.quality
                    );
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = URL.createObjectURL(file);
        });
    }

    getResizeDimensions(settings, originalWidth, originalHeight) {
        let targetWidth, targetHeight;

        switch (settings.resizeOption) {
            case 'small':
                targetWidth = 800;
                targetHeight = 600;
                break;
            case 'medium':
                targetWidth = 1024;
                targetHeight = 768;
                break;
            case 'large':
                targetWidth = 1920;
                targetHeight = 1080;
                break;
            case 'custom':
                targetWidth = settings.customWidth;
                targetHeight = settings.customHeight;
                break;
            default:
                return { width: originalWidth, height: originalHeight };
        }

        const ratio = Math.min(targetWidth / originalWidth, targetHeight / originalHeight);
        return {
            width: Math.round(originalWidth * ratio),
            height: Math.round(originalHeight * ratio)
        };
    }

    getMimeType(format) {
        switch (format) {
            case 'jpg':
                return 'image/jpeg';
            case 'png':
                return 'image/png';
            case 'webp':
                return 'image/webp';
            default:
                return 'image/jpeg';
        }
    }

    getOutputFilename(originalName, settings) {
        const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
        return `${baseName}.${settings.targetFormat}`;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showProgress() {
        this.progressSection.style.display = 'block';
        this.convertButton.disabled = true;
    }

    hideProgress() {
        this.progressSection.style.display = 'none';
        this.convertButton.disabled = false;
    }

    updateProgress(percent, text) {
        this.progressBar.style.width = `${percent}%`;
        if (text) {
            this.progressText.textContent = text;
        }
    }

    showError(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show mt-3';
        alertDiv.innerHTML = `
            <i class="fas fa-exclamation-circle me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        this.previewElement.parentNode.insertBefore(alertDiv, this.previewElement);
        setTimeout(() => alertDiv.remove(), 5000);
    }

    showSuccess(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success alert-dismissible fade show mt-3';
        alertDiv.innerHTML = `
            <i class="fas fa-check-circle me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        this.previewElement.parentNode.insertBefore(alertDiv, this.previewElement);
        setTimeout(() => alertDiv.remove(), 5000);
    }
} 