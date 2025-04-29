export class ImageToPDF {
    constructor(options) {
        this.input = document.querySelector(options.inputElement);
        this.preview = document.querySelector(options.previewElement);
        this.pageSize = document.querySelector(options.pageSizeElement);
        this.orientation = document.querySelector(options.orientationElement);
        this.margin = document.querySelector(options.marginElement);
        this.quality = document.querySelector(options.qualityElement);
        this.convertBtn = document.querySelector(options.convertButton);
        this.progressBar = document.querySelector(options.progressBar);
        this.progressText = document.querySelector(options.progressText);

        this.filesToConvert = [];
        this.loadDependencies();
        this.bindEvents();
    }

    async loadDependencies() {
        try {
            // Load jsPDF if not already loaded
            if (typeof window.jspdf === 'undefined') {
                await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            }
            
            // Load html2canvas for better image processing
            if (typeof window.html2canvas === 'undefined') {
                await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
            }
        } catch (error) {
            console.error('Error loading dependencies:', error);
            this.showError('Failed to load required libraries. Please refresh the page.');
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
    }

    bindEvents() {
        this.input?.addEventListener('change', this.handleFileSelect.bind(this));
        this.convertBtn?.addEventListener('click', this.convertToPDF.bind(this));

        // Page settings events
        const updatePreview = () => this.updatePreview();
        this.pageSize?.addEventListener('change', updatePreview);
        this.orientation?.addEventListener('change', updatePreview);
        this.margin?.addEventListener('input', updatePreview);

        // Drag and drop
        const uploadArea = this.input?.closest('.upload-area');
        if (uploadArea) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, this.preventDefaults.bind(this));
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => {
                    uploadArea.classList.add('drag-active');
                });
            });

            ['dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => {
                    uploadArea.classList.remove('drag-active');
                });
            });

            uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        }
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDrop(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleFileSelect({ target: { files } });
        }
    }

    async handleFileSelect(e) {
        const files = Array.from(e.target.files).filter(file => 
            file.type.startsWith('image/')
        );

        if (files.length === 0) {
            this.showError('Please select valid image files (JPG, PNG, or WebP)');
            return;
        }

        // Show settings and preview sections
        document.querySelector('.settings-section').style.display = 'block';
        document.querySelector('.preview-section').style.display = 'block';

        // Clear previous previews
        this.preview.innerHTML = '';
        this.filesToConvert = files;

        // Create previews
        for (const file of files) {
            await this.createPreview(file);
        }
    }

    async createPreview(file) {
        try {
            const reader = new FileReader();
            const preview = await new Promise((resolve, reject) => {
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const col = document.createElement('div');
            col.className = 'col-md-4 mb-3';
            
            const card = document.createElement('div');
            card.className = 'card h-100';
            
            const img = new Image();
            img.src = preview;
            img.className = 'card-img-top';
            img.style.objectFit = 'contain';
            img.style.height = '200px';
            img.style.backgroundColor = '#f8f9fa';
            
            const cardBody = document.createElement('div');
            cardBody.className = 'card-body';
            
            // Wait for image to load to get dimensions
            await new Promise((resolve) => {
                img.onload = resolve;
            });
            
            cardBody.innerHTML = `
                <h6 class="card-title text-truncate">${file.name}</h6>
                <p class="card-text">
                    <small class="text-muted">
                        Size: ${this.formatFileSize(file.size)}<br>
                        Dimensions: ${img.naturalWidth} × ${img.naturalHeight}<br>
                        Type: ${file.type.split('/')[1].toUpperCase()}
                    </small>
                </p>
            `;
            
            card.appendChild(img);
            card.appendChild(cardBody);
            col.appendChild(card);
            this.preview.appendChild(col);
        } catch (error) {
            console.error('Error creating preview:', error);
            this.showError(`Error previewing ${file.name}`);
        }
    }

    async convertToPDF() {
        if (!this.filesToConvert?.length) {
            this.showError('Please select images to convert');
            return;
        }

        try {
            this.showProgress();
            this.convertBtn.disabled = true;

            // Get settings
            const pageSize = this.pageSize?.value || 'a4';
            const orientation = this.orientation?.value || 'portrait';
            const marginMM = parseInt(this.margin?.value) || 10;
            const quality = this.quality ? parseInt(this.quality.value) / 100 : 0.9;

            // Create PDF document
            const pdf = new jspdf.jsPDF({
                orientation: orientation,
                unit: 'mm',
                format: pageSize
            });

            // Get page dimensions
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const maxWidth = pageWidth - (marginMM * 2);
            const maxHeight = pageHeight - (marginMM * 2);

            for (let i = 0; i < this.filesToConvert.length; i++) {
                const file = this.filesToConvert[i];
                this.updateProgress((i + 1) / this.filesToConvert.length);

                try {
                    // Add new page for each image except the first
                if (i > 0) pdf.addPage();

                    // Process image
                    const imgData = await this.processImage(file, quality);
                    const dimensions = await this.calculateDimensions(
                        imgData.width,
                        imgData.height,
                        maxWidth,
                        maxHeight
                    );

                    // Add image to PDF
                pdf.addImage(
                        imgData.data,
                    'JPEG',
                        marginMM,
                        marginMM,
                    dimensions.width,
                    dimensions.height
                );
                } catch (error) {
                    console.error(`Error processing ${file.name}:`, error);
                    this.showError(`Error processing ${file.name}`);
                }
            }

            // Save the PDF
            const filename = this.filesToConvert.length > 1 ? 
                'converted_images.pdf' : 
                `${this.filesToConvert[0].name.split('.')[0]}.pdf`;
            
            pdf.save(filename);
            this.showSuccess('PDF created successfully!');
        } catch (error) {
            console.error('PDF conversion error:', error);
            this.showError('Failed to create PDF. Please try again.');
        } finally {
            this.hideProgress();
            this.convertBtn.disabled = false;
        }
    }

    async processImage(file, quality) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Set canvas size to image dimensions
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                
                // Draw image on canvas
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                
                // Get image data
                const data = canvas.toDataURL('image/jpeg', quality);
                resolve({
                    data: data,
                    width: img.naturalWidth,
                    height: img.naturalHeight
                });
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    calculateDimensions(imgWidth, imgHeight, maxWidth, maxHeight) {
        const ratio = imgWidth / imgHeight;
        let width = maxWidth;
        let height = width / ratio;

        if (height > maxHeight) {
            height = maxHeight;
            width = height * ratio;
        }

        return { width, height };
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

    updateProgress(ratio) {
        const percentage = Math.round(ratio * 100);
        if (this.progressBar) {
            this.progressBar.style.width = `${percentage}%`;
            this.progressBar.setAttribute('aria-valuenow', percentage);
        }
        if (this.progressText) {
            this.progressText.textContent = `Processing ${percentage}%`;
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showError(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger alert-dismissible fade show';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.querySelector('.alerts')?.appendChild(alert);
        setTimeout(() => alert.remove(), 5000);
    }

    showSuccess(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-success alert-dismissible fade show';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.querySelector('.alerts')?.appendChild(alert);
        setTimeout(() => alert.remove(), 5000);
    }
} 