export class PDFConverter {
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
        this.pageSizeElement = document.querySelector(this.options.pageSizeElement);
        this.orientationElement = document.querySelector(this.options.orientationElement);
        this.qualityElement = document.querySelector(this.options.qualityElement);
        this.qualityValueElement = document.querySelector(this.options.qualityValueElement);
        this.imageFitElement = document.querySelector(this.options.imageFitElement);
        this.marginElement = document.querySelector(this.options.marginElement);
        this.imagesPerPageElement = document.querySelector(this.options.imagesPerPageElement);
        this.compressPdfElement = document.querySelector(this.options.compressPdfElement);
        this.reorderButton = document.querySelector(this.options.reorderButton);
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

        // Reorder button
        this.reorderButton?.addEventListener('click', () => {
            const previewSection = this.previewElement.closest('.preview-section');
            previewSection.classList.toggle('reorder-active');
            this.initializeDragAndDrop(previewSection.classList.contains('reorder-active'));
        });

        // Convert button
        this.convertButton?.addEventListener('click', () => this.processImages());
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
                preview.setAttribute('data-index', index);
                preview.innerHTML = `
                    <div class="preview-item">
                        <button class="remove-btn" onclick="this.closest('.col-md-4').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                        <button class="drag-handle">
                            <i class="fas fa-grip-vertical"></i>
                        </button>
                        <div class="card">
                            <img src="${e.target.result}" class="card-img-top" alt="Preview">
                            <div class="card-body">
                                <p class="card-text text-truncate">${file.name}</p>
                            </div>
                        </div>
                    </div>
                `;
                this.previewElement.appendChild(preview);
            };
            reader.readAsDataURL(file);
        });
    }

    initializeDragAndDrop(enable) {
        const items = this.previewElement.children;
        Array.from(items).forEach(item => {
            if (enable) {
                item.draggable = true;
                item.addEventListener('dragstart', this.handleDragStart.bind(this));
                item.addEventListener('dragover', this.handleDragOver.bind(this));
                item.addEventListener('drop', this.handleDrop.bind(this));
                item.addEventListener('dragend', this.handleDragEnd.bind(this));
            } else {
                item.draggable = false;
                item.removeEventListener('dragstart', this.handleDragStart.bind(this));
                item.removeEventListener('dragover', this.handleDragOver.bind(this));
                item.removeEventListener('drop', this.handleDrop.bind(this));
                item.removeEventListener('dragend', this.handleDragEnd.bind(this));
            }
        });
    }

    handleDragStart(e) {
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', e.target.getAttribute('data-index'));
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const draggingItem = this.previewElement.querySelector('.dragging');
        const currentItem = e.target.closest('.col-md-4');
        if (draggingItem && currentItem && draggingItem !== currentItem) {
            const items = [...this.previewElement.children];
            const draggingIndex = items.indexOf(draggingItem);
            const currentIndex = items.indexOf(currentItem);
            if (draggingIndex < currentIndex) {
                currentItem.parentNode.insertBefore(draggingItem, currentItem.nextSibling);
            } else {
                currentItem.parentNode.insertBefore(draggingItem, currentItem);
            }
        }
    }

    handleDrop(e) {
        e.preventDefault();
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        this.updateFileOrder();
    }

    updateFileOrder() {
        const newFiles = [];
        const items = this.previewElement.children;
        Array.from(items).forEach(item => {
            const index = parseInt(item.getAttribute('data-index'));
            newFiles.push(this.files[index]);
        });
        this.files = newFiles;
    }

    async processImages() {
        try {
            document.querySelector('.progress-section').style.display = 'block';
            this.updateProgress(0);

            const settings = this.getSettings();
            const { PDFDocument, PageSizes, rgb } = PDFLib;
            const pdfDoc = await PDFDocument.create();

            // Set page size
            const pageSize = this.getPageSize(settings.pageSize);
            const totalImages = this.files.length;
            let currentPage = null;
            let currentImageOnPage = 0;

            for (let i = 0; i < totalImages; i++) {
                const progress = (i / totalImages) * 100;
                this.updateProgress(progress);
                this.progressText.textContent = `Processing image ${i + 1} of ${totalImages}...`;

                // Create new page if needed
                if (currentImageOnPage === 0) {
                    currentPage = pdfDoc.addPage(pageSize);
                    if (settings.orientation === 'landscape') {
                        currentPage.setRotation(degrees(90));
                    }
                }

                // Process and embed image
                const imageBytes = await this.processImage(this.files[i], settings);
                let image;
                if (this.files[i].type === 'image/jpeg') {
                    image = await pdfDoc.embedJpg(imageBytes);
                } else {
                    image = await pdfDoc.embedPng(imageBytes);
                }

                // Calculate image dimensions and position
                const { width, height } = this.calculateImageDimensions(
                    image,
                    currentPage,
                    settings,
                    currentImageOnPage,
                    settings.imagesPerPage
                );

                // Draw image
                currentPage.drawImage(image, {
                    x: width.x,
                    y: height.y,
                    width: width.width,
                    height: height.height,
                });

                currentImageOnPage++;
                if (currentImageOnPage >= settings.imagesPerPage) {
                    currentImageOnPage = 0;
                }
            }

            // Save PDF
            const pdfBytes = await pdfDoc.save({
                useObjectStreams: false,
                addDefaultPage: false,
                compress: settings.compress
            });

            // Download PDF
            this.downloadPDF(pdfBytes);

            this.updateProgress(100);
            this.progressText.textContent = 'PDF created successfully!';

            setTimeout(() => {
                document.querySelector('.progress-section').style.display = 'none';
            }, 2000);

        } catch (error) {
            console.error('Error creating PDF:', error);
            this.showError('An error occurred while creating the PDF.');
        }
    }

    getSettings() {
        return {
            pageSize: this.pageSizeElement.value,
            orientation: this.orientationElement.value,
            quality: parseInt(this.qualityElement.value) / 100,
            imageFit: this.imageFitElement.value,
            margin: parseInt(this.marginElement.value),
            imagesPerPage: parseInt(this.imagesPerPageElement.value),
            compress: this.compressPdfElement.checked
        };
    }

    getPageSize(size) {
        const sizes = {
            'a4': PageSizes.A4,
            'letter': PageSizes.Letter,
            'legal': PageSizes.Legal,
            'a3': PageSizes.A3,
            'a5': PageSizes.A5
        };
        return sizes[size] || PageSizes.A4;
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

                        // Draw and process image
                        this.ctx.drawImage(img, 0, 0);
                        
                        // Convert to blob
                        this.canvas.toBlob(
                            (blob) => {
                                const reader = new FileReader();
                                reader.onloadend = () => resolve(new Uint8Array(reader.result));
                                reader.readAsArrayBuffer(blob);
                            },
                            'image/jpeg',
                            settings.quality
                        );
                    } catch (error) {
                        reject(error);
                    }
                };
                img.src = e.target.result;
            };
                reader.readAsDataURL(file);
        });
    }

    calculateImageDimensions(image, page, settings, currentImage, imagesPerPage) {
        const pageWidth = page.getWidth();
        const pageHeight = page.getHeight();
        const margin = settings.margin;
        
        let width, height, x, y;
        
        if (imagesPerPage === 1) {
            // Single image per page
            if (settings.imageFit === 'contain') {
                const ratio = Math.min(
                    (pageWidth - margin * 2) / image.width,
                    (pageHeight - margin * 2) / image.height
                );
                width = image.width * ratio;
                height = image.height * ratio;
            } else if (settings.imageFit === 'cover') {
                const ratio = Math.max(
                    (pageWidth - margin * 2) / image.width,
                    (pageHeight - margin * 2) / image.height
                );
                width = image.width * ratio;
                height = image.height * ratio;
            } else {
                width = image.width;
                height = image.height;
            }
            
            x = (pageWidth - width) / 2;
            y = (pageHeight - height) / 2;
            
        } else {
            // Multiple images per page
            const cols = imagesPerPage === 4 ? 2 : 1;
            const rows = imagesPerPage / cols;
            const availableWidth = (pageWidth - margin * (cols + 1)) / cols;
            const availableHeight = (pageHeight - margin * (rows + 1)) / rows;
            
            const ratio = Math.min(
                availableWidth / image.width,
                availableHeight / image.height
            );
            
            width = image.width * ratio;
            height = image.height * ratio;
            
            const col = currentImage % cols;
            const row = Math.floor(currentImage / cols);
            
            x = margin + col * (availableWidth + margin) + (availableWidth - width) / 2;
            y = pageHeight - (margin + row * (availableHeight + margin) + height + (availableHeight - height) / 2);
        }
        
        return {
            x: { x, width },
            y: { y, height }
        };
    }

    downloadPDF(pdfBytes) {
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'converted_images.pdf';
        link.click();
        URL.revokeObjectURL(url);
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