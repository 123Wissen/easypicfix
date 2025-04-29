export class BulkPDFConverter {
    constructor(options) {
        // Initialize UI elements
        this.inputElement = document.querySelector(options.inputElement);
        this.fileListElement = document.querySelector(options.fileListElement);
        this.clearAllButton = document.querySelector(options.clearAllButton);
        this.pageSizeElement = document.querySelector(options.pageSizeElement);
        this.orientationElement = document.querySelector(options.orientationElement);
        this.qualityElement = document.querySelector(options.qualityElement);
        this.qualityValueElement = document.querySelector(options.qualityValueElement);
        this.marginElement = document.querySelector(options.marginElement);
        this.autoRotateElement = document.querySelector(options.autoRotateElement);
        this.optimizeSizeElement = document.querySelector(options.optimizeSizeElement);
        this.createPDFButton = document.querySelector(options.createPDFButton);
        this.progressBar = document.querySelector(options.progressBar);
        this.progressText = document.querySelector(options.progressText);

        // Initialize state
        this.files = new Map();
        this.nextFileId = 1;
        this.isProcessing = false;

        // Bind methods
        this.addFiles = this.addFiles.bind(this);
        this.addFileToList = this.addFileToList.bind(this);
        this.removeFile = this.removeFile.bind(this);
        this.clearAllFiles = this.clearAllFiles.bind(this);
        this.createPDF = this.createPDF.bind(this);
        this.updateUI = this.updateUI.bind(this);
        this.showError = this.showError.bind(this);
        this.showSuccess = this.showSuccess.bind(this);

        // Initialize
        this.bindEvents();
        this.setupDragAndDrop();
    }

    setupDragAndDrop() {
        const uploadArea = document.getElementById('upload-area');
        if (!uploadArea) return;

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
            const files = Array.from(e.dataTransfer.files);
            this.addFiles(files);
        });
    }

    bindEvents() {
        // File input events
        const chooseFilesBtn = document.getElementById('choose-files');
        if (chooseFilesBtn && this.inputElement) {
            chooseFilesBtn.addEventListener('click', () => {
                this.inputElement.click();
            });
        }

        this.inputElement?.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                const files = Array.from(e.target.files);
                this.addFiles(files);
                e.target.value = ''; // Reset input
            }
        });
        
        // Clear all button event
        this.clearAllButton?.addEventListener('click', this.clearAllFiles);

        // Quality slider event
        this.qualityElement?.addEventListener('input', () => {
            const value = this.qualityElement.value;
            if (this.qualityValueElement) {
                this.qualityValueElement.textContent = `${value}%`;
            }
        });

        // Create PDF button event
        this.createPDFButton?.addEventListener('click', () => {
            if (!this.isProcessing) {
                this.createPDF();
            }
        });
    }

    addFiles(files) {
        const maxFileSize = 15 * 1024 * 1024; // 15MB
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        
        const imageFiles = files.filter(file => {
            const type = file.type.toLowerCase();
            
            // Check file type
            if (!allowedTypes.includes(type)) {
                this.showError(`File "${file.name}" is not a supported image type. Please use JPG, PNG, or WebP.`);
                return false;
            }
            
            // Check file size
            if (file.size > maxFileSize) {
                this.showError(`File "${file.name}" is too large (${this.formatFileSize(file.size)}). Maximum size is 15MB.`);
                return false;
            }
            
            return true;
        });

        if (imageFiles.length === 0) {
            return;
        }

        imageFiles.forEach(file => {
            // Check if file is already added
            const isDuplicate = Array.from(this.files.values()).some(
                existingFile => existingFile.name === file.name && existingFile.size === file.size
            );

            if (!isDuplicate) {
                const fileId = this.nextFileId++;
                this.files.set(fileId, file);
                this.addFileToList(fileId, file);
            } else {
                this.showError(`File "${file.name}" is already added.`);
            }
        });

        this.updateUI();
    }

    addFileToList(fileId, file) {
        const row = document.createElement('tr');
        row.id = `file-${fileId}`;
        row.innerHTML = `
            <td class="align-middle">${file.name}</td>
            <td class="align-middle">${this.formatFileSize(file.size)}</td>
            <td class="align-middle"><span class="badge bg-secondary">Pending</span></td>
            <td class="align-middle">
                <button class="btn btn-sm btn-outline-danger remove-file" data-file-id="${fileId}">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        `;

        // Add remove button event listener
        const removeButton = row.querySelector('.remove-file');
        removeButton?.addEventListener('click', () => this.removeFile(fileId));

        this.fileListElement?.appendChild(row);
    }

    removeFile(fileId) {
        this.files.delete(fileId);
        const row = document.querySelector(`#file-${fileId}`);
        row?.remove();
        this.updateUI();
    }

    clearAllFiles() {
        this.files.clear();
        if (this.fileListElement) {
            this.fileListElement.innerHTML = '';
        }
        this.updateUI();
    }

    updateUI() {
        const hasFiles = this.files.size > 0;
        document.querySelector('.file-list')?.style.display = hasFiles ? 'block' : 'none';
        document.querySelector('.pdf-settings')?.style.display = hasFiles ? 'block' : 'none';
        document.querySelector('#process-section')?.style.display = hasFiles ? 'block' : 'none';
    }

    getPageDimensions() {
        const pageSize = this.pageSizeElement?.value || 'a4';
        const orientation = this.orientationElement?.value || 'portrait';
        
        let width, height;
        switch (pageSize.toLowerCase()) {
            case 'a4':
                width = 210;
                height = 297;
                break;
            case 'letter':
                width = 215.9;
                height = 279.4;
                break;
            case 'legal':
                width = 215.9;
                height = 355.6;
                break;
            default:
                width = 210;
                height = 297;
        }

        if (orientation === 'landscape') {
            [width, height] = [height, width];
        }

        return { width, height };
    }

    async createPDF() {
        if (this.files.size === 0) {
            this.showError('Please select at least one image');
            return;
        }

        if (this.isProcessing) {
            return;
        }

        this.isProcessing = true;
        if (this.createPDFButton) {
            this.createPDFButton.disabled = true;
        }

        try {
            this.showProgress();
            this.updateProgress(0);

            // Get PDF settings
            const dimensions = this.getPageDimensions();
            const margin = parseInt(this.marginElement?.value || '10');
            const quality = parseInt(this.qualityElement?.value || '80') / 100;
            const optimize = this.optimizeSizeElement?.checked ?? true;
            const autoRotate = this.autoRotateElement?.checked ?? true;
            const orientation = this.orientationElement?.value || 'portrait';

            // Create PDF instance
            const pdf = new window.jspdf.jsPDF({
                orientation: orientation,
                unit: 'mm',
                format: [dimensions.width, dimensions.height]
            });

            let currentPage = 1;
            const totalFiles = this.files.size;

            for (const [fileId, file] of this.files) {
                try {
                    this.updateFileStatus(fileId, 'processing');

                    // Load and process image
                    const img = await this.loadImage(file);
                    
                    // Add new page if not first page
                    if (currentPage > 1) {
                        pdf.addPage();
                    }

                    // Calculate image position and dimensions
                    const position = this.calculateImagePosition(
                        img,
                        dimensions,
                        margin,
                        autoRotate,
                        orientation
                    );

                    // Add image to PDF
                    pdf.addImage(
                        img,
                        'JPEG',
                        position.x,
                        position.y,
                        position.width,
                        position.height,
                        undefined,
                        'MEDIUM',
                        0
                    );

                    this.updateFileStatus(fileId, 'success');
                    this.updateProgress((currentPage / totalFiles) * 100);
                    currentPage++;
                } catch (error) {
                    console.error(`Error processing file ${file.name}:`, error);
                    this.updateFileStatus(fileId, 'error');
                    this.showError(`Failed to process "${file.name}". ${error.message}`);
                }
            }

            // Save the PDF
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `converted_images_${timestamp}.pdf`;
            
            if (optimize) {
                pdf.save(filename, { compress: true });
            } else {
                pdf.save(filename);
            }

            this.showSuccess('PDF created successfully!');
            this.hideProgress();
        } catch (error) {
            console.error('Error creating PDF:', error);
            this.showError('Failed to create PDF. Please try again.');
        } finally {
            if (this.createPDFButton) {
                this.createPDFButton.disabled = false;
            }
            this.isProcessing = false;
        }
    }

    calculateImagePosition(img, dimensions, margin, autoRotate, orientation) {
        const pageWidth = dimensions.width;
        const pageHeight = dimensions.height;
        const maxWidth = pageWidth - (margin * 2);
        const maxHeight = pageHeight - (margin * 2);

        let imgWidth = img.width;
        let imgHeight = img.height;

        // Auto-rotate image if needed
        if (autoRotate && orientation === 'auto') {
            if ((imgWidth > imgHeight && pageWidth < pageHeight) ||
                (imgWidth < imgHeight && pageWidth > pageHeight)) {
            [imgWidth, imgHeight] = [imgHeight, imgWidth];
        }
        }

        // Calculate dimensions while maintaining aspect ratio
        const { width, height } = this.calculateDimensions(imgWidth, imgHeight, maxWidth, maxHeight);

        // Center image on page
        const x = margin + (maxWidth - width) / 2;
        const y = margin + (maxHeight - height) / 2;

        return { x, y, width, height };
    }

    calculateDimensions(imgWidth, imgHeight, maxWidth, maxHeight) {
        const imgRatio = imgWidth / imgHeight;
        const maxRatio = maxWidth / maxHeight;

        let finalWidth, finalHeight;
        if (imgRatio > maxRatio) {
            finalWidth = maxWidth;
            finalHeight = maxWidth / imgRatio;
        } else {
            finalHeight = maxHeight;
            finalWidth = maxHeight * imgRatio;
        }

        return { width: finalWidth, height: finalHeight };
    }

    loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                img.onload = async () => {
                    try {
                        // Create canvas to handle image processing
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        if (!ctx) {
                            throw new Error('Failed to get canvas context');
                        }

                        // Get EXIF orientation
                        let orientation = 1;
                        if (window.EXIF) {
                            try {
                                await new Promise(resolve => {
                                    EXIF.getData(img, function() {
                                        orientation = EXIF.getTag(this, 'Orientation') || 1;
                                        resolve();
                                    });
                                });
                            } catch (e) {
                                console.warn('Failed to read EXIF orientation:', e);
                            }
                        }

                        // Set proper canvas dimensions based on orientation
                        let width = img.width;
                        let height = img.height;
                        if (orientation > 4 && orientation < 9) {
                            [width, height] = [height, width];
                        }
                        canvas.width = width;
                        canvas.height = height;

                        // Apply orientation transformations
                        if (orientation > 1) {
                            ctx.save();
                            switch (orientation) {
                                case 2: ctx.transform(-1, 0, 0, 1, width, 0); break;
                                case 3: ctx.transform(-1, 0, 0, -1, width, height); break;
                                case 4: ctx.transform(1, 0, 0, -1, 0, height); break;
                                case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
                                case 6: ctx.transform(0, 1, -1, 0, height, 0); break;
                                case 7: ctx.transform(0, -1, -1, 0, height, width); break;
                                case 8: ctx.transform(0, -1, 1, 0, 0, width); break;
                            }
                        }

                        // Draw image with proper orientation
                        ctx.drawImage(img, 0, 0);
                        if (orientation > 1) {
                            ctx.restore();
                        }

                        // Convert to base64
                        const quality = parseInt(this.qualityElement?.value || '80') / 100;
                        const dataUrl = canvas.toDataURL('image/jpeg', quality);

                        // Create new image with corrected orientation
                        const correctedImg = new Image();
                        correctedImg.onload = () => resolve(correctedImg);
                        correctedImg.onerror = () => reject(new Error('Failed to process image'));
                        correctedImg.src = dataUrl;
                    } catch (error) {
                        reject(error);
                    }
                };
                
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target?.result;
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsDataURL(file);
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateFileStatus(fileId, status) {
        const row = document.querySelector(`#file-${fileId}`);
        if (!row) return;

        const statusCell = row.querySelector('td:nth-child(3)');
        if (!statusCell) return;

        let badge;
        switch (status) {
            case 'processing':
                badge = '<span class="badge bg-primary">Processing</span>';
                break;
            case 'completed':
                badge = '<span class="badge bg-success">Completed</span>';
                break;
            case 'error':
                badge = '<span class="badge bg-danger">Error</span>';
                break;
            default:
                badge = '<span class="badge bg-secondary">Pending</span>';
        }
        statusCell.innerHTML = badge;
    }

    updateProgress(percent) {
        if (this.progressBar) {
            this.progressBar.style.width = `${percent}%`;
        }
        if (this.progressText) {
            this.progressText.textContent = `Processing images... ${Math.round(percent)}%`;
        }
    }

    showProgress() {
        const progressSection = document.querySelector('.progress-section');
        if (progressSection) {
            progressSection.style.display = 'block';
        }
    }

    hideProgress() {
        const progressSection = document.querySelector('.progress-section');
        if (progressSection) {
            progressSection.style.display = 'none';
        }
    }

    showError(message) {
        console.error(message);
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show';
        alertDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-exclamation-circle me-2"></i>
                <div class="flex-grow-1">${message}</div>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        
        const container = document.getElementById('alert-container');
        if (container) {
            // Remove old alerts
            const oldAlerts = container.querySelectorAll('.alert');
            oldAlerts.forEach(alert => {
                if (alert.textContent === message) {
                    alert.remove();
                }
            });
            
            container.appendChild(alertDiv);
            setTimeout(() => {
                alertDiv.remove();
            }, 5000);
        }
    }

    showSuccess(message) {
        console.log(message);
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success alert-dismissible fade show';
        alertDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-check-circle me-2"></i>
                <div class="flex-grow-1">${message}</div>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        
        const container = document.getElementById('alert-container');
        if (container) {
            container.appendChild(alertDiv);
            setTimeout(() => {
                alertDiv.remove();
            }, 5000);
        }
    }
} 