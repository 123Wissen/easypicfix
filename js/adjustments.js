class ImageAdjuster {
    constructor() {
        this.originalImage = null;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.initializeElements();
        this.setupEventListeners();
        this.resetAdjustments();
    }

    initializeElements() {
        // Get all necessary DOM elements
        this.uploadArea = document.querySelector('.upload-area');
        this.fileInput = document.getElementById('fileInput');
        this.previewImage = document.getElementById('previewImage');
        this.adjustmentInputs = {
            brightness: document.getElementById('brightness'),
            contrast: document.getElementById('contrast'),
            saturation: document.getElementById('saturation'),
            sharpness: document.getElementById('sharpness'),
            temperature: document.getElementById('temperature'),
            tint: document.getElementById('tint')
        };
        this.valueDisplays = {
            brightness: document.getElementById('brightnessValue'),
            contrast: document.getElementById('contrastValue'),
            saturation: document.getElementById('saturationValue'),
            sharpness: document.getElementById('sharpnessValue'),
            temperature: document.getElementById('temperatureValue'),
            tint: document.getElementById('tintValue')
        };
        this.applyButton = document.getElementById('applyButton');
        this.resetButton = document.getElementById('resetButton');
        this.downloadButton = document.getElementById('downloadButton');
    }

    setupEventListeners() {
        // File upload handlers
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.uploadArea.classList.add('dragover');
        });
        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.classList.remove('dragover');
        });
        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.uploadArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.handleImageUpload(file);
            }
        });
        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleImageUpload(file);
            }
        });

        // Adjustment input handlers
        Object.entries(this.adjustmentInputs).forEach(([key, input]) => {
            input.addEventListener('input', () => {
                this.valueDisplays[key].textContent = input.value;
                this.updatePreview();
            });
        });

        // Button handlers
        this.resetButton.addEventListener('click', () => this.resetAdjustments());
        this.applyButton.addEventListener('click', () => this.applyAdjustments());
        this.downloadButton.addEventListener('click', () => this.downloadImage());
    }

    handleImageUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.originalImage = img;
                this.canvas.width = img.width;
                this.canvas.height = img.height;
                this.updatePreview();
                this.enableControls();
            };
            img.src = e.target.result;
            this.previewImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    updatePreview() {
        if (!this.originalImage) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.filter = this.generateFilterString();
        this.ctx.drawImage(this.originalImage, 0, 0);
        
        this.previewImage.src = this.canvas.toDataURL();
    }

    generateFilterString() {
        const brightness = 1 + (this.adjustmentInputs.brightness.value / 100);
        const contrast = 1 + (this.adjustmentInputs.contrast.value / 100);
        const saturation = 1 + (this.adjustmentInputs.saturation.value / 100);
        
        return `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;
        }

    resetAdjustments() {
        Object.entries(this.adjustmentInputs).forEach(([key, input]) => {
            input.value = 0;
            this.valueDisplays[key].textContent = '0';
        });
        this.updatePreview();
    }

    applyAdjustments() {
        if (!this.originalImage) return;
        // The current preview becomes the new original
        const img = new Image();
        img.onload = () => {
            this.originalImage = img;
            this.resetAdjustments();
        };
        img.src = this.canvas.toDataURL();
    }

    downloadImage() {
        if (!this.originalImage) return;

        const link = document.createElement('a');
        link.download = 'adjusted-image.png';
        link.href = this.canvas.toDataURL();
        link.click();
    }

    enableControls() {
        Object.values(this.adjustmentInputs).forEach(input => {
            input.disabled = false;
        });
        this.applyButton.disabled = false;
        this.resetButton.disabled = false;
        this.downloadButton.disabled = false;
    }
}

// Initialize the image adjuster when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ImageAdjuster();
}); 