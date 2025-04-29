export class PDFCompressor {
    constructor(options) {
        this.options = options;
        this.files = [];
        this.currentFileIndex = 0;
        this.initializeElements();
        this.initializeEventListeners();
        this.pdfjsLib = window['pdfjs-dist/build/pdf'];
        this.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    initializeElements() {
        // Get DOM elements
        this.inputElement = document.querySelector(this.options.inputElement);
        this.previewElement = document.querySelector(this.options.previewElement);
        this.compressionLevelElement = document.querySelector(this.options.compressionLevelElement);
        this.imageQualityElement = document.querySelector(this.options.imageQualityElement);
        this.qualityValueElement = document.querySelector(this.options.qualityValueElement);
        this.resolutionElement = document.querySelector(this.options.resolutionElement);
        this.optimizeImagesElement = document.querySelector(this.options.optimizeImagesElement);
        this.removeMetadataElement = document.querySelector(this.options.removeMetadataElement);
        this.compressButton = document.querySelector(this.options.compressButton);
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
        this.imageQualityElement?.addEventListener('input', () => {
            this.qualityValueElement.textContent = this.imageQualityElement.value;
        });

        // Compress button
        this.compressButton?.addEventListener('click', () => this.processFiles());
    }

    handleFiles(fileList) {
        this.files = Array.from(fileList).filter(file => 
            file.type === 'application/pdf' || 
            file.name.toLowerCase().endsWith('.pdf')
        );
        
        if (this.files.length === 0) {
            this.showError('Please upload valid PDF files.');
            return;
        }

        // Show settings and preview sections
        document.querySelector('.settings-section').style.display = 'block';
        document.querySelector('.preview-section').style.display = 'block';

        // Generate previews
        this.generatePreviews();
    }

    async generatePreviews() {
        this.previewElement.innerHTML = '';
        
        for (let i = 0; i < this.files.length; i++) {
            try {
                const file = this.files[i];
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await this.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const page = await pdf.getPage(1);
                const viewport = page.getViewport({ scale: 0.5 });
                
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;

                const preview = document.createElement('div');
                preview.className = 'col-md-4';
                preview.innerHTML = `
                    <div class="preview-item">
                        <button class="remove-btn" onclick="this.closest('.col-md-4').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                        <div class="card">
                            <img src="${canvas.toDataURL()}" class="card-img-top" alt="Preview">
                            <div class="card-body">
                                <p class="card-text text-truncate">${file.name}</p>
                                <p class="file-info">
                                    <span class="text-muted">Pages: ${pdf.numPages}</span><br>
                                    <span class="text-muted">Size: ${this.formatFileSize(file.size)}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                `;
                this.previewElement.appendChild(preview);
            } catch (error) {
                console.error(`Error generating preview for ${this.files[i].name}:`, error);
                const preview = document.createElement('div');
                preview.className = 'col-md-4';
                preview.innerHTML = `
                    <div class="preview-item">
                        <div class="card">
                            <div class="card-body text-center text-danger">
                                <i class="fas fa-exclamation-circle fa-3x mb-2"></i>
                                <p class="card-text">Error loading preview for ${this.files[i].name}</p>
                            </div>
                        </div>
                    </div>
                `;
                this.previewElement.appendChild(preview);
            }
        }
    }

    async processFiles() {
        try {
            document.querySelector('.progress-section').style.display = 'block';
            this.updateProgress(0);

            const settings = this.getSettings();
            const totalFiles = this.files.length;
            const processedFiles = [];

            for (let i = 0; i < totalFiles; i++) {
                this.currentFileIndex = i;
                const progress = (i / totalFiles) * 100;
                this.updateProgress(progress);
                this.progressText.textContent = `Compressing PDF ${i + 1} of ${totalFiles}...`;

                const processedFile = await this.processPDF(this.files[i], settings);
                processedFiles.push({
                    data: processedFile,
                    name: this.files[i].name.replace('.pdf', '_compressed.pdf')
                });
            }

            this.updateProgress(100);
            this.progressText.textContent = 'Compression complete!';
            
            // Download processed files
            this.downloadResults(processedFiles);

            setTimeout(() => {
                document.querySelector('.progress-section').style.display = 'none';
            }, 2000);

        } catch (error) {
            console.error('Error compressing PDFs:', error);
            this.showError('An error occurred while compressing the PDFs.');
        }
    }

    getSettings() {
        return {
            compressionLevel: this.compressionLevelElement.value,
            imageQuality: parseInt(this.imageQualityElement.value) / 100,
            resolution: parseInt(this.resolutionElement.value),
            optimizeImages: this.optimizeImagesElement.checked,
            removeMetadata: this.removeMetadataElement.checked
        };
    }

    async processPDF(file, settings) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await this.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        
        // Create a new PDF document
        const pdfDoc = await PDFLib.PDFDocument.create();
        
        // Copy pages from the original PDF
        for (let i = 0; i < numPages; i++) {
            const page = await pdf.getPage(i + 1);
            const viewport = page.getViewport({ scale: settings.resolution / 72 });
            
            // Create a canvas for the page
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            // Render the page to canvas
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            // Process images if optimization is enabled
            if (settings.optimizeImages) {
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                this.optimizeImageData(imageData, settings);
                context.putImageData(imageData, 0, 0);
            }
            
            // Add the page to the new PDF
            const image = await pdfDoc.embedJpg(canvas.toDataURL('image/jpeg', settings.imageQuality));
            const newPage = pdfDoc.addPage([viewport.width, viewport.height]);
            newPage.drawImage(image, {
                x: 0,
                y: 0,
                width: viewport.width,
                height: viewport.height
            });
        }
        
        // Apply compression settings
        const pdfBytes = await pdfDoc.save({
            useObjectStreams: true,
            addDefaultPage: false,
            objectsStack: settings.compressionLevel === 'maximum' ? 1000 : 100,
            compress: true
        });
        
        return new Blob([pdfBytes], { type: 'application/pdf' });
    }

    optimizeImageData(imageData, settings) {
        const data = imageData.data;
        const compressionLevel = {
            'low': 0.9,
            'medium': 0.7,
            'high': 0.5,
            'maximum': 0.3
        }[settings.compressionLevel];

        for (let i = 0; i < data.length; i += 4) {
            // Reduce color depth
            data[i] = Math.round(data[i] * compressionLevel) / compressionLevel;     // R
            data[i + 1] = Math.round(data[i + 1] * compressionLevel) / compressionLevel; // G
            data[i + 2] = Math.round(data[i + 2] * compressionLevel) / compressionLevel; // B
        }
    }

    downloadResults(processedFiles) {
        if (processedFiles.length === 1) {
            // Single file download
            const url = URL.createObjectURL(processedFiles[0].data);
            const link = document.createElement('a');
            link.href = url;
            link.download = processedFiles[0].name;
            link.click();
            URL.revokeObjectURL(url);
        } else {
            // Multiple files - create zip
            const zip = new JSZip();
            processedFiles.forEach((file) => {
                zip.file(file.name, file.data);
            });

            zip.generateAsync({type: 'blob'}).then((content) => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = 'compressed_pdfs.zip';
                link.click();
                URL.revokeObjectURL(link.href);
            });
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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