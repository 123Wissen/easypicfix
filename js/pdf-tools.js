export class PDFTools {
    constructor() {
        this.compressionWorker = null;
        this.initializeWorker();
    }

    initializeWorker() {
        const workerCode = `
            importScripts('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js');

            self.onmessage = async function(e) {
                const { type, data } = e.data;
                switch (type) {
                    case 'compress':
                        const compressed = await compressPDF(data.arrayBuffer, data.quality);
                        self.postMessage({ type: 'compressComplete', data: compressed });
                        break;
                }
            };

            async function compressPDF(arrayBuffer, quality) {
                // PDF compression implementation
                return arrayBuffer;
            }
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.compressionWorker = new Worker(URL.createObjectURL(blob));
    }

    // Merge multiple PDFs
    async mergePDFs(files) {
        try {
            const PDFLib = await import('pdf-lib');
            const mergedPdf = await PDFLib.PDFDocument.create();
            
            for (const file of files) {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
                const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                pages.forEach(page => mergedPdf.addPage(page));
            }
            
            const mergedBytes = await mergedPdf.save();
            return new Blob([mergedBytes], { type: 'application/pdf' });
        } catch (error) {
            console.error('Error merging PDFs:', error);
            throw new Error('Failed to merge PDFs');
        }
    }

    // Split PDF into multiple files
    async splitPDF(file, pageRanges) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const PDFLib = await import('pdf-lib');
            const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
            const totalPages = pdf.getPageCount();

            const ranges = this.parsePageRange(pageRanges, totalPages);
            const splitPDFs = [];

            for (const range of ranges) {
                const newPdf = await PDFLib.PDFDocument.create();
                const pages = await newPdf.copyPages(pdf, range);
                pages.forEach(page => newPdf.addPage(page));
                
                const pdfBytes = await newPdf.save();
                splitPDFs.push(new Blob([pdfBytes], { type: 'application/pdf' }));
            }
            
            return splitPDFs;
        } catch (error) {
            console.error('Error splitting PDF:', error);
            throw new Error('Failed to split PDF');
        }
    }

    // Compress PDF
    async compressPDF(file, quality = 'medium') {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const compressionSettings = {
                low: { imageQuality: 0.3, compress: true },
                medium: { imageQuality: 0.6, compress: true },
                high: { imageQuality: 0.9, compress: false }
            };

            return new Promise((resolve, reject) => {
                this.compressionWorker.onmessage = (e) => {
                    if (e.data.type === 'compressComplete') {
                        const blob = new Blob([e.data.data], { type: 'application/pdf' });
                        resolve(blob);
                    }
                };

                this.compressionWorker.onerror = reject;
                this.compressionWorker.postMessage({
                    type: 'compress',
                    data: {
                        arrayBuffer,
                        quality: compressionSettings[quality]
                    }
                });
            });
        } catch (error) {
            console.error('Error compressing PDF:', error);
            throw new Error('Failed to compress PDF');
        }
    }

    // Add watermark to PDF
    async addWatermark(file, watermarkText, options = {}) {
        try {
            const PDFLib = await import('pdf-lib');
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
            const pages = pdf.getPages();
            
            const defaultOptions = {
                fontSize: 50,
                opacity: 0.3,
                rotation: -45,
                color: PDFLib.rgb(0.5, 0.5, 0.5)
            };
            
            const settings = { ...defaultOptions, ...options };
            
            // Add watermark to each page
            for (const page of pages) {
                const { width, height } = page.getSize();
                page.drawText(watermarkText, {
                    x: width / 2,
                    y: height / 2,
                    size: settings.fontSize,
                    opacity: settings.opacity,
                    rotate: PDFLib.degrees(settings.rotation),
                    color: settings.color
                });
            }
            
            const pdfBytes = await pdf.save();
            return new Blob([pdfBytes], { type: 'application/pdf' });
        } catch (error) {
            console.error('Error adding watermark:', error);
            throw new Error('Failed to add watermark to PDF');
        }
    }

    // Protect PDF with password
    async protectPDF(file, password) {
        try {
            const pdfBytes = await file.arrayBuffer();
            const pdf = await this.pdfLib.PDFDocument.load(pdfBytes);
            
            // Set password protection
            pdf.encrypt({
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
            
            const protectedPdfBytes = await pdf.save();
            return new Blob([protectedPdfBytes], { type: 'application/pdf' });
        } catch (error) {
            throw new Error('Error protecting PDF: ' + error.message);
        }
    }

    // Rotate PDF pages
    async rotatePDF(file, rotation) {
        try {
            const pdfBytes = await file.arrayBuffer();
            const pdf = await this.pdfLib.PDFDocument.load(pdfBytes);
            const pages = pdf.getPages();
            
            // Rotate each page
            for (const page of pages) {
                const currentRotation = page.getRotation().angle;
                page.setRotation(this.pdfLib.degrees(currentRotation + rotation));
            }
            
            const rotatedPdfBytes = await pdf.save();
            return new Blob([rotatedPdfBytes], { type: 'application/pdf' });
        } catch (error) {
            throw new Error('Error rotating PDF: ' + error.message);
        }
    }

    // Add page numbers to PDF
    async addPageNumbers(file, options = {}) {
        try {
            const pdfBytes = await file.arrayBuffer();
            const pdf = await this.pdfLib.PDFDocument.load(pdfBytes);
            const pages = pdf.getPages();
            
            const defaultOptions = {
                fontSize: 12,
                margin: 50,
                position: 'bottom-center'
            };
            
            const settings = { ...defaultOptions, ...options };
            
            // Add page numbers to each page
            pages.forEach((page, index) => {
                const { width, height } = page.getSize();
                const pageNumber = `${index + 1} of ${pages.length}`;
                
                let x = width / 2;
                let y = settings.margin;
                
                if (settings.position.includes('top')) {
                    y = height - settings.margin;
                }
                if (settings.position.includes('left')) {
                    x = settings.margin;
                }
                if (settings.position.includes('right')) {
                    x = width - settings.margin;
                }
                
                page.drawText(pageNumber, {
                    x,
                    y,
                    size: settings.fontSize,
                    color: this.pdfLib.rgb(0, 0, 0)
                });
            });
            
            const numberedPdfBytes = await pdf.save();
            return new Blob([numberedPdfBytes], { type: 'application/pdf' });
        } catch (error) {
            throw new Error('Error adding page numbers: ' + error.message);
        }
    }

    // Helper function to parse page ranges
    parsePageRange(range, totalPages) {
        try {
            if (!range) {
                return [[0, totalPages - 1]];
            }

            const ranges = range.split(',').map(r => r.trim());
            const result = [];

            for (const r of ranges) {
                if (r.includes('-')) {
                    const [start, end] = r.split('-').map(n => parseInt(n) - 1);
                    if (start >= 0 && end < totalPages && start <= end) {
                        result.push([start, end]);
                    }
                } else {
                    const pageNum = parseInt(r) - 1;
                    if (pageNum >= 0 && pageNum < totalPages) {
                        result.push([pageNum, pageNum]);
                    }
                }
            }

            return result;
        } catch (error) {
            throw new Error('Invalid page range format');
        }
    }

    // Helper function to create download link
    createDownloadLink(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    async generatePreview(file, pageNumber = 1) {
        try {
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const page = await pdf.getPage(pageNumber);

            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            return canvas.toDataURL();
        } catch (error) {
            console.error('Error generating preview:', error);
            throw new Error('Failed to generate PDF preview');
        }
    }

    cleanup() {
        if (this.compressionWorker) {
            this.compressionWorker.terminate();
            this.compressionWorker = null;
        }
    }
} 