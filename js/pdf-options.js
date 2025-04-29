export class PDFOptions {
    constructor(options) {
        // Initialize UI elements
        this.inputElement = document.querySelector(options.inputElement);
        this.previewElement = document.querySelector(options.previewElement);
        this.pageRangeElement = document.querySelector(options.pageRangeElement);
        this.rotationElement = document.querySelector(options.rotationElement);
        this.watermarkTextElement = document.querySelector(options.watermarkTextElement);
        this.watermarkSizeElement = document.querySelector(options.watermarkSizeElement);
        this.watermarkOpacityElement = document.querySelector(options.watermarkOpacityElement);
        this.watermarkOpacityValueElement = document.querySelector(options.watermarkOpacityValueElement);
        this.watermarkPositionElement = document.querySelector(options.watermarkPositionElement);
        this.encryptPDFElement = document.querySelector(options.encryptPDFElement);
        this.passwordElement = document.querySelector(options.passwordElement);
        this.applyButton = document.querySelector(options.applyButton);
        this.progressBar = document.querySelector(options.progressBar);
        this.progressText = document.querySelector(options.progressText);

        // Initialize state
        this.currentFile = null;
        this.pdfDoc = null;
        this.isProcessing = false;

        // Bind methods
        this.handleFileSelect = this.handleFileSelect.bind(this);
        this.handleDragOver = this.handleDragOver.bind(this);
        this.handleDrop = this.handleDrop.bind(this);
        this.applyOptions = this.applyOptions.bind(this);
        this.showError = this.showError.bind(this);
        this.showSuccess = this.showSuccess.bind(this);

        // Initialize
        this.bindEvents();
        this.setupDragAndDrop();
    }

    bindEvents() {
        // File input events
        this.inputElement?.addEventListener('change', this.handleFileSelect);

        // Watermark opacity event
        this.watermarkOpacityElement?.addEventListener('input', () => {
            const value = this.watermarkOpacityElement.value;
            if (this.watermarkOpacityValueElement) {
                this.watermarkOpacityValueElement.textContent = `${value}%`;
            }
        });

        // Encryption toggle event
        this.encryptPDFElement?.addEventListener('change', () => {
            if (this.passwordElement) {
                this.passwordElement.disabled = !this.encryptPDFElement.checked;
            }
        });

        // Apply button event
        this.applyButton?.addEventListener('click', () => {
            if (!this.isProcessing && this.pdfDoc) {
                this.applyOptions();
            }
        });
    }

    setupDragAndDrop() {
        const uploadArea = this.inputElement?.closest('.upload-area');
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

        uploadArea.addEventListener('drop', this.handleDrop);
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add('border-primary');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('border-primary');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleFile(files[0]);
        }
    }

    handleFileSelect(e) {
        if (e.target.files && e.target.files.length > 0) {
            this.handleFile(e.target.files[0]);
        }
    }

    async handleFile(file) {
        if (file.type !== 'application/pdf') {
            this.showError('Please select a PDF file.');
            return;
        }

        try {
            this.currentFile = file;
            this.showProgress();
            this.updateProgress(10);

            // Load PDF
            const arrayBuffer = await file.arrayBuffer();
            const { PDFDocument } = PDFLib;
            this.pdfDoc = await PDFDocument.load(arrayBuffer);
            
            // Show preview
            await this.showPreview();
            
            // Show options
            document.querySelector('.pdf-options').style.display = 'block';
            document.querySelector('#process-section').style.display = 'block';
            
            this.hideProgress();
        } catch (error) {
            console.error('Error loading PDF:', error);
            this.showError('Failed to load PDF file: ' + error.message);
            this.hideProgress();
        }
    }

    async showPreview() {
        if (!this.pdfDoc || !this.previewElement) return;

        try {
            const { getDocument } = pdfjsLib;
            const pdf = await getDocument({ data: await this.pdfDoc.save() }).promise;
            const totalPages = pdf.numPages;

            this.previewElement.innerHTML = '';
            for (let i = 1; i <= Math.min(totalPages, 3); i++) {
                const page = await pdf.getPage(i);
                const scale = 0.5;
                const viewport = page.getViewport({ scale });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const col = document.createElement('div');
                col.className = 'col-md-4';
                col.appendChild(canvas);
                this.previewElement.appendChild(col);

                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;
            }

            document.querySelector('.preview-section').style.display = 'block';
        } catch (error) {
            console.error('Error creating preview:', error);
            this.showError('Failed to create preview');
        }
    }

    async applyOptions() {
        if (!this.pdfDoc || this.isProcessing) return;

        this.isProcessing = true;
        if (this.applyButton) {
            this.applyButton.disabled = true;
        }

        try {
            this.showProgress();
            this.updateProgress(10);

            // Get selected pages
            const pageRange = this.parsePageRange(this.pageRangeElement?.value || '');
            const totalPages = this.pdfDoc.getPageCount();
            const selectedPages = pageRange.length > 0 ? 
                pageRange.filter(p => p <= totalPages) : 
                Array.from({ length: totalPages }, (_, i) => i + 1);

            this.updateProgress(20);

            // Apply rotation
            const rotation = parseInt(this.rotationElement?.value || '0');
            if (rotation !== 0) {
                for (const pageNum of selectedPages) {
                    const page = this.pdfDoc.getPage(pageNum - 1);
                    page.setRotation(pdfjsLib.PageRotation[rotation]);
                }
            }

            this.updateProgress(40);

            // Apply watermark
            const watermarkText = this.watermarkTextElement?.value;
            if (watermarkText) {
                const fontSize = parseInt(this.watermarkSizeElement?.value || '24');
                const opacity = parseInt(this.watermarkOpacityElement?.value || '30') / 100;
                const position = this.watermarkPositionElement?.value || 'center';

                const font = await this.pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
                
                for (const pageNum of selectedPages) {
                    const page = this.pdfDoc.getPage(pageNum - 1);
                    const { width, height } = page.getSize();
                    
                    const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
                    const textHeight = font.heightAtSize(fontSize);
                    
                    let x, y;
                    switch (position) {
                        case 'top-left':
                            x = 10;
                            y = height - textHeight - 10;
                            break;
                        case 'top-right':
                            x = width - textWidth - 10;
                            y = height - textHeight - 10;
                            break;
                        case 'bottom-left':
                            x = 10;
                            y = 10;
                            break;
                        case 'bottom-right':
                            x = width - textWidth - 10;
                            y = 10;
                            break;
                        default: // center
                            x = (width - textWidth) / 2;
                            y = (height - textHeight) / 2;
                    }

                    page.drawText(watermarkText, {
                        x,
                        y,
                        size: fontSize,
                        font,
                        opacity
                    });
                }
            }

            this.updateProgress(60);

            // Apply encryption if needed
            if (this.encryptPDFElement?.checked) {
                const password = this.passwordElement?.value;
                if (password) {
                    await this.pdfDoc.encrypt({
                        userPassword: password,
                        ownerPassword: password,
                        permissions: {
                            printing: 'highResolution',
                            modifying: false,
                            copying: false,
                            annotating: false,
                            fillingForms: true,
                            contentAccessibility: true,
                            documentAssembly: false
                        }
                    });
                }
            }

            this.updateProgress(80);

            // Save and download
            const pdfBytes = await this.pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            link.href = url;
            link.download = `modified-${timestamp}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.updateProgress(100);
            this.showSuccess('PDF modified successfully! Your download should start automatically.');

        } catch (error) {
            console.error('Error modifying PDF:', error);
            this.showError('Failed to modify PDF: ' + error.message);
        } finally {
            this.hideProgress();
            this.isProcessing = false;
            if (this.applyButton) {
                this.applyButton.disabled = false;
            }
        }
    }

    parsePageRange(range) {
        if (!range) return [];
        
        const pages = new Set();
        const parts = range.split(',').map(p => p.trim());
        
        for (const part of parts) {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(n => parseInt(n));
                if (!isNaN(start) && !isNaN(end)) {
                    for (let i = start; i <= end; i++) {
                        pages.add(i);
                    }
                }
            } else {
                const num = parseInt(part);
                if (!isNaN(num)) {
                    pages.add(num);
                }
            }
        }
        
        return Array.from(pages).sort((a, b) => a - b);
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

    updateProgress(percent) {
        if (this.progressBar) {
            this.progressBar.style.width = `${percent}%`;
        }
        if (this.progressText) {
            this.progressText.textContent = `Processing PDF... ${Math.round(percent)}%`;
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
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
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

    showSuccess(message) {
        console.log(message);
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success alert-dismissible fade show';
        alertDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-check-circle me-2"></i>
                <div class="flex-grow-1">${message}</div>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
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