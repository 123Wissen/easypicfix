export class HeicConverter {
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
        this.qualityElement = document.querySelector(this.options.qualityElement);
        this.qualityValueElement = document.querySelector(this.options.qualityValueElement);
        this.preserveMetadataElement = document.querySelector(this.options.preserveMetadataElement);
        this.autoRotateElement = document.querySelector(this.options.autoRotateElement);
        this.convertButton = document.querySelector(this.options.convertButton);
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

        // Convert button
        this.convertButton?.addEventListener('click', () => this.processImages());
    }

    handleFiles(fileList) {
        this.files = Array.from(fileList).filter(file => 
            file.name.toLowerCase().endsWith('.heic') || 
            file.type === 'image/heic' ||
            file.type === 'image/heif'
        );
        
        if (this.files.length === 0) {
            this.showError('Please upload valid HEIC files.');
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
        
        for (let i = 0; i < this.files.length; i++) {
            try {
                const file = this.files[i];
                
                // Create preview container
                const preview = document.createElement('div');
                preview.className = 'col-md-4';
                preview.innerHTML = `
                    <div class="preview-item">
                        <button class="remove-btn" data-index="${i}">
                            <i class="fas fa-times"></i>
                        </button>
                        <div class="card">
                            <div class="card-body text-center">
                                <i class="fas fa-spinner fa-spin fa-3x mb-2"></i>
                                <p class="card-text">Loading preview...</p>
                            </div>
                        </div>
                    </div>
                `;
                this.previewElement.appendChild(preview);

                // Convert HEIC to blob for preview
                const blob = await heic2any({
                    blob: file,
                    toType: "image/jpeg",
                    quality: 0.3
                });

                if (!blob) {
                    throw new Error('Conversion failed');
                }

                // Create object URL and update preview
                const url = URL.createObjectURL(blob);
                const card = preview.querySelector('.card');
                card.innerHTML = `
                    <img src="${url}" class="card-img-top" alt="Preview">
                    <div class="card-body">
                        <p class="card-text text-truncate">${file.name}</p>
                    </div>
                `;

                // Add remove button event listener
                preview.querySelector('.remove-btn').addEventListener('click', () => {
                    this.files = this.files.filter((_, index) => index !== i);
                    preview.remove();
                    if (this.files.length === 0) {
                        document.querySelector('.settings-section').style.display = 'none';
                        document.querySelector('.preview-section').style.display = 'none';
                    }
                });

            } catch (error) {
                console.error(`Error generating preview for ${this.files[i].name}:`, error);
                const preview = this.previewElement.children[i];
                const card = preview.querySelector('.card');
                card.innerHTML = `
                    <div class="card-body text-center text-danger">
                        <i class="fas fa-exclamation-circle fa-3x mb-2"></i>
                        <p class="card-text">Error loading preview</p>
                        <small>${this.files[i].name}</small>
                    </div>
                `;
            }
        }
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
                this.progressText.textContent = `Converting image ${i + 1} of ${totalFiles}...`;

                const processedImage = await this.processImage(this.files[i], settings);
                processedImages.push({
                    data: processedImage,
                    name: this.files[i].name.replace('.heic', '.jpg').replace('.HEIC', '.jpg')
                });
            }

            this.updateProgress(100);
            this.progressText.textContent = 'Conversion complete!';
            
            // Download processed images
            this.downloadResults(processedImages);

            setTimeout(() => {
                document.querySelector('.progress-section').style.display = 'none';
            }, 2000);

        } catch (error) {
            console.error('Error converting images:', error);
            this.showError('An error occurred while converting the images.');
        }
    }

    getSettings() {
        return {
            quality: parseInt(this.qualityElement.value) / 100,
            preserveMetadata: this.preserveMetadataElement.value,
            autoRotate: this.autoRotateElement.checked
        };
    }

    async processImage(file, settings) {
        try {
            // Convert HEIC to JPEG blob with full quality
            const blob = await heic2any({
                blob: file,
                toType: "image/jpeg",
                quality: settings.quality
            });

            if (!blob) {
                throw new Error('Conversion failed');
            }

            // If metadata preservation is not needed, return the blob directly
            if (settings.preserveMetadata === 'none') {
                return blob;
            }

            // For metadata preservation, we need to handle orientation
            if (settings.autoRotate) {
                const orientation = await this.getImageOrientation(file);
                if (orientation > 1) {
                    return await this.rotateImage(blob, orientation);
                }
            }

            return blob;
        } catch (error) {
            throw new Error(`Failed to convert ${file.name}: ${error.message}`);
        }
    }

    async getImageOrientation(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const view = new DataView(e.target.result);
                if (view.getUint16(0, false) != 0xFFD8) {
                    resolve(-2);
                }
                const length = view.byteLength;
                let offset = 2;
                while (offset < length) {
                    if (view.getUint16(offset+2, false) <= 8) break;
                    const marker = view.getUint16(offset, false);
                    offset += 2;
                    if (marker == 0xFFE1) {
                        if (view.getUint32(offset += 2, false) != 0x45786966) {
                            resolve(-1);
                        }
                        const little = view.getUint16(offset += 6, false) == 0x4949;
                        offset += view.getUint32(offset + 4, little);
                        const tags = view.getUint16(offset, little);
                        offset += 2;
                        for (let i = 0; i < tags; i++) {
                            if (view.getUint16(offset + (i * 12), little) == 0x0112) {
                                resolve(view.getUint16(offset + (i * 12) + 8, little));
                                return;
                            }
                        }
                    }
                    else if ((marker & 0xFF00) != 0xFF00) break;
                    else offset += view.getUint16(offset, false);
                }
                resolve(-1);
            };
            reader.readAsArrayBuffer(file);
        });
    }

    async rotateImage(blob, orientation) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Set proper canvas dimensions before transform
                if (orientation > 4 && orientation < 9) {
                    canvas.width = img.height;
                    canvas.height = img.width;
                } else {
                    canvas.width = img.width;
                    canvas.height = img.height;
                }

                // Transform context before drawing image
                switch (orientation) {
                    case 2: ctx.transform(-1, 0, 0, 1, img.width, 0); break;
                    case 3: ctx.transform(-1, 0, 0, -1, img.width, img.height); break;
                    case 4: ctx.transform(1, 0, 0, -1, 0, img.height); break;
                    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
                    case 6: ctx.transform(0, 1, -1, 0, img.height, 0); break;
                    case 7: ctx.transform(0, -1, -1, 0, img.height, img.width); break;
                    case 8: ctx.transform(0, -1, 1, 0, 0, img.width); break;
                    default: break;
                }

                ctx.drawImage(img, 0, 0);
                canvas.toBlob(resolve, 'image/jpeg', 0.95);
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(blob);
        });
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
                link.download = 'converted_images.zip';
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