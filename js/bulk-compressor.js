export class BulkCompressor {
    constructor(options) {
        this.input = document.querySelector(options.inputElement);
        this.fileList = document.querySelector(options.fileListElement);
        this.clearAllBtn = document.querySelector(options.clearAllButton);
        this.quality = document.querySelector(options.qualityElement);
        this.qualityValue = document.querySelector(options.qualityValueElement);
        this.format = document.querySelector(options.formatElement);
        this.maxWidth = document.querySelector(options.maxWidthElement);
        this.maxHeight = document.querySelector(options.maxHeightElement);
        this.preserveMetadata = document.querySelector(options.preserveMetadataElement);
        this.compressBtn = document.querySelector(options.compressButton);
        this.progressBar = document.querySelector(options.progressBar);
        this.progressText = document.querySelector(options.progressText);

        this.files = new Map();
        this.bindEvents();
    }

    bindEvents() {
        this.input.addEventListener('change', this.handleFilesUpload.bind(this));
        
        if (this.quality && this.qualityValue) {
            this.quality.addEventListener('input', () => {
                this.qualityValue.textContent = `${this.quality.value}%`;
            });
        }

        this.clearAllBtn?.addEventListener('click', () => this.clearAllFiles());
        this.compressBtn?.addEventListener('click', () => this.compressFiles());

        // Drag and drop
        const uploadArea = this.input.closest('.upload-area');
        if (uploadArea) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, this.preventDefaults.bind(this));
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
            this.addFiles(Array.from(files));
        }
    }

    handleFilesUpload(event) {
        this.addFiles(Array.from(event.target.files));
    }

    addFiles(files) {
        const validFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (validFiles.length === 0) {
            this.showError('Please select valid image files');
            return;
        }

        validFiles.forEach(file => {
            const fileId = Math.random().toString(36).substring(2);
            this.files.set(fileId, file);
            this.addFileToList(fileId, file);
        });

        this.updateUI();
    }

    addFileToList(fileId, file) {
        const row = document.createElement('tr');
        row.id = `file-${fileId}`;
        row.innerHTML = `
            <td class="text-truncate" style="max-width: 200px;">${file.name}</td>
            <td>${this.formatFileSize(file.size)}</td>
            <td><span class="file-status pending">Pending</span></td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="this.closest('tr').remove(); document.querySelector('.bulk-compressor').dispatchEvent(new CustomEvent('fileRemoved', { detail: '${fileId}' }))">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        `;
        this.fileList.appendChild(row);
    }

    removeFile(fileId) {
        this.files.delete(fileId);
        const row = document.getElementById(`file-${fileId}`);
        if (row) row.remove();
        this.updateUI();
    }

    clearAllFiles() {
        this.files.clear();
        this.fileList.innerHTML = '';
        this.updateUI();
    }

    updateUI() {
        const hasFiles = this.files.size > 0;
        document.querySelector('.file-list').style.display = hasFiles ? 'block' : 'none';
        document.querySelector('.compression-settings').style.display = hasFiles ? 'block' : 'none';
        document.querySelector('#process-section').style.display = hasFiles ? 'block' : 'none';
    }

    async compressFiles() {
        if (this.files.size === 0) {
            this.showError('Please select files to compress');
            return;
        }

        const quality = this.quality ? this.quality.value / 100 : 0.7;
        const format = this.format ? this.format.value : 'auto';
        const maxWidth = this.maxWidth ? parseInt(this.maxWidth.value) : null;
        const maxHeight = this.maxHeight ? parseInt(this.maxHeight.value) : null;
        const preserveMetadata = this.preserveMetadata ? this.preserveMetadata.checked : false;

        try {
            document.querySelector('.progress-section').style.display = 'block';
            this.compressBtn.disabled = true;
            let processed = 0;

            for (const [fileId, file] of this.files) {
                this.updateFileStatus(fileId, 'processing');
                this.updateProgress(processed, this.files.size);

                try {
                    const compressedFile = await this.compressFile(file, quality, format, maxWidth, maxHeight, preserveMetadata);
                    this.downloadFile(compressedFile);
                    this.updateFileStatus(fileId, 'completed');
                } catch (error) {
                    console.error(`Error compressing ${file.name}:`, error);
                    this.updateFileStatus(fileId, 'error');
                }

                processed++;
                this.updateProgress(processed, this.files.size);
            }

            this.showSuccess(`Successfully processed ${processed} files`);
        } catch (error) {
            console.error('Error processing files:', error);
            this.showError('Error processing files');
        } finally {
            this.compressBtn.disabled = false;
        }
    }

    async compressFile(file, quality, format, maxWidth, maxHeight, preserveMetadata) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

                // Calculate dimensions while maintaining aspect ratio
                let { width, height } = this.calculateDimensions(img.width, img.height, maxWidth, maxHeight);

                canvas.width = width;
                canvas.height = height;

                // Enable high-quality image scaling
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Draw image
                ctx.drawImage(img, 0, 0, width, height);

                // Determine output format
                const outputFormat = format === 'auto' ? file.type : `image/${format}`;

                // Convert to blob with quality setting
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Failed to compress image'));
                            return;
                        }
                        
                        // Create a new file with the compressed data
                        const compressedFile = new File(
                            [blob],
                            `compressed_${file.name}`,
                            { type: outputFormat }
                        );
                        
                        resolve(compressedFile);
                    },
                    outputFormat,
                    quality
                );
            };

            img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
            img.src = URL.createObjectURL(file);
        });
    }

    calculateDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
        let width = originalWidth;
        let height = originalHeight;
        const aspectRatio = width / height;

        // If maxWidth is specified and image is wider
        if (maxWidth && width > maxWidth) {
            width = maxWidth;
            height = Math.round(width / aspectRatio);
        }

        // If maxHeight is specified and image is still taller
        if (maxHeight && height > maxHeight) {
            height = maxHeight;
            width = Math.round(height * aspectRatio);
        }

        return { width, height };
    }

    updateFileStatus(fileId, status) {
        const row = document.getElementById(`file-${fileId}`);
        if (!row) return;

        const statusCell = row.querySelector('.file-status');
        if (!statusCell) return;

        statusCell.className = `file-status ${status}`;
        
        switch (status) {
            case 'processing':
                statusCell.textContent = 'Processing...';
                break;
            case 'completed':
                statusCell.textContent = 'Completed';
                break;
            case 'error':
                statusCell.textContent = 'Failed';
                break;
            default:
                statusCell.textContent = 'Pending';
        }
    }

    updateProgress(processed, total) {
        const percentage = Math.round((processed / total) * 100);
        if (this.progressBar) {
            this.progressBar.style.width = `${percentage}%`;
            this.progressBar.setAttribute('aria-valuenow', percentage);
        }
        if (this.progressText) {
            this.progressText.textContent = `Processing ${processed} of ${total} files (${percentage}%)`;
        }
    }

    downloadFile(file) {
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
    }

    showError(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger alert-dismissible fade show mt-3';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.querySelector('.card-body').insertBefore(alert, document.querySelector('.upload-section'));
        setTimeout(() => alert.remove(), 5000);
    }

    showSuccess(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-success alert-dismissible fade show mt-3';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.querySelector('.card-body').insertBefore(alert, document.querySelector('.upload-section'));
        setTimeout(() => alert.remove(), 5000);
    }
} 