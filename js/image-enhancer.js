export class ImageEnhancer {
    constructor(options) {
        this.options = options;
        this.files = [];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.inputElement = document.querySelector(this.options.inputElement);
        this.previewElement = document.querySelector(this.options.previewElement);
        this.enhancementModeElement = document.querySelector(this.options.enhancementModeElement);
        this.strengthElement = document.querySelector(this.options.strengthElement);
        this.strengthValueElement = document.querySelector(this.options.strengthValueElement);
        this.upscaleFactorElement = document.querySelector(this.options.upscaleFactorElement);
        this.outputFormatElement = document.querySelector(this.options.outputFormatElement);
        this.faceEnhancementElement = document.querySelector(this.options.faceEnhancementElement);
        this.noiseReductionElement = document.querySelector(this.options.noiseReductionElement);
        this.compareButton = document.querySelector(this.options.compareButton);
        this.clearButton = document.querySelector(this.options.clearButton);
        this.enhanceButton = document.querySelector(this.options.enhanceButton);
        this.downloadButton = document.querySelector('#download-btn');
        this.progressBar = document.querySelector(this.options.progressBar);
        this.progressText = document.querySelector(this.options.progressText);

        // Show settings and preview sections
        this.settingsSection = document.querySelector('.settings-section');
        this.previewSection = document.querySelector('.preview-section');
        this.progressSection = document.querySelector('.progress-section');
        
        // Store enhanced images
        this.enhancedImages = [];
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

        // Debounce slider updates
        const debouncedUpdate = this.debounce(() => {
            this.strengthValueElement.textContent = this.strengthElement.value;
            this.updatePreviews();
        }, 200);

        this.strengthElement.addEventListener('input', debouncedUpdate);

        // Compare button click event
        this.compareButton.addEventListener('click', () => {
            const previewContainers = document.querySelectorAll('.preview-container');
            previewContainers.forEach(container => {
                container.classList.toggle('split');
                this.updateCompareView(container);
            });
        });

        // Clear button click event
        this.clearButton.addEventListener('click', () => {
            this.files = [];
            this.enhancedImages = [];
            this.previewElement.innerHTML = '';
            this.settingsSection.style.display = 'none';
            this.previewSection.style.display = 'none';
            this.downloadButton.style.display = 'none';
        });

        // Enhance button click event
        this.enhanceButton.addEventListener('click', () => this.enhanceImages());

        // Download button click event
        this.downloadButton.addEventListener('click', () => this.downloadEnhancedImages());

        // Debounce settings changes
        const debouncedSettingsUpdate = this.debounce(() => this.updatePreviews(), 300);
        ['enhancement-mode', 'upscale-factor', 'face-enhancement', 'noise-reduction'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', debouncedSettingsUpdate);
            }
        });
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
        // Limit number of files for better performance
        const maxFiles = 10;
        const filesToProcess = Array.from(files).slice(0, maxFiles);
        
        filesToProcess.forEach(file => {
            if (!this.supportedTypes.includes(file.type)) {
                this.showError(`Unsupported file type: ${file.name}`);
                return;
            }
            if (file.size > this.maxFileSize) {
                this.showError(`File too large: ${file.name} (max 10MB)`);
                return;
            }
            this.files.push(file);
        });

        if (this.files.length > 0) {
            if (this.files.length > maxFiles) {
                this.showError(`Maximum ${maxFiles} files can be processed at once`);
                this.files = this.files.slice(0, maxFiles);
            }
            this.settingsSection.style.display = 'block';
            this.previewSection.style.display = 'block';
            this.generatePreviews();
        }
    }

    async generatePreviews() {
        this.previewElement.innerHTML = '';
        
        for (const file of this.files) {
            const previewContainer = document.createElement('div');
            previewContainer.className = 'col-md-6 preview-item';

            const container = document.createElement('div');
            container.className = 'preview-container';

            // Original image
            const original = document.createElement('img');
            original.className = 'img-fluid rounded original';
            
            // Enhanced image (placeholder)
            const enhanced = document.createElement('img');
            enhanced.className = 'img-fluid rounded enhanced';

            const reader = new FileReader();
            reader.onload = async (e) => {
                original.src = e.target.result;
                enhanced.src = e.target.result;
                await this.applyEnhancementPreview(enhanced);
            };
            reader.readAsDataURL(file);

            // Remove button
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

            // Preview labels
            const originalLabel = document.createElement('div');
            originalLabel.className = 'preview-label original-label';
            originalLabel.textContent = 'Original';

            const enhancedLabel = document.createElement('div');
            enhancedLabel.className = 'preview-label enhanced-label';
            enhancedLabel.textContent = 'Enhanced';

            // Preview divider
            const divider = document.createElement('div');
            divider.className = 'preview-divider';

            container.appendChild(original);
            container.appendChild(enhanced);
            container.appendChild(originalLabel);
            container.appendChild(enhancedLabel);
            container.appendChild(divider);
            previewContainer.appendChild(container);
            previewContainer.appendChild(removeBtn);
            this.previewElement.appendChild(previewContainer);

            // Initialize comparison slider
            this.initializeComparisonSlider(container);
        }
    }

    initializeComparisonSlider(container) {
        let isDragging = false;
        let startX;
        let startLeft;

        container.addEventListener('mousedown', (e) => {
            if (!container.classList.contains('split')) return;
            isDragging = true;
            startX = e.pageX;
            startLeft = parseInt(container.querySelector('.enhanced').style.width || '50');
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            
            const rect = container.getBoundingClientRect();
            const x = e.pageX - rect.left;
            const width = rect.width;
            
            let percent = (x / width) * 100;
            percent = Math.max(0, Math.min(100, percent));
            
            this.updateCompareView(container, percent);
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    updateCompareView(container, percent = 50) {
        const enhanced = container.querySelector('.enhanced');
        if (container.classList.contains('split')) {
            enhanced.style.width = `${percent}%`;
            enhanced.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
            container.querySelector('.preview-divider').style.left = `${percent}%`;
        } else {
            enhanced.style.width = '100%';
            enhanced.style.clipPath = 'none';
        }
    }

    async updatePreviews() {
        const enhancedImages = document.querySelectorAll('.enhanced');
        for (const img of enhancedImages) {
            await this.applyEnhancementPreview(img);
        }
    }

    async applyEnhancementPreview(img) {
        // Reduce preview quality for better performance
        const settings = this.getSettings();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Create a temporary image to load the original
        const tempImg = new Image();
        tempImg.src = img.src;

        await new Promise((resolve) => {
            tempImg.onload = () => {
                // Scale down preview for better performance
                const maxPreviewSize = 800;
                let scale = 1;
                
                if (tempImg.width > maxPreviewSize || tempImg.height > maxPreviewSize) {
                    scale = Math.min(maxPreviewSize / tempImg.width, maxPreviewSize / tempImg.height);
                }

                // Set canvas size with scale
                canvas.width = tempImg.width * scale;
                canvas.height = tempImg.height * scale;

                // Draw and process the image
                ctx.drawImage(tempImg, 0, 0, canvas.width, canvas.height);
                
                // Simplified preview effects for better performance
                this.applySimplePreviewEffects(ctx, settings);

                // Update the preview image
                img.src = canvas.toDataURL(this.getMimeType(settings.outputFormat), 0.8);
                resolve();
            };
        });
    }

    applySimplePreviewEffects(ctx, settings) {
        const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
        const data = imageData.data;
        const strength = settings.strength / 100;

        // Simplified preview effects
        for (let i = 0; i < data.length; i += 16) { // Process every 4th pixel for speed
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Basic enhancement
            const brightness = 1 + (strength * 0.5);
            data[i] = Math.min(255, r * brightness);
            data[i + 1] = Math.min(255, g * brightness);
            data[i + 2] = Math.min(255, b * brightness);
        }

        ctx.putImageData(imageData, 0, 0);
    }

    applyEnhancementEffects(ctx, settings) {
        const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
        const data = imageData.data;
        const strength = settings.strength / 100;

        switch (settings.enhancementMode) {
            case 'quality':
                this.applyQualityBoost(data, strength);
                break;
            case 'detail':
                this.applyDetailEnhancement(data, strength);
                break;
            case 'restoration':
                this.applyPhotoRestoration(data, strength);
                break;
            case 'hdr':
                this.applyHDREffect(data, strength);
                break;
            default: // auto
                this.applyAutoEnhancement(data, strength);
        }

        if (settings.noiseReduction) {
            this.applyNoiseReduction(data, strength);
        }

        if (settings.faceEnhancement) {
            this.applyFaceEnhancement(data, strength);
        }

        // Apply final contrast and brightness adjustment
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Enhance contrast
            const brightness = 1 + (strength * 0.3);
            const contrast = 1 + (strength * 0.5);
            
            data[i] = Math.min(255, Math.max(0, (r - 128) * contrast + 128) * brightness);
            data[i + 1] = Math.min(255, Math.max(0, (g - 128) * contrast + 128) * brightness);
            data[i + 2] = Math.min(255, Math.max(0, (b - 128) * contrast + 128) * brightness);
        }

        ctx.putImageData(imageData, 0, 0);
    }

    applyQualityBoost(data, strength) {
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Convert to HSL
            const [h, s, l] = this.rgbToHsl(r, g, b);

            // Enhance saturation and contrast
            const newS = Math.min(1, s + (0.3 * strength));
            const newL = l + ((l < 0.5 ? 0.2 : -0.2) * strength);

            // Convert back to RGB
            const [newR, newG, newB] = this.hslToRgb(h, newS, newL);

            // Apply sharpening
            const sharpness = 1 + (strength * 0.5);
            data[i] = Math.min(255, newR * sharpness);
            data[i + 1] = Math.min(255, newG * sharpness);
            data[i + 2] = Math.min(255, newB * sharpness);
        }
    }

    applyDetailEnhancement(data, strength) {
        const width = Math.sqrt(data.length / 4);
        const height = width;
        const kernel = [
            [-1, -1, -1],
            [-1,  9, -1],
            [-1, -1, -1]
        ];

        this.applyConvolution(data, width, height, kernel, strength);
    }

    applyPhotoRestoration(data, strength) {
        for (let i = 0; i < data.length; i += 4) {
            // Reduce color cast and enhance contrast
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const avg = (r + g + b) / 3;
            data[i] = r + (avg - r) * strength;
            data[i + 1] = g + (avg - g) * strength;
            data[i + 2] = b + (avg - b) * strength;
        }
    }

    applyHDREffect(data, strength) {
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Convert to HSL
            const [h, s, l] = this.rgbToHsl(r, g, b);

            // Apply HDR-like effect
            const newL = l < 0.5 
                ? l * (1 - strength * 0.5)
                : l + (1 - l) * strength;

            // Convert back to RGB
            const [newR, newG, newB] = this.hslToRgb(h, s, newL);

            data[i] = newR;
            data[i + 1] = newG;
            data[i + 2] = newB;
        }
    }

    applyAutoEnhancement(data, strength) {
        // Analyze image and apply appropriate enhancements
        const stats = this.analyzeImage(data);
        
        if (stats.contrast < 0.5) {
            this.applyQualityBoost(data, strength);
        }
        if (stats.sharpness < 0.5) {
            this.applyDetailEnhancement(data, strength * 0.5);
        }
        if (stats.noise > 0.5) {
            this.applyNoiseReduction(data, strength);
        }
    }

    applyNoiseReduction(data, strength) {
        const width = Math.sqrt(data.length / 4);
        const height = width;
        const radius = Math.ceil(strength * 2);
        
        // Apply Gaussian blur selectively to noisy areas
        for (let y = radius; y < height - radius; y++) {
            for (let x = radius; x < width - radius; x++) {
                const i = (y * width + x) * 4;
                if (this.isNoisy(data, i, width)) {
                    this.applyGaussianBlur(data, i, width, radius);
                }
            }
        }
    }

    applyFaceEnhancement(data, strength) {
        // In a real implementation, this would use a face detection model
        // For this example, we'll just apply skin tone enhancement
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            if (this.isSkinTone(r, g, b)) {
                // Soften skin tones
                const smoothed = this.smoothSkinTone(r, g, b, strength);
                data[i] = smoothed.r;
                data[i + 1] = smoothed.g;
                data[i + 2] = smoothed.b;
            }
        }
    }

    async enhanceImages() {
        try {
            this.showProgress();
            this.enhanceButton.disabled = true;
            this.downloadButton.style.display = 'none';
            this.enhancedImages = [];

            const settings = this.getSettings();
            const total = this.files.length;

            for (let i = 0; i < total; i++) {
                const file = this.files[i];
                this.updateProgress((i / total) * 100, `Enhancing image ${i + 1} of ${total}...`);
                
                // Get the enhanced image from the preview
                const previewContainer = this.previewElement.children[i];
                const enhancedImg = previewContainer.querySelector('.enhanced');
                
                // Convert the enhanced preview to a blob
                const enhancedBlob = await this.getEnhancedBlob(enhancedImg, file, settings);
                
                this.enhancedImages.push({
                    blob: enhancedBlob,
                    filename: this.getOutputFilename(file.name, settings)
                });
            }

            this.updateProgress(100, 'Enhancement complete!');
            this.downloadButton.style.display = 'inline-block';
            this.showSuccess('Images enhanced successfully!');
        } catch (error) {
            console.error('Enhancement error:', error);
            this.showError('Error enhancing images. Please try again.');
        } finally {
            this.enhanceButton.disabled = false;
            this.hideProgress();
        }
    }

    async getEnhancedBlob(enhancedImg, originalFile, settings) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                try {
                    // Use original dimensions
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    // Draw the enhanced image
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    // Apply final enhancement
                    this.applyEnhancementEffects(ctx, settings);
                    
                    // Convert to blob
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                resolve(blob);
                            } else {
                                reject(new Error('Failed to create enhanced image blob'));
                            }
                        },
                        this.getMimeType(settings.outputFormat),
                        0.95 // High quality for final output
                    );
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => reject(new Error('Failed to load enhanced image'));
            img.src = enhancedImg.src;
        });
    }

    async downloadEnhancedImages() {
        if (this.enhancedImages.length === 0) {
            this.showError('No enhanced images to download.');
            return;
        }

        if (this.enhancedImages.length === 1) {
            // Download single image
            const { blob, filename } = this.enhancedImages[0];
            this.downloadFile(blob, filename);
        } else {
            // Download multiple images as ZIP
            const zip = new JSZip();
            
            this.enhancedImages.forEach(({ blob, filename }, index) => {
                zip.file(filename, blob);
            });
            
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            this.downloadFile(zipBlob, 'enhanced_images.zip');
        }
    }

    getSettings() {
        return {
            enhancementMode: this.enhancementModeElement.value,
            strength: parseInt(this.strengthElement.value),
            upscaleFactor: this.upscaleFactorElement.value,
            outputFormat: this.outputFormatElement.value,
            faceEnhancement: this.faceEnhancementElement.checked,
            noiseReduction: this.noiseReductionElement.checked
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
        const format = settings.outputFormat === 'same' 
            ? originalName.split('.').pop()
            : settings.outputFormat;
        return `${baseName}-enhanced.${format}`;
    }

    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Image analysis and processing utilities
    analyzeImage(data) {
        let totalBrightness = 0;
        let totalContrast = 0;
        let totalNoise = 0;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const brightness = (r + g + b) / 3 / 255;
            totalBrightness += brightness;

            if (i > 0) {
                const prevR = data[i - 4];
                const prevG = data[i - 3];
                const prevB = data[i - 2];
                const diff = Math.abs(r - prevR) + Math.abs(g - prevG) + Math.abs(b - prevB);
                totalContrast += diff;
                totalNoise += diff > 50 ? 1 : 0;
            }
        }

        const pixels = data.length / 4;
        return {
            brightness: totalBrightness / pixels,
            contrast: totalContrast / (pixels * 765), // 765 = 255 * 3
            noise: totalNoise / pixels,
            sharpness: totalContrast / (pixels * 765)
        };
    }

    isNoisy(data, index, width) {
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];

        const neighbors = [
            index - width * 4 - 4,
            index - width * 4,
            index - width * 4 + 4,
            index - 4,
            index + 4,
            index + width * 4 - 4,
            index + width * 4,
            index + width * 4 + 4
        ];

        let totalDiff = 0;
        neighbors.forEach(ni => {
            if (ni >= 0 && ni < data.length) {
                totalDiff += Math.abs(r - data[ni]) +
                            Math.abs(g - data[ni + 1]) +
                            Math.abs(b - data[ni + 2]);
            }
        });

        return totalDiff > 200;
    }

    applyGaussianBlur(data, index, width, radius) {
        const kernel = this.generateGaussianKernel(radius);
        const channels = [0, 1, 2];

        channels.forEach(c => {
            let sum = 0;
            let weight = 0;

            for (let y = -radius; y <= radius; y++) {
                for (let x = -radius; x <= radius; x++) {
                    const idx = index + (y * width + x) * 4;
                    if (idx >= 0 && idx < data.length) {
                        const w = kernel[y + radius][x + radius];
                        sum += data[idx + c] * w;
                        weight += w;
                    }
                }
            }

            data[idx + c] = sum / weight;
        });
    }

    generateGaussianKernel(radius) {
        const size = radius * 2 + 1;
        const kernel = Array(size).fill().map(() => Array(size).fill(0));
        const sigma = radius / 2;

        for (let y = -radius; y <= radius; y++) {
            for (let x = -radius; x <= radius; x++) {
                const exponent = -(x * x + y * y) / (2 * sigma * sigma);
                kernel[y + radius][x + radius] = Math.exp(exponent) / (2 * Math.PI * sigma * sigma);
            }
        }

        return kernel;
    }

    isSkinTone(r, g, b) {
        // Simple skin tone detection
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        return r > 95 && g > 40 && b > 20 && 
               r > g && r > b && 
               max - min > 15 && 
               Math.abs(r - g) > 15;
    }

    smoothSkinTone(r, g, b, strength) {
        // Soften skin tones while preserving detail
        const avg = (r + g + b) / 3;
        const amount = strength * 0.5;
        return {
            r: r + (avg - r) * amount,
            g: g + (avg - g) * amount,
            b: b + (avg - b) * amount
        };
    }

    applyConvolution(data, width, height, kernel, strength) {
        const tempData = new Uint8ClampedArray(data);
        const kSize = kernel.length;
        const kRadius = Math.floor(kSize / 2);

        for (let y = kRadius; y < height - kRadius; y++) {
            for (let x = kRadius; x < width - kRadius; x++) {
                const idx = (y * width + x) * 4;
                const channels = [0, 1, 2];

                channels.forEach(c => {
                    let sum = 0;
                    for (let ky = 0; ky < kSize; ky++) {
                        for (let kx = 0; kx < kSize; kx++) {
                            const px = x + kx - kRadius;
                            const py = y + ky - kRadius;
                            const pidx = (py * width + px) * 4;
                            sum += tempData[pidx + c] * kernel[ky][kx];
                        }
                    }
                    data[idx + c] = tempData[idx + c] + (sum - tempData[idx + c]) * strength;
                });
            }
        }
    }

    rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }

            h /= 6;
        }

        return [h, s, l];
    }

    hslToRgb(h, s, l) {
        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;

            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return [
            Math.round(r * 255),
            Math.round(g * 255),
            Math.round(b * 255)
        ];
    }

    showProgress() {
        this.progressSection.style.display = 'block';
        this.enhanceButton.disabled = true;
    }

    hideProgress() {
        this.progressSection.style.display = 'none';
        this.enhanceButton.disabled = false;
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

    // Debounce preview updates
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
} 