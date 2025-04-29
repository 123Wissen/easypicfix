export class BulkWatermarkRemover {
    constructor(options) {
        this.options = options;
        this.files = [];
        this.processedFiles = [];
        this.currentIndex = 0;
        this.initializeElements();
    }

    initializeElements() {
        // Get DOM elements
        this.uploadArea = document.querySelector(this.options.uploadArea);
        this.previewContainer = document.querySelector(this.options.previewContainer);
        this.processingContainer = document.querySelector(this.options.processingContainer);
        this.processButton = document.querySelector(this.options.processButton);
        this.downloadButton = document.querySelector(this.options.downloadButton);
        this.progressBar = document.querySelector(this.options.progressBar);
        this.progressText = document.querySelector(this.options.progressText);

        // Initialize event listeners
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Process button click
        this.processButton?.addEventListener('click', () => this.processImages());

        // Download button click
        this.downloadButton?.addEventListener('click', () => this.downloadAll());
    }

    handleImagesUpload(files) {
        this.files = Array.from(files).filter(file => file.type.startsWith('image/'));
        
        if (this.files.length === 0) {
            this.showError('Please upload valid image files.');
            return;
        }

        this.updatePreviewGrid();
    }

    updatePreviewGrid() {
        if (!this.previewContainer) return;

        this.previewContainer.innerHTML = '';
        
        this.files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const previewItem = document.createElement('div');
                previewItem.className = 'col-md-4 preview-item';
                previewItem.innerHTML = `
                    <div class="card h-100">
                        <img src="${e.target.result}" class="card-img-top" alt="${file.name}">
                        <div class="card-body">
                            <h6 class="card-title text-truncate">${file.name}</h6>
                            <p class="card-text small text-muted">
                                Size: ${this.formatFileSize(file.size)}
                            </p>
                        </div>
                        <button class="remove-btn" data-index="${index}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;

                // Add remove button event listener
                const removeBtn = previewItem.querySelector('.remove-btn');
                removeBtn.addEventListener('click', () => {
                    this.files.splice(index, 1);
                    this.updatePreviewGrid();
                });

                this.previewContainer.appendChild(previewItem);
            };
            reader.readAsDataURL(file);
        });
    }

    async processImages() {
        if (this.files.length === 0) return;

        try {
            // Show progress section
            document.querySelector('.progress-section').style.display = 'block';
            this.processingContainer.innerHTML = '';
            this.processedFiles = [];
            this.currentIndex = 0;

            // Process each image
            for (const file of this.files) {
                await this.processImage(file);
                this.currentIndex++;
                this.updateProgress();
            }

            // Show download section
            document.querySelector('.download-section').style.display = 'block';

        } catch (error) {
            console.error('Error processing images:', error);
            this.showError('Failed to process images. Please try again.');
        }
    }

    async processImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    // Create processing item
                    const processingItem = document.createElement('div');
                    processingItem.className = 'col-md-4 processing-item';
                    processingItem.innerHTML = `
                        <div class="card h-100">
                            <img src="${e.target.result}" class="card-img-top" alt="${file.name}">
                            <div class="card-body">
                                <h6 class="card-title text-truncate">${file.name}</h6>
                                <div class="progress" style="height: 5px;">
                                    <div class="progress-bar" role="progressbar" style="width: 0%"></div>
                                </div>
                            </div>
                        </div>
                    `;
                    this.processingContainer.appendChild(processingItem);

                    // Process image (simulated)
                    await this.simulateImageProcessing(processingItem);

                    // Store processed result
                    this.processedFiles.push({
                        name: file.name,
                        data: e.target.result // In a real implementation, this would be the processed image data
                    });

                    resolve();
                } catch (error) {
                    console.error('Error processing image:', error);
                    this.showError(`Failed to process ${file.name}`);
                    resolve();
                }
            };
            reader.readAsDataURL(file);
        });
    }

    async simulateImageProcessing(processingItem) {
        const progressBar = processingItem.querySelector('.progress-bar');
        const steps = 5;
        
        for (let i = 0; i < steps; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            progressBar.style.width = `${((i + 1) / steps) * 100}%`;
        }
    }

    updateProgress() {
        const progress = ((this.currentIndex + 1) / this.files.length) * 100;
        this.progressBar.style.width = `${progress}%`;
        this.progressText.textContent = `Processing image ${this.currentIndex + 1} of ${this.files.length}`;
    }

    async downloadAll() {
        if (this.processedFiles.length === 0) return;

        try {
            const zip = new JSZip();
            const folder = zip.folder('processed_images');

            // Add each processed image to the zip
            this.processedFiles.forEach(file => {
                const data = file.data.split(',')[1];
                folder.file(file.name, data, { base64: true });
            });

            // Generate and download zip
            const content = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = 'processed_images.zip';
            link.click();
            URL.revokeObjectURL(link.href);

        } catch (error) {
            console.error('Error creating zip file:', error);
            this.showError('Failed to create download. Please try again.');
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showError(message) {
        const alertContainer = document.createElement('div');
        alertContainer.className = 'alert alert-danger alert-dismissible fade show';
        alertContainer.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.querySelector('.container').prepend(alertContainer);
    }
} 