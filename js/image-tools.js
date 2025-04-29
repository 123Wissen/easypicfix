export default class ImageTools {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.worker = null;
        this.objectUrls = new Set();
        this.initializeWorker();
    }

    // Initialize Web Worker for heavy processing
    initializeWorker() {
        const workerCode = `
            let isProcessing = false;
            
            self.onmessage = async function(e) {
                if (isProcessing) {
                    self.postMessage({ type: 'error', error: 'Already processing an image' });
                    return;
                }
                
                isProcessing = true;
                try {
                    const { type, data } = e.data;
                    let result;
                    
                    switch (type) {
                        case 'filter':
                            result = await applyFilter(data.imageData, data.filterType, data.options);
                            self.postMessage({ type: 'filterComplete', data: result });
                            break;
                        case 'compress':
                            result = await compressImage(data.imageData, data.quality);
                            self.postMessage({ type: 'compressComplete', data: result });
                            break;
                        case 'batch':
                            result = await processBatch(data.operations, data.imageData);
                            self.postMessage({ type: 'batchComplete', data: result });
                            break;
                        default:
                            throw new Error('Unknown operation type');
                    }
                } catch (error) {
                    self.postMessage({ type: 'error', error: error.message });
                } finally {
                    isProcessing = false;
                }
            };

            async function applyFilter(imageData, filterType, options = {}) {
                if (!imageData || !filterType) {
                    throw new Error('Invalid filter parameters');
                }

                const data = imageData.data;
                const width = imageData.width;
                const height = imageData.height;

                try {
                    switch (filterType) {
                        case 'grayscale':
                            for (let i = 0; i < data.length; i += 4) {
                                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                                data[i] = avg;
                                data[i + 1] = avg;
                                data[i + 2] = avg;
                            }
                            break;
                        case 'vintage':
                            for (let i = 0; i < data.length; i += 4) {
                                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                                data[i] = Math.min(255, avg * 1.2 * 1.1);
                                data[i + 1] = Math.min(255, avg * 0.9 * 0.9);
                                data[i + 2] = Math.min(255, avg * 0.8 * 0.7);
                            }
                            break;
                        case 'vignette':
                            const centerX = width / 2;
                            const centerY = height / 2;
                            const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
                            const intensity = options.intensity || 1;
                            
                            for (let y = 0; y < height; y++) {
                                for (let x = 0; x < width; x++) {
                                    const dx = x - centerX;
                                    const dy = y - centerY;
                                    const distance = Math.sqrt(dx * dx + dy * dy);
                                    const vignette = Math.pow(1 - distance / maxDistance, 2) * intensity;
                                    
                                    const i = (y * width + x) * 4;
                                    data[i] *= vignette;
                                    data[i + 1] *= vignette;
                                    data[i + 2] *= vignette;
                                }
                            }
                            break;
                        default:
                            throw new Error('Unknown filter type: ' + filterType);
                    }
                    return imageData;
                } catch (error) {
                    throw new Error('Filter application failed: ' + error.message);
                }
            }

            async function compressImage(imageData, quality) {
                if (!imageData || quality === undefined) {
                    throw new Error('Invalid compression parameters');
                }

                try {
                    // Simple compression simulation
                    const data = imageData.data;
                    const compressionFactor = 1 - (quality / 100);
                    
                    for (let i = 0; i < data.length; i += 4) {
                        data[i] = Math.round(data[i] / (1 + compressionFactor)) * (1 + compressionFactor);
                        data[i + 1] = Math.round(data[i + 1] / (1 + compressionFactor)) * (1 + compressionFactor);
                        data[i + 2] = Math.round(data[i + 2] / (1 + compressionFactor)) * (1 + compressionFactor);
                    }
                    
                    return imageData;
                } catch (error) {
                    throw new Error('Compression failed: ' + error.message);
                }
            }

            async function processBatch(operations, imageData) {
                if (!operations || !operations.length || !imageData) {
                    throw new Error('Invalid batch processing parameters');
                }

                try {
                    let processedData = imageData;
                    for (const op of operations) {
                        switch (op.type) {
                            case 'filter':
                                processedData = await applyFilter(processedData, op.filterType, op.options);
                                break;
                            case 'compress':
                                processedData = await compressImage(processedData, op.quality);
                                break;
                            default:
                                throw new Error('Unknown operation type in batch: ' + op.type);
                        }
                    }
                    return processedData;
                } catch (error) {
                    throw new Error('Batch processing failed: ' + error.message);
                }
            }
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        this.worker = new Worker(workerUrl);
        this.objectUrls.add(workerUrl);

        // Set up error handling for worker
        this.worker.onerror = (error) => {
            console.error('Worker error:', error);
            this.handleWorkerError(error);
        };
    }

    handleWorkerError(error) {
        // Log the error
        console.error('Worker error:', error);
        
        // Attempt to restart the worker
        if (this.worker) {
            this.worker.terminate();
            this.initializeWorker();
        }
        
        // Notify any error handlers
        if (this.onError) {
            this.onError(error);
        }
    }

    async loadImage(file) {
        try {
            await this.validateFile(file);
            return new Promise((resolve, reject) => {
                const img = new Image();
                const url = URL.createObjectURL(file);
                this.objectUrls.add(url);

                img.onload = () => {
                    resolve(img);
                };

                img.onerror = () => {
                    this.releaseObjectUrl(url);
                    reject(new Error('Failed to load image'));
                };

                img.src = url;
            });
        } catch (error) {
            throw new Error(`Image loading failed: ${error.message}`);
        }
    }

    async validateFile(file) {
        if (!file) {
            throw new Error('No file provided');
        }

        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            throw new Error('Invalid file type');
        }

        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            throw new Error('File size exceeds limit');
        }
    }

    async convertFormat(file, targetFormat) {
        try {
            const img = await this.loadImage(file);
            this.canvas.width = img.width;
            this.canvas.height = img.height;
            this.ctx.drawImage(img, 0, 0);

            const mimeType = `image/${targetFormat}`;
            const quality = targetFormat === 'jpeg' ? 0.9 : undefined;

            return new Promise((resolve) => {
                this.canvas.toBlob((blob) => {
                    const convertedFile = new File([blob], `converted.${targetFormat}`, { type: mimeType });
                    this.releaseObjectUrl(img.src);
                    resolve(convertedFile);
                }, mimeType, quality);
            });
        } catch (error) {
            console.error('Error converting image:', error);
            throw new Error('Failed to convert image format');
        }
    }

    async resize(file, width, height, maintainAspect = true) {
        try {
            const img = await this.loadImage(file);
            let newWidth = width;
            let newHeight = height;

            if (maintainAspect) {
                const ratio = img.width / img.height;
                if (width) {
                    newHeight = width / ratio;
                } else if (height) {
                    newWidth = height * ratio;
                }
            }

            // Use offscreen canvas for better performance
            const offscreen = new OffscreenCanvas(newWidth, newHeight);
            const ctx = offscreen.getContext('2d');
            ctx.drawImage(img, 0, 0, newWidth, newHeight);

            const blob = await offscreen.convertToBlob({ type: file.type });
            this.releaseObjectUrl(img.src);
            return new File([blob], `resized_${file.name}`, { type: file.type });
        } catch (error) {
            console.error('Error resizing image:', error);
            throw new Error('Failed to resize image');
        }
    }

    releaseObjectUrl(url) {
        if (this.objectUrls.has(url)) {
            URL.revokeObjectURL(url);
            this.objectUrls.delete(url);
        }
    }

    cleanup() {
        // Clean up all object URLs
        this.objectUrls.forEach(url => URL.revokeObjectURL(url));
        this.objectUrls.clear();

        // Terminate worker
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.canvas.width = 0;
        this.canvas.height = 0;
    }

    async crop(file, x, y, width, height) {
        try {
            const img = await this.loadImage(file);
            this.canvas.width = width;
            this.canvas.height = height;
            this.ctx.drawImage(img, x, y, width, height, 0, 0, width, height);

            return new Promise((resolve) => {
                this.canvas.toBlob((blob) => {
                    resolve(new File([blob], `cropped_${file.name}`, { type: file.type }));
                }, file.type);
            });
        } catch (error) {
            console.error('Error cropping image:', error);
            throw new Error('Failed to crop image');
        }
    }

    async rotate(file, degrees) {
        try {
            const img = await this.loadImage(file);
            const radians = (degrees * Math.PI) / 180;
            const sin = Math.abs(Math.sin(radians));
            const cos = Math.abs(Math.cos(radians));

            this.canvas.width = img.height * sin + img.width * cos;
            this.canvas.height = img.height * cos + img.width * sin;

            this.ctx.save();
            this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.rotate(radians);
            this.ctx.drawImage(img, -img.width / 2, -img.height / 2);
            this.ctx.restore();

            return new Promise((resolve) => {
                this.canvas.toBlob((blob) => {
                    resolve(new File([blob], `rotated_${file.name}`, { type: file.type }));
                }, file.type);
            });
        } catch (error) {
            console.error('Error rotating image:', error);
            throw new Error('Failed to rotate image');
        }
    }

    async applyFilter(file, filterType) {
        try {
            const img = await this.loadImage(file);
            this.canvas.width = img.width;
            this.canvas.height = img.height;
            this.ctx.drawImage(img, 0, 0);

            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const data = imageData.data;

            switch (filterType) {
                case 'grayscale':
                    for (let i = 0; i < data.length; i += 4) {
                        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                        data[i] = avg;
                        data[i + 1] = avg;
                        data[i + 2] = avg;
                    }
                    break;
                case 'sepia':
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        data[i] = (r * 0.393) + (g * 0.769) + (b * 0.189);
                        data[i + 1] = (r * 0.349) + (g * 0.686) + (b * 0.168);
                        data[i + 2] = (r * 0.272) + (g * 0.534) + (b * 0.131);
                    }
                    break;
                case 'invert':
                    for (let i = 0; i < data.length; i += 4) {
                        data[i] = 255 - data[i];
                        data[i + 1] = 255 - data[i + 1];
                        data[i + 2] = 255 - data[i + 2];
                    }
                    break;
                case 'blur':
                    // Implement Gaussian blur
                    const kernel = [
                        [1/16, 2/16, 1/16],
                        [2/16, 4/16, 2/16],
                        [1/16, 2/16, 1/16]
                    ];
                    const tempData = new Uint8ClampedArray(data);
                    for (let y = 1; y < this.canvas.height - 1; y++) {
                        for (let x = 1; x < this.canvas.width - 1; x++) {
                            for (let c = 0; c < 3; c++) {
                                let sum = 0;
                                for (let ky = -1; ky <= 1; ky++) {
                                    for (let kx = -1; kx <= 1; kx++) {
                                        const idx = ((y + ky) * this.canvas.width + (x + kx)) * 4 + c;
                                        sum += tempData[idx] * kernel[ky + 1][kx + 1];
                                    }
                                }
                                const idx = (y * this.canvas.width + x) * 4 + c;
                                data[idx] = sum;
                            }
                        }
                    }
                    break;
                case 'sharpen':
                    // Implement sharpening
                    const sharpenKernel = [
                        [0, -1, 0],
                        [-1, 5, -1],
                        [0, -1, 0]
                    ];
                    const tempData2 = new Uint8ClampedArray(data);
                    for (let y = 1; y < this.canvas.height - 1; y++) {
                        for (let x = 1; x < this.canvas.width - 1; x++) {
                            for (let c = 0; c < 3; c++) {
                                let sum = 0;
                                for (let ky = -1; ky <= 1; ky++) {
                                    for (let kx = -1; kx <= 1; kx++) {
                                        const idx = ((y + ky) * this.canvas.width + (x + kx)) * 4 + c;
                                        sum += tempData2[idx] * sharpenKernel[ky + 1][kx + 1];
                                    }
                                }
                                const idx = (y * this.canvas.width + x) * 4 + c;
                                data[idx] = Math.min(255, Math.max(0, sum));
                            }
                        }
                    }
                    break;
                case 'brightness':
                    // Implement brightness adjustment
                    const brightnessFactor = 1.2; // Increase brightness by 20%
                    for (let i = 0; i < data.length; i += 4) {
                        data[i] = Math.min(255, data[i] * brightnessFactor);
                        data[i + 1] = Math.min(255, data[i + 1] * brightnessFactor);
                        data[i + 2] = Math.min(255, data[i + 2] * brightnessFactor);
                    }
                    break;
                case 'contrast':
                    // Implement contrast adjustment
                    const contrastFactor = 1.3; // Increase contrast by 30%
                    const avg = data.reduce((sum, val, i) => (i % 4 < 3) ? sum + val : sum, 0) / (data.length * 0.75);
                    for (let i = 0; i < data.length; i += 4) {
                        for (let j = 0; j < 3; j++) {
                            data[i + j] = Math.min(255, Math.max(0, avg + (data[i + j] - avg) * contrastFactor));
                        }
                    }
                    break;
                case 'vintage':
                    // Apply vintage effect
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        
                        // Desaturate
                        const avg = (r + g + b) / 3;
                        data[i] = avg * 1.2;     // Boost red slightly
                        data[i + 1] = avg * 0.9; // Reduce green
                        data[i + 2] = avg * 0.8; // Reduce blue more
                        
                        // Add sepia tint
                        data[i] = Math.min(255, data[i] * 1.1);
                        data[i + 1] = Math.min(255, data[i + 1] * 0.9);
                        data[i + 2] = Math.min(255, data[i + 2] * 0.7);
                    }
                    break;
                case 'vignette':
                    // Apply vignette effect
                    const centerX = this.canvas.width / 2;
                    const centerY = this.canvas.height / 2;
                    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
                    
                    for (let y = 0; y < this.canvas.height; y++) {
                        for (let x = 0; x < this.canvas.width; x++) {
                            const dx = x - centerX;
                            const dy = y - centerY;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            const vignette = Math.pow(1 - distance / maxDistance, 2);
                            
                            const i = (y * this.canvas.width + x) * 4;
                            data[i] *= vignette;     // Red
                            data[i + 1] *= vignette; // Green
                            data[i + 2] *= vignette; // Blue
                        }
                    }
                    break;
                case 'pixelate':
                    // Apply pixelation effect
                    const pixelSize = 10;
                    for (let y = 0; y < this.canvas.height; y += pixelSize) {
                        for (let x = 0; x < this.canvas.width; x += pixelSize) {
                            // Get the color of the first pixel in the block
                            const i = (y * this.canvas.width + x) * 4;
                            const r = data[i];
                            const g = data[i + 1];
                            const b = data[i + 2];
                            
                            // Fill the entire block with this color
                            for (let py = y; py < Math.min(y + pixelSize, this.canvas.height); py++) {
                                for (let px = x; px < Math.min(x + pixelSize, this.canvas.width); px++) {
                                    const idx = (py * this.canvas.width + px) * 4;
                                    data[idx] = r;
                                    data[idx + 1] = g;
                                    data[idx + 2] = b;
                                }
                            }
                        }
                    }
                    break;
                case 'oil-painting':
                    // Apply oil painting effect
                    const radius = 4;
                    const intensityLevels = 20;
                    const tempData3 = new Uint8ClampedArray(data);
                    
                    for (let y = radius; y < this.canvas.height - radius; y++) {
                        for (let x = radius; x < this.canvas.width - radius; x++) {
                            const intensityCount = new Array(intensityLevels).fill(0);
                            const avgR = new Array(intensityLevels).fill(0);
                            const avgG = new Array(intensityLevels).fill(0);
                            const avgB = new Array(intensityLevels).fill(0);
                            
                            // Sample the surrounding pixels
                            for (let ky = -radius; ky <= radius; ky++) {
                                for (let kx = -radius; kx <= radius; kx++) {
                                    const idx = ((y + ky) * this.canvas.width + (x + kx)) * 4;
                                    const intensity = Math.floor((tempData3[idx] + tempData3[idx + 1] + tempData3[idx + 2]) / 3 / 255 * intensityLevels);
                                    
                                    intensityCount[intensity]++;
                                    avgR[intensity] += tempData3[idx];
                                    avgG[intensity] += tempData3[idx + 1];
                                    avgB[intensity] += tempData3[idx + 2];
                                }
                            }
                            
                            // Find the most common intensity level
                            let maxCount = 0;
                            let maxIndex = 0;
                            for (let i = 0; i < intensityLevels; i++) {
                                if (intensityCount[i] > maxCount) {
                                    maxCount = intensityCount[i];
                                    maxIndex = i;
                                }
                            }
                            
                            // Set the pixel color
                            const i = (y * this.canvas.width + x) * 4;
                            data[i] = avgR[maxIndex] / maxCount;
                            data[i + 1] = avgG[maxIndex] / maxCount;
                            data[i + 2] = avgB[maxIndex] / maxCount;
                        }
                    }
                    break;
                // Add more filters as needed
            }

            this.ctx.putImageData(imageData, 0, 0);

            return new Promise((resolve) => {
                this.canvas.toBlob((blob) => {
                    resolve(new File([blob], `filtered_${file.name}`, { type: file.type }));
                }, file.type);
            });
        } catch (error) {
            console.error('Error applying filter:', error);
            throw new Error('Failed to apply filter');
        }
    }

    async batchConvert(files, targetFormat) {
        return Promise.all(Array.from(files).map(file => this.convertFormat(file, targetFormat)));
    }

    async batchResize(files, width, height, maintainAspect = true) {
        return Promise.all(Array.from(files).map(file => this.resize(file, width, height, maintainAspect)));
    }

    async optimize(file, options = {}) {
        const {
            quality = 0.8,
            maxWidth = 1920,
            maxHeight = 1080,
            format = 'webp'
        } = options;

        try {
            // Resize if needed
            let optimized = file;
            if (img.width > maxWidth || img.height > maxHeight) {
                optimized = await this.resize(file, maxWidth, maxHeight, true);
            }
            
            // Convert to optimal format
            optimized = await this.convertFormat(optimized, format);
            
            // Compress
            return await this.compress(optimized, quality);
        } catch (error) {
            console.error('Optimization failed:', error);
            throw error;
        }
    }

    async batchProcess(files, operations) {
        const results = [];
        for (const file of files) {
            try {
                let processedFile = file;
                for (const op of operations) {
                    switch (op.type) {
                        case 'resize':
                            processedFile = await this.resize(processedFile, op.width, op.height);
                            break;
                        case 'filter':
                            processedFile = await this.applyFilter(processedFile, op.filterType);
                            break;
                        // Add more operations
                    }
                }
                results.push(processedFile);
            } catch (error) {
                console.error(`Error processing ${file.name}:`, error);
            }
        }
        return results;
    }
} 