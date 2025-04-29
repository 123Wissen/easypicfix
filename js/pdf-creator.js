import { jsPDF } from 'jspdf';

export class PDFCreator {
    constructor(options) {
        this.previewElement = document.querySelector(options.previewElement);
        this.pageFormatSelect = document.querySelector(options.pageFormatSelect);
        this.orientationSelect = document.querySelector(options.orientationSelect);
        this.marginInputs = {
            top: document.querySelector(options.topMarginInput),
            right: document.querySelector(options.rightMarginInput),
            bottom: document.querySelector(options.bottomMarginInput),
            left: document.querySelector(options.leftMarginInput)
        };
        this.compressionSelect = document.querySelector(options.compressionSelect);
        this.qualitySlider = document.querySelector(options.qualitySlider);
        this.createButton = document.querySelector(options.createButton);
        this.downloadButton = document.querySelector(options.downloadButton);
        
        this.images = new Map();
        this.pdf = null;
        
        this.bindEvents();
    }

    bindEvents() {
        [
            this.pageFormatSelect,
            this.orientationSelect,
            ...Object.values(this.marginInputs),
            this.compressionSelect,
            this.qualitySlider
        ].forEach(input => {
            input?.addEventListener('change', () => this.updatePreview());
        });

        this.createButton?.addEventListener('click', () => this.createPDF());
        this.downloadButton?.addEventListener('click', () => this.downloadPDF());
    }

    async addImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const img = new Image();
                    img.src = e.target.result;
                    await new Promise((res) => { img.onload = res; });

                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);

                    const imageId = Math.random().toString(36).substring(2);
                    this.images.set(imageId, {
                        file,
                        img,
                        canvas,
                        dimensions: { width: img.width, height: img.height }
                    });

                    resolve(imageId);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    removeImage(imageId) {
        this.images.delete(imageId);
        this.updatePreview();
    }

    async createPDF() {
        if (this.images.size === 0) {
            this.showError('Please add at least one image');
            return;
        }

        const format = this.pageFormatSelect?.value || 'a4';
        const orientation = this.orientationSelect?.value || 'portrait';
        const margins = {
            top: parseFloat(this.marginInputs.top?.value || 10),
            right: parseFloat(this.marginInputs.right?.value || 10),
            bottom: parseFloat(this.marginInputs.bottom?.value || 10),
            left: parseFloat(this.marginInputs.left?.value || 10)
        };
        const compression = this.compressionSelect?.value || 'MEDIUM';
        const quality = parseFloat(this.qualitySlider?.value || 0.8);

        try {
            this.pdf = new jsPDF({
                format,
                orientation,
                unit: 'mm',
                compress: compression !== 'NONE'
            });

            let currentPage = 1;
            for (const [imageId, imageData] of this.images) {
                if (currentPage > 1) {
                    this.pdf.addPage();
                }

                await this.addImageToPDF(imageData, margins, quality);
                currentPage++;
            }

            this.updatePreview();
            this.showSuccess('PDF created successfully');
        } catch (error) {
            console.error('Error creating PDF:', error);
            this.showError('Failed to create PDF');
        }
    }

    async addImageToPDF(imageData, margins, quality) {
        const { canvas, dimensions } = imageData;
        const pageWidth = this.pdf.internal.pageSize.getWidth();
        const pageHeight = this.pdf.internal.pageSize.getHeight();
        const contentWidth = pageWidth - margins.left - margins.right;
        const contentHeight = pageHeight - margins.top - margins.bottom;

        // Calculate image dimensions to fit within margins while maintaining aspect ratio
        const imageAspectRatio = dimensions.width / dimensions.height;
        const contentAspectRatio = contentWidth / contentHeight;

        let finalWidth, finalHeight;
        if (imageAspectRatio > contentAspectRatio) {
            finalWidth = contentWidth;
            finalHeight = contentWidth / imageAspectRatio;
        } else {
            finalHeight = contentHeight;
            finalWidth = contentHeight * imageAspectRatio;
        }

        // Center the image within margins
        const x = margins.left + (contentWidth - finalWidth) / 2;
        const y = margins.top + (contentHeight - finalHeight) / 2;

        // Convert canvas to JPEG data URL with quality setting
        const imageData = canvas.toDataURL('image/jpeg', quality);

        // Add image to PDF
        this.pdf.addImage(imageData, 'JPEG', x, y, finalWidth, finalHeight);
    }

    updatePreview() {
        if (!this.pdf || !this.previewElement) return;

        try {
            // Generate PDF preview
            const pdfData = this.pdf.output('datauristring');
            this.previewElement.src = pdfData;
        } catch (error) {
            console.error('Error updating preview:', error);
        }
    }

    downloadPDF() {
        if (!this.pdf) {
            this.showError('Please create a PDF first');
            return;
        }

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            this.pdf.save(`document-${timestamp}.pdf`);
        } catch (error) {
            console.error('Error downloading PDF:', error);
            this.showError('Failed to download PDF');
        }
    }

    showError(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger alert-dismissible fade show';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.querySelector('.card-body').insertBefore(alert, document.querySelector('.upload-section'));
        setTimeout(() => alert.remove(), 5000);
    }

    showSuccess(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-success alert-dismissible fade show';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.querySelector('.card-body').insertBefore(alert, document.querySelector('.upload-section'));
        setTimeout(() => alert.remove(), 5000);
    }
} 