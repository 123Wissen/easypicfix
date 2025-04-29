export class ImageFilters {
    constructor(options) {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.image = null;
        this.originalImageData = null;
        this.previewElement = document.querySelector(options.previewElement);
        
        // Filter controls
        this.brightnessSlider = document.querySelector(options.brightnessSlider);
        this.contrastSlider = document.querySelector(options.contrastSlider);
        this.saturationSlider = document.querySelector(options.saturationSlider);
        this.hueSlider = document.querySelector(options.hueSlider);
        this.exposureSlider = document.querySelector(options.exposureSlider);
        this.gammaSlider = document.querySelector(options.gammaSlider);
        this.vibranceSlider = document.querySelector(options.vibranceSlider);
        this.warmthSlider = document.querySelector(options.warmthSlider);
        
        // Buttons
        this.applyButton = document.querySelector(options.applyButton);
        this.resetButton = document.querySelector(options.resetButton);
        this.downloadButton = document.querySelector(options.downloadButton);

        this.bindEvents();
    }

    bindEvents() {
        const sliders = [
            this.brightnessSlider,
            this.contrastSlider,
            this.saturationSlider,
            this.hueSlider,
            this.exposureSlider,
            this.gammaSlider,
            this.vibranceSlider,
            this.warmthSlider
        ];

        sliders.forEach(slider => {
            slider?.addEventListener('input', () => this.updatePreview());
        });

        this.applyButton?.addEventListener('click', () => this.applyFilters());
        this.resetButton?.addEventListener('click', () => this.resetImage());
        this.downloadButton?.addEventListener('click', () => this.downloadImage());
    }

    async loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.image = img;
                this.canvas.width = img.width;
                this.canvas.height = img.height;
                this.ctx.drawImage(img, 0, 0);
                this.originalImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                this.updatePreview();
                resolve();
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    updatePreview() {
        if (!this.image) return;

        this.ctx.putImageData(this.originalImageData, 0, 0);
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        this.applyAllFilters(imageData);
        
        this.ctx.putImageData(imageData, 0, 0);
        this.previewElement.src = this.canvas.toDataURL();
    }

    applyAllFilters(imageData) {
        const pixels = imageData.data;
        const brightness = this.brightnessSlider ? parseFloat(this.brightnessSlider.value) : 0;
        const contrast = this.contrastSlider ? parseFloat(this.contrastSlider.value) : 0;
        const saturation = this.saturationSlider ? parseFloat(this.saturationSlider.value) : 0;
        const hue = this.hueSlider ? parseFloat(this.hueSlider.value) : 0;
        const exposure = this.exposureSlider ? parseFloat(this.exposureSlider.value) : 0;
        const gamma = this.gammaSlider ? parseFloat(this.gammaSlider.value) : 1;
        const vibrance = this.vibranceSlider ? parseFloat(this.vibranceSlider.value) : 0;
        const warmth = this.warmthSlider ? parseFloat(this.warmthSlider.value) : 0;

        for (let i = 0; i < pixels.length; i += 4) {
            let r = pixels[i];
            let g = pixels[i + 1];
            let b = pixels[i + 2];

            // Apply brightness
            if (brightness !== 0) {
                r += brightness * 255;
                g += brightness * 255;
                b += brightness * 255;
            }

            // Apply contrast
            if (contrast !== 0) {
                const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
                r = factor * (r - 128) + 128;
                g = factor * (g - 128) + 128;
                b = factor * (b - 128) + 128;
            }

            // Apply exposure
            if (exposure !== 0) {
                const factor = Math.pow(2, exposure);
                r *= factor;
                g *= factor;
                b *= factor;
            }

            // Apply gamma correction
            if (gamma !== 1) {
                r = Math.pow(r / 255, gamma) * 255;
                g = Math.pow(g / 255, gamma) * 255;
                b = Math.pow(b / 255, gamma) * 255;
            }

            // Convert to HSL for hue and saturation adjustments
            const hsl = this.rgbToHsl(r, g, b);

            // Apply hue adjustment
            if (hue !== 0) {
                hsl[0] = (hsl[0] + hue) % 360;
            }

            // Apply saturation
            if (saturation !== 0) {
                hsl[1] = Math.max(0, Math.min(1, hsl[1] + saturation));
            }

            // Apply vibrance
            if (vibrance !== 0) {
                const avg = (r + g + b) / 3;
                const max = Math.max(r, g, b);
                const amt = (max - avg) * vibrance;
                if (r !== max) r += amt;
                if (g !== max) g += amt;
                if (b !== max) b += amt;
            }

            // Apply warmth
            if (warmth !== 0) {
                r += warmth * 10;
                b -= warmth * 10;
            }

            // Convert back to RGB if HSL adjustments were made
            if (hue !== 0 || saturation !== 0) {
                const rgb = this.hslToRgb(hsl[0], hsl[1], hsl[2]);
                r = rgb[0];
                g = rgb[1];
                b = rgb[2];
            }

            // Clamp values
            pixels[i] = Math.min(255, Math.max(0, r));
            pixels[i + 1] = Math.min(255, Math.max(0, g));
            pixels[i + 2] = Math.min(255, Math.max(0, b));
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
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }

            h /= 6;
        }

        return [h * 360, s, l];
    }

    hslToRgb(h, s, l) {
        h /= 360;
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

        return [r * 255, g * 255, b * 255];
    }

    applyFilters() {
        this.updatePreview();
    }

    resetImage() {
        if (!this.originalImageData) return;
        
        // Reset all sliders to their default values
        const sliders = [
            this.brightnessSlider,
            this.contrastSlider,
            this.saturationSlider,
            this.hueSlider,
            this.exposureSlider,
            this.gammaSlider,
            this.vibranceSlider,
            this.warmthSlider
        ];

        sliders.forEach(slider => {
            if (slider) {
                slider.value = slider.defaultValue;
            }
        });

        this.ctx.putImageData(this.originalImageData, 0, 0);
        this.previewElement.src = this.canvas.toDataURL();
    }

    downloadImage() {
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = `filtered-image-${timestamp}.png`;
        link.href = this.canvas.toDataURL();
        link.click();
    }
} 