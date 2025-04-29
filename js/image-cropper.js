export class ImageCropper {
    constructor(options) {
        // Store DOM elements
        this.fileInput = document.querySelector(options.inputElement);
        this.previewImage = document.querySelector(options.previewElement);
        this.aspectRatioSelect = document.querySelector(options.aspectRatioElement);
        this.ratioXInput = document.querySelector(options.ratioXElement);
        this.ratioYInput = document.querySelector(options.ratioYElement);
        this.outputFormatSelect = document.querySelector(options.outputFormatElement);
        this.qualityInput = document.querySelector(options.qualityElement);
        this.qualityValue = document.querySelector(options.qualityValueElement);
        this.rotateLeftBtn = document.querySelector(options.rotateLeftButton);
        this.rotateRightBtn = document.querySelector(options.rotateRightButton);
        this.flipHBtn = document.querySelector(options.flipHButton);
        this.flipVBtn = document.querySelector(options.flipVButton);
        this.resetBtn = document.querySelector(options.resetButton);
        this.cropBtn = document.querySelector(options.cropButton);
        this.progressBar = document.querySelector(options.progressBar);
        this.progressText = document.querySelector(options.progressText);

        // Store sections for visibility control
        this.uploadSection = document.querySelector('.upload-section');
        this.cropSettings = document.querySelector('.crop-settings');
        this.previewSection = document.querySelector('.preview-section');
        this.actionButtons = document.querySelector('#action-buttons');
        this.progressSection = document.querySelector('.progress-section');

        // Initialize cropper instance
        this.cropper = null;
        this.originalFile = null;

        // Bind event listeners
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // File input change
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Drag and drop
        const uploadArea = document.querySelector('#upload-area');
        if (uploadArea) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => {
                    uploadArea.classList.add('border-primary');
                });
            });

            ['dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => {
                    uploadArea.classList.remove('border-primary');
                });
            });

            uploadArea.addEventListener('drop', (e) => {
                const file = e.dataTransfer.files[0];
                if (file) this.handleFileSelect({ target: { files: [file] } });
            });
        }

        // Aspect ratio change
        this.aspectRatioSelect.addEventListener('change', () => this.updateAspectRatio());
        this.ratioXInput?.addEventListener('input', () => this.updateCustomRatio());
        this.ratioYInput?.addEventListener('input', () => this.updateCustomRatio());

        // Quality slider
        this.qualityInput.addEventListener('input', () => {
            this.qualityValue.textContent = this.qualityInput.value;
        });

        // Cropper controls
        this.rotateLeftBtn.addEventListener('click', () => this.rotate(-90));
        this.rotateRightBtn.addEventListener('click', () => this.rotate(90));
        this.flipHBtn.addEventListener('click', () => this.flip('horizontal'));
        this.flipVBtn.addEventListener('click', () => this.flip('vertical'));
        this.resetBtn.addEventListener('click', () => this.reset());
        this.cropBtn.addEventListener('click', () => this.crop());
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showError('Please select a valid image file');
            return;
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showError('File size exceeds 10MB limit');
            return;
        }

        this.originalFile = file;
        const reader = new FileReader();

        reader.onload = (e) => {
            // Show all sections
            this.cropSettings.style.display = 'block';
            this.previewSection.style.display = 'block';
            this.actionButtons.style.display = 'block';

            // Initialize cropper
            this.previewImage.src = e.target.result;
            if (this.cropper) {
                this.cropper.destroy();
            }

            this.cropper = new Cropper(this.previewImage, {
                viewMode: 2,
                dragMode: 'move',
                autoCropArea: 1,
                restore: false,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: true,
                background: true,
                responsive: true,
                ready: () => {
                    this.updateAspectRatio();
                }
            });
        };

        reader.readAsDataURL(file);
    }

    updateAspectRatio() {
        if (!this.cropper) return;

        const value = this.aspectRatioSelect.value;
        let ratio;

        switch (value) {
            case 'free':
                ratio = NaN;
                break;
            case '1:1':
                ratio = 1;
                break;
            case '4:3':
                ratio = 4/3;
                break;
            case '16:9':
                ratio = 16/9;
                break;
            case '2:3':
                ratio = 2/3;
                break;
            case '3:2':
                ratio = 3/2;
                break;
            case 'custom':
                ratio = this.getCustomRatio();
                break;
            default:
                ratio = NaN;
        }

        this.cropper.setAspectRatio(ratio);
    }

    updateCustomRatio() {
        if (this.aspectRatioSelect.value === 'custom') {
            const ratio = this.getCustomRatio();
            if (ratio > 0) {
                this.cropper.setAspectRatio(ratio);
            }
        }
    }

    getCustomRatio() {
        const x = parseFloat(this.ratioXInput.value);
        const y = parseFloat(this.ratioYInput.value);
        return (x > 0 && y > 0) ? x/y : NaN;
    }

    rotate(degree) {
        if (this.cropper) {
            this.cropper.rotate(degree);
        }
    }

    flip(direction) {
        if (!this.cropper) return;

        const data = this.cropper.getData();
        if (direction === 'horizontal') {
            this.cropper.scaleX(data.scaleX === 1 ? -1 : 1);
        } else {
            this.cropper.scaleY(data.scaleY === 1 ? -1 : 1);
        }
    }

    reset() {
        if (this.cropper) {
            this.cropper.reset();
            this.aspectRatioSelect.value = 'free';
            this.updateAspectRatio();
        }
    }

    async crop() {
        if (!this.cropper || !this.originalFile) return;

        try {
            // Show progress
            this.progressSection.style.display = 'block';
            this.progressBar.style.width = '0%';
            this.progressText.textContent = 'Processing image...';
            this.cropBtn.disabled = true;

            // Get output format
            let format = this.outputFormatSelect.value;
            if (format === 'same') {
                format = this.originalFile.type.split('/')[1];
                if (format === 'jpeg') format = 'jpg';
            }

            // Get quality
            const quality = parseInt(this.qualityInput.value) / 100;

            // Get cropped canvas
            const canvas = this.cropper.getCroppedCanvas({
                maxWidth: 4096,
                maxHeight: 4096,
                fillColor: '#fff'
            });

            // Update progress
            this.progressBar.style.width = '50%';

            // Convert to blob
            const blob = await new Promise(resolve => {
                canvas.toBlob(
                    blob => resolve(blob),
                    `image/${format === 'jpg' ? 'jpeg' : format}`,
                    quality
                );
            });

            // Update progress
            this.progressBar.style.width = '75%';

            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const timestamp = new Date().getTime();
            link.download = `cropped_${timestamp}.${format}`;
            link.href = url;

            // Complete progress
            this.progressBar.style.width = '100%';
            this.progressText.textContent = 'Download starting...';

            // Trigger download
            link.click();
            URL.revokeObjectURL(url);

            // Reset progress
            setTimeout(() => {
                this.progressSection.style.display = 'none';
                this.progressBar.style.width = '0%';
                this.cropBtn.disabled = false;
            }, 1500);

        } catch (error) {
            console.error('Error cropping image:', error);
            this.showError('Failed to crop image. Please try again.');
            this.progressSection.style.display = 'none';
            this.cropBtn.disabled = false;
        }
    }

    showError(message) {
        const alertContainer = document.createElement('div');
        alertContainer.className = 'alert alert-danger alert-dismissible fade show mt-3';
        alertContainer.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-exclamation-circle me-2"></i>
                <div class="flex-grow-1">${message}</div>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        this.uploadSection.appendChild(alertContainer);
        setTimeout(() => alertContainer.remove(), 5000);
    }
} 