export class ImageFilter {
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
        this.filterTypeElement = document.querySelector(this.options.filterTypeElement);
        this.intensityElement = document.querySelector(this.options.intensityElement);
        this.intensityValueElement = document.querySelector(this.options.intensityValueElement);
        this.qualityElement = document.querySelector(this.options.qualityElement);
        this.qualityValueElement = document.querySelector(this.options.qualityValueElement);
        this.applyFilterButton = document.querySelector(this.options.applyFilterButton);
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
        this.intensityElement?.addEventListener('input', () => {
            this.intensityValueElement.textContent = this.intensityElement.value;
            this.updatePreviewFilter();
        });

        this.filterTypeElement?.addEventListener('change', () => {
            this.updatePreviewFilter();
        });

        this.qualityElement?.addEventListener('input', () => {
            this.qualityValueElement.textContent = this.qualityElement.value;
        });

        // Process button
        this.applyFilterButton?.addEventListener('click', () => this.processImages());
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
                            <img src="${e.target.result}" class="card-img-top preview-image" alt="Preview">
                            <div class="card-body">
                                <p class="card-text text-truncate">${file.name}</p>
                            </div>
                        </div>
                    </div>
                `;
                this.previewElement.appendChild(preview);
                
                // Apply initial filter
                this.updatePreviewFilter();
            };
            reader.readAsDataURL(file);
        });
    }

    updatePreviewFilter() {
        const filterType = this.filterTypeElement.value;
        const intensity = this.intensityElement.value;
        const filterValue = this.getFilterValue(filterType, intensity);
        
        document.querySelectorAll('.preview-image').forEach(img => {
            img.style.filter = filterValue;
        });
    }

    getFilterValue(type, intensity) {
        const value = intensity / 100;
        switch (type) {
            case 'grayscale':
                return `grayscale(${value})`;
            case 'sepia':
                return `sepia(${value})`;
            case 'invert':
                return `invert(${value})`;
            case 'blur':
                return `blur(${value * 10}px)`;
            case 'brightness':
                return `brightness(${value * 2})`;
            case 'contrast':
                return `contrast(${value * 2})`;
            case 'saturation':
                return `saturate(${value * 2})`;
            case 'hue-rotate':
                return `hue-rotate(${value * 360}deg)`;
            default:
                return 'none';
        }
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
            filterType: this.filterTypeElement.value,
            intensity: parseInt(this.intensityElement.value) / 100,
            quality: parseInt(this.qualityElement.value) / 100
        };
    }

    async processImage(file, settings) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const img = new Image();
                img.onload = () => {
                    try {
                        // Set canvas dimensions
                        this.canvas.width = img.width;
                        this.canvas.height = img.height;

                        // Draw original image
                        this.ctx.filter = this.getFilterValue(settings.filterType, settings.intensity * 100);
                        this.ctx.drawImage(img, 0, 0);
                        this.ctx.filter = 'none';

                        // Get processed image data
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

    downloadResults(processedImages) {
        if (processedImages.length === 1) {
            // Single file download
            const link = document.createElement('a');
            link.href = processedImages[0].data;
            link.download = `filtered_${processedImages[0].name}`;
            link.click();
        } else {
            // Multiple files - create zip
            const zip = new JSZip();
            processedImages.forEach((image) => {
                const filename = `filtered_${image.name}`;
                zip.file(filename, image.data.split(',')[1], {base64: true});
            });

            zip.generateAsync({type: 'blob'}).then((content) => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = 'filtered_images.zip';
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