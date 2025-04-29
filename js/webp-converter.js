import { ImageConverter } from './image-converter.js';

export class WebPConverter extends ImageConverter {
    constructor(options) {
        super({
            ...options,
            sourceFormat: null, // Allow any supported format
            targetFormat: 'webp' // Default to WebP
        });

        this.targetFormatSelect = document.querySelector(options.targetFormatElement);
        
        // Override the target format when changed
        if (this.targetFormatSelect) {
            this.targetFormatSelect.addEventListener('change', () => {
                this.targetFormat = this.targetFormatSelect.value;
                this.updatePreviews();
            });
        }
    }

    validateFile(file) {
        // Check file size
        if (file.size > this.maxFileSize) {
            throw new Error(`File "${file.name}" exceeds maximum size of 10MB`);
        }

        // Check file type
        const fileType = file.type.toLowerCase();
        const isValidFormat = Object.values(this.supportedFormats).includes(fileType);

        if (!isValidFormat) {
            throw new Error(`File "${file.name}" is not a supported image format`);
        }

        // For WebP to JPG/PNG conversion, ensure it's a WebP file
        if (this.targetFormat !== 'webp' && fileType !== this.supportedFormats.webp) {
            throw new Error(`File "${file.name}" must be a WebP file to convert to ${this.targetFormat.toUpperCase()}`);
        }

        // For conversion to WebP, ensure it's not already a WebP file
        if (this.targetFormat === 'webp' && fileType === this.supportedFormats.webp) {
            throw new Error(`File "${file.name}" is already a WebP file`);
        }

        return true;
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

                        // Generate filename
                        const extension = this.targetFormat.toLowerCase();
                        const filename = file.name.replace(/\.[^/.]+$/, '') + '.' + extension;
                        
                        resolve(new File([blob], filename, { type: this.supportedFormats[this.targetFormat] }));
                    }, this.supportedFormats[this.targetFormat], quality);
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };

            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
            };
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            reader.readAsDataURL(file);
        });
    }
} 