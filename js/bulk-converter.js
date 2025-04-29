export class BulkConverter {
    constructor(options) {
        this.inputElement = document.querySelector(options.inputElement);
        this.fileListElement = document.querySelector(options.fileListElement);
        this.clearAllButton = document.querySelector(options.clearAllButton);
        this.formatElement = document.querySelector(options.formatElement);
        this.maxWidthElement = document.querySelector(options.maxWidthElement);
        this.maxHeightElement = document.querySelector(options.maxHeightElement);
        this.preserveMetadataElement = document.querySelector(options.preserveMetadataElement);
        this.convertButton = document.querySelector(options.convertButton);
        this.progressBar = document.querySelector(options.progressBar);
        this.progressText = document.querySelector(options.progressText);

        this.files = new Map();
        this.bindEvents();
    }

    bindEvents() {
        this.inputElement.addEventListener('change', this.handleFilesUpload.bind(this));
        this.clearAllButton.addEventListener('click', this.clearAllFiles.bind(this));
        this.convertButton.addEventListener('click', this.convertFiles.bind(this));

        // Drag and drop events
        const uploadArea = this.inputElement.closest('.upload-area');
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
        const dt = e.dataTransfer;
        const files = dt.files;
        this.addFiles(files);
    }

    handleFilesUpload(event) {
        this.addFiles(event.target.files);
    }

    addFiles(files) {
        Array.from(files).forEach(file => {
            if (this.validateFile(file)) {
                const fileId = Math.random().toString(36).substring(2);
                this.files.set(fileId, file);
                this.addFileToList(fileId, file);
            }
        });

        this.updateUI();
    }

    validateFile(file) {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            this.showError(`Invalid file type: ${file.name}`);
            return false;
        }

        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            this.showError(`File too large: ${file.name}`);
            return false;
        }

        return true;
    }

    addFileToList(fileId, file) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${file.name}</td>
            <td>${this.formatFileSize(file.size)}</td>
            <td><span class="file-status pending">Pending</span></td>
            <td>
                <button class="btn btn-sm btn-outline-danger remove-file" data-file-id="${fileId}">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        `;

        row.querySelector('.remove-file').addEventListener('click', () => {
            this.removeFile(fileId);
        });

        this.fileListElement.appendChild(row);
    }

    removeFile(fileId) {
        this.files.delete(fileId);
        const row = this.fileListElement.querySelector(`[data-file-id="${fileId}"]`).closest('tr');
        row.remove();
        this.updateUI();
    }

    clearAllFiles() {
        this.files.clear();
        this.fileListElement.innerHTML = '';
        this.updateUI();
    }

    updateUI() {
        const hasFiles = this.files.size > 0;
        this.clearAllButton.style.display = hasFiles ? 'block' : 'none';
        this.convertButton.style.display = hasFiles ? 'block' : 'none';
        document.querySelector('.file-list').style.display = hasFiles ? 'block' : 'none';
    }

    async convertFiles() {
        const total = this.files.size;
        let processed = 0;

        try {
            const format = this.formatElement.value;
            const maxWidth = this.maxWidthElement.value;
            const maxHeight = this.maxHeightElement.value;
            const preserveMetadata = this.preserveMetadataElement.checked;

            this.showProgress();

            for (const [fileId, file] of this.files) {
                try {
                    this.updateFileStatus(fileId, 'processing');
                    const convertedFile = await this.convertFile(file, format, maxWidth, maxHeight, preserveMetadata);
                    this.downloadFile(convertedFile, file.name);
                    this.updateFileStatus(fileId, 'completed');
                } catch (error) {
                    console.error('Error converting file:', error);
                    this.updateFileStatus(fileId, 'error');
                }

                processed++;
                this.updateProgress(processed, total);
            }

            this.showSuccess('All files converted successfully');
        } catch (error) {
            console.error('Conversion error:', error);
            this.showError('Error converting files');
        } finally {
            this.hideProgress();
        }
    }

    async convertFile(file, format, maxWidth, maxHeight, preserveMetadata) {
        // Create a canvas element
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Load the image
        const img = await this.loadImage(file);

        // Calculate dimensions
        let width = img.width;
        let height = img.height;

        if (maxWidth && width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
        }

        if (maxHeight && height > maxHeight) {
            width = (maxHeight / height) * width;
            height = maxHeight;
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to new format
        const mimeType = format === 'auto' ? file.type : `image/${format}`;
        const quality = 0.8;

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                const newFileName = this.getConvertedFileName(file.name, format);
                resolve(new File([blob], newFileName, { type: mimeType }));
            }, mimeType, quality);
        });
    }

    loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    getConvertedFileName(originalName, format) {
        const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
        return format === 'auto' ? originalName : `${baseName}.${format}`;
    }

    downloadFile(file, originalName) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(file);
        link.download = this.getConvertedFileName(originalName, this.formatElement.value);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateFileStatus(fileId, status) {
        const row = this.fileListElement.querySelector(`[data-file-id="${fileId}"]`).closest('tr');
        const statusElement = row.querySelector('.file-status');
        statusElement.className = `file-status ${status}`;
        statusElement.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    }

    updateProgress(processed, total) {
        const percent = (processed / total) * 100;
        this.progressBar.style.width = percent + '%';
        this.progressText.textContent = `Converting files (${processed}/${total})`;
    }

    showProgress() {
        document.querySelector('.progress-section').style.display = 'block';
        this.convertButton.disabled = true;
    }

    hideProgress() {
        document.querySelector('.progress-section').style.display = 'none';
        this.convertButton.disabled = false;
    }

    showError(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger alert-dismissible fade show';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.querySelector('.card-body').insertBefore(alert, document.querySelector('.upload-section'));
        setTimeout(() => alert.remove(), 5000);
    }

    showSuccess(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-success alert-dismissible fade show';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.querySelector('.card-body').insertBefore(alert, document.querySelector('.upload-section'));
        setTimeout(() => alert.remove(), 5000);
    }
} 