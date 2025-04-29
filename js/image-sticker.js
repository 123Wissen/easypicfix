export class ImageSticker {
    constructor(options) {
        this.options = options;
        this.files = [];
        this.currentFileIndex = 0;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.selectedSticker = null;
        this.stickers = {};
        this.initializeElements();
        this.initializeEventListeners();
        this.loadStickers();
    }

    initializeElements() {
        // Get DOM elements
        this.inputElement = document.querySelector(this.options.inputElement);
        this.previewElement = document.querySelector(this.options.previewElement);
        this.stickerCategoryElement = document.querySelector(this.options.stickerCategoryElement);
        this.stickerGridElement = document.querySelector(this.options.stickerGridElement);
        this.stickerSizeElement = document.querySelector(this.options.stickerSizeElement);
        this.sizeValueElement = document.querySelector(this.options.sizeValueElement);
        this.stickerOpacityElement = document.querySelector(this.options.stickerOpacityElement);
        this.opacityValueElement = document.querySelector(this.options.opacityValueElement);
        this.stickerRotationElement = document.querySelector(this.options.stickerRotationElement);
        this.rotationValueElement = document.querySelector(this.options.rotationValueElement);
        this.outputFormatElement = document.querySelector(this.options.outputFormatElement);
        this.qualityElement = document.querySelector(this.options.qualityElement);
        this.qualityValueElement = document.querySelector(this.options.qualityValueElement);
        this.preserveMetadataElement = document.querySelector(this.options.preserveMetadataElement);
        this.applyButton = document.querySelector(this.options.applyButton);
        this.progressBar = document.querySelector(this.options.progressBar);
        this.progressText = document.querySelector(this.options.progressText);

        // Hide settings, preview, and progress sections initially
        document.querySelector('.settings-section').style.display = 'none';
        document.querySelector('.preview-section').style.display = 'none';
        document.querySelector('.progress-section').style.display = 'none';
    }

    initializeEventListeners() {
        // File input change event
        this.inputElement.addEventListener('change', (e) => this.handleFiles(e.target.files));

        // Drag and drop events
        const uploadArea = document.querySelector('.upload-area');
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('drag-over');
            this.handleFiles(e.dataTransfer.files);
        });

        // Sticker category change event
        this.stickerCategoryElement.addEventListener('change', () => this.loadStickersForCategory());

        // Settings change events
        this.stickerSizeElement.addEventListener('input', (e) => {
            this.sizeValueElement.textContent = e.target.value;
            this.updatePreview();
        });

        this.stickerOpacityElement.addEventListener('input', (e) => {
            this.opacityValueElement.textContent = e.target.value;
            this.updatePreview();
        });

        this.stickerRotationElement.addEventListener('input', (e) => {
            this.rotationValueElement.textContent = e.target.value;
            this.updatePreview();
        });

        this.qualityElement.addEventListener('input', (e) => {
            this.qualityValueElement.textContent = e.target.value;
        });

        // Apply button click event
        this.applyButton.addEventListener('click', () => this.processImages());
    }

    handleFiles(fileList) {
        // Filter for image files
        this.files = Array.from(fileList).filter(file => file.type.startsWith('image/') && !file.type.includes('gif'));
        
        if (this.files.length > 0) {
            document.querySelector('.settings-section').style.display = 'block';
            document.querySelector('.preview-section').style.display = 'block';
            this.generatePreviews();
        } else {
            this.showError('Please select valid image files (JPG, PNG, or WebP)');
        }
    }

    async generatePreviews() {
        this.previewElement.innerHTML = '';
        
        for (const file of this.files) {
            try {
                const previewContainer = document.createElement('div');
                previewContainer.className = 'col-md-6 preview-item';
                
                const imageContainer = document.createElement('div');
                imageContainer.className = 'preview-container';
                
                const img = document.createElement('img');
                img.src = URL.createObjectURL(file);
                img.className = 'img-fluid';
                
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-btn';
                removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                removeBtn.onclick = () => {
                    this.files = this.files.filter(f => f !== file);
                    previewContainer.remove();
                    if (this.files.length === 0) {
                        document.querySelector('.settings-section').style.display = 'none';
                        document.querySelector('.preview-section').style.display = 'none';
                    }
                };
                
                imageContainer.appendChild(img);
                previewContainer.appendChild(removeBtn);
                previewContainer.appendChild(imageContainer);
                this.previewElement.appendChild(previewContainer);
                
                // Initialize sticker interaction
                this.initializeStickerInteraction(imageContainer);
                
                // Wait for image to load before proceeding
                await new Promise((resolve) => {
                    img.onload = resolve;
                });
            } catch (error) {
                console.error('Error generating preview:', error);
                this.showError('Error generating preview');
            }
        }
    }

    async loadStickers() {
        // Define sticker categories and their paths
        this.stickerCategories = {
            emoji: '/assets/stickers/emoji',
            decorative: '/assets/stickers/decorative',
            animals: '/assets/stickers/animals',
            food: '/assets/stickers/food',
            hearts: '/assets/stickers/hearts',
            text: '/assets/stickers/text',
            frames: '/assets/stickers/frames',
            seasonal: '/assets/stickers/seasonal'
        };
        
        // Load initial category
        await this.loadStickersForCategory();
    }

    async loadStickersForCategory() {
        const category = this.stickerCategoryElement.value;
        this.stickerGridElement.innerHTML = '';
        
        try {
            // In a real implementation, you would load stickers from your assets
            // For this example, we'll create some placeholder stickers
            const stickerUrls = await this.getStickersForCategory(category);
            
            stickerUrls.forEach(url => {
                const stickerItem = document.createElement('div');
                stickerItem.className = 'sticker-item';
                
                const img = document.createElement('img');
                img.src = url;
                img.alt = 'Sticker';
                
                stickerItem.appendChild(img);
                stickerItem.addEventListener('click', () => {
                    this.selectedSticker = url;
                    this.addStickerToPreview();
                });
                
                this.stickerGridElement.appendChild(stickerItem);
            });
        } catch (error) {
            console.error('Error loading stickers:', error);
            this.showError('Error loading stickers');
        }
    }

    async getStickersForCategory(category) {
        // In a real implementation, this would fetch stickers from your server
        // For now, return placeholder URLs
        return [
            `/assets/stickers/${category}/sticker1.png`,
            `/assets/stickers/${category}/sticker2.png`,
            `/assets/stickers/${category}/sticker3.png`
        ];
    }

    addStickerToPreview() {
        if (!this.selectedSticker) return;
        
        const previewContainers = document.querySelectorAll('.preview-container');
        previewContainers.forEach(container => {
            const stickerPreview = document.createElement('div');
            stickerPreview.className = 'sticker-preview';
            
            const img = document.createElement('img');
            img.src = this.selectedSticker;
            img.alt = 'Sticker Preview';
            
            stickerPreview.appendChild(img);
            container.appendChild(stickerPreview);
            
            this.initializeStickerDrag(stickerPreview);
        });
    }

    initializeStickerInteraction(container) {
        interact(container)
            .dropzone({
                accept: '.sticker-preview',
                overlap: 0.75,
                ondropactivate: (event) => {
                    event.target.classList.add('drop-active');
                },
                ondropdeactivate: (event) => {
                    event.target.classList.remove('drop-active');
                }
            });
    }

    initializeStickerDrag(element) {
        const size = this.stickerSizeElement.value;
        const rotation = this.stickerRotationElement.value;
        
        interact(element)
            .draggable({
                inertia: true,
                modifiers: [
                    interact.modifiers.restrictRect({
                        restriction: 'parent',
                        endOnly: true
                    })
                ],
                autoScroll: true,
                listeners: {
                    move: (event) => {
                        const target = event.target;
                        const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                        const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
                        
                        target.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${size / 100})`;
                        target.style.opacity = this.stickerOpacityElement.value / 100;
                        
                        target.setAttribute('data-x', x);
                        target.setAttribute('data-y', y);
                    }
                }
            })
            .resizable({
                edges: { left: true, right: true, bottom: true, top: true },
                preserveAspectRatio: true,
                listeners: {
                    move: (event) => {
                        const target = event.target;
                        let x = parseFloat(target.getAttribute('data-x')) || 0;
                        let y = parseFloat(target.getAttribute('data-y')) || 0;
                        
                        target.style.width = `${event.rect.width}px`;
                        target.style.height = `${event.rect.height}px`;
                        
                        x += event.deltaRect.left;
                        y += event.deltaRect.top;
                        
                        target.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
                        target.style.opacity = this.stickerOpacityElement.value / 100;
                        
                        target.setAttribute('data-x', x);
                        target.setAttribute('data-y', y);
                    }
                }
            });
    }

    updatePreview() {
        const stickers = document.querySelectorAll('.sticker-preview');
        const size = this.stickerSizeElement.value;
        const rotation = this.stickerRotationElement.value;
        const opacity = this.stickerOpacityElement.value;
        
        stickers.forEach(sticker => {
            const x = parseFloat(sticker.getAttribute('data-x')) || 0;
            const y = parseFloat(sticker.getAttribute('data-y')) || 0;
            
            sticker.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${size / 100})`;
            sticker.style.opacity = opacity / 100;
        });
    }

    async processImages() {
        if (this.files.length === 0) return;

        const settings = this.getSettings();
        const processedImages = [];
        let progress = 0;

        document.querySelector('.progress-section').style.display = 'block';
        this.updateProgress(0);

        try {
            for (const file of this.files) {
                const processedImage = await this.processImage(file, settings);
                processedImages.push({
                    blob: processedImage,
                    filename: this.getOutputFilename(file.name, settings)
                });
                
                progress += 100 / this.files.length;
                this.updateProgress(progress);
            }

            await this.downloadResults(processedImages);
            this.updateProgress(100);
            
            setTimeout(() => {
                document.querySelector('.progress-section').style.display = 'none';
            }, 1000);
        } catch (error) {
            console.error('Error processing images:', error);
            this.showError('Error processing images');
        }
    }

    getSettings() {
        return {
            size: this.stickerSizeElement.value,
            opacity: this.stickerOpacityElement.value,
            rotation: this.stickerRotationElement.value,
            outputFormat: this.outputFormatElement.value,
            quality: this.qualityElement.value / 100,
            preserveMetadata: this.preserveMetadataElement.checked
        };
    }

    async processImage(file, settings) {
        return new Promise(async (resolve, reject) => {
            try {
                const img = new Image();
                img.src = URL.createObjectURL(file);
                
                img.onload = () => {
                    // Set canvas dimensions to match image
                    this.canvas.width = img.width;
                    this.canvas.height = img.height;
                    
                    // Draw original image
                    this.ctx.drawImage(img, 0, 0);
                    
                    // Get sticker positions and apply them
                    const previewContainer = document.querySelector('.preview-container');
                    const stickers = previewContainer.querySelectorAll('.sticker-preview');
                    
                    stickers.forEach(async (sticker) => {
                        const stickerImg = sticker.querySelector('img');
                        const rect = sticker.getBoundingClientRect();
                        const containerRect = previewContainer.getBoundingClientRect();
                        
                        // Calculate relative position and size
                        const x = (rect.left - containerRect.left) * (img.width / containerRect.width);
                        const y = (rect.top - containerRect.top) * (img.height / containerRect.height);
                        const width = rect.width * (img.width / containerRect.width);
                        const height = rect.height * (img.height / containerRect.height);
                        
                        // Get transform values
                        const transform = sticker.style.transform;
                        const rotation = parseFloat(transform.match(/rotate\((.*?)deg\)/)?.[1] || 0);
                        const scale = parseFloat(transform.match(/scale\((.*?)\)/)?.[1] || 1);
                        const opacity = parseFloat(sticker.style.opacity || 1);
                        
                        // Apply sticker with transformations
                        this.ctx.save();
                        this.ctx.globalAlpha = opacity;
                        this.ctx.translate(x + width/2, y + height/2);
                        this.ctx.rotate(rotation * Math.PI / 180);
                        this.ctx.scale(scale, scale);
                        this.ctx.drawImage(stickerImg, -width/2, -height/2, width, height);
                        this.ctx.restore();
                    });
                    
                    // Convert canvas to blob
                    const mimeType = this.getMimeType(settings.outputFormat, file.type);
                    this.canvas.toBlob(
                        (blob) => resolve(blob),
                        mimeType,
                        settings.quality
                    );
                    
                    URL.revokeObjectURL(img.src);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    getMimeType(outputFormat, originalType) {
        switch (outputFormat) {
            case 'jpg':
                return 'image/jpeg';
            case 'png':
                return 'image/png';
            case 'webp':
                return 'image/webp';
            case 'same':
            default:
                return originalType;
        }
    }

    getOutputFilename(originalName, settings) {
        const extension = settings.outputFormat === 'same' 
            ? originalName.split('.').pop() 
            : settings.outputFormat;
        const baseName = originalName.split('.').slice(0, -1).join('.');
        return `${baseName}_with_stickers.${extension}`;
    }

    async downloadResults(processedImages) {
        if (processedImages.length === 1) {
            // Download single image
            const link = document.createElement('a');
            link.href = URL.createObjectURL(processedImages[0].blob);
            link.download = processedImages[0].filename;
            link.click();
            URL.revokeObjectURL(link.href);
        } else {
            // Create ZIP file for multiple images
            const zip = new JSZip();
            
            processedImages.forEach((image, index) => {
                zip.file(image.filename, image.blob);
            });
            
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = 'images_with_stickers.zip';
            link.click();
            URL.revokeObjectURL(link.href);
        }
    }

    updateProgress(value) {
        this.progressBar.style.width = `${value}%`;
        this.progressText.textContent = `Processing... ${Math.round(value)}%`;
    }

    showError(message) {
        // You can implement your own error display logic here
        alert(message);
    }
} 