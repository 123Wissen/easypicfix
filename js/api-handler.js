// API Handler Class
class APIHandler {
    constructor() {
        this.baseURL = window.location.origin;
        this.csrfToken = this.generateCSRFToken();
        this.rateLimitCounter = {};
        this.retryConfig = {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 5000
        };
        this.setupInterceptors();
    }

    // Generate CSRF Token with improved security
    generateCSRFToken() {
        const randomBytes = new Uint8Array(32);
        window.crypto.getRandomValues(randomBytes);
        return Array.from(randomBytes)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('') + Date.now().toString(36);
    }

    // Setup Request Interceptors
    setupInterceptors() {
        this.requestQueue = [];
        this.processingQueue = false;
        this.setupQueueProcessor();
    }

    // Process request queue
    setupQueueProcessor() {
        setInterval(() => {
            if (!this.processingQueue && this.requestQueue.length > 0) {
                this.processNextRequest();
            }
        }, 100);
    }

    async processNextRequest() {
        if (this.requestQueue.length === 0) return;

        this.processingQueue = true;
        const { request, resolve, reject } = this.requestQueue.shift();

        try {
            const response = await this.executeRequest(request);
            resolve(response);
        } catch (error) {
            reject(error);
        } finally {
            this.processingQueue = false;
        }
    }

    // Execute request with retry logic
    async executeRequest(request, retryCount = 0) {
        try {
            await this.checkRateLimit(request.endpoint);
            const response = await fetch(request.url, request.options);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (retryCount < this.retryConfig.maxRetries && this.shouldRetry(error)) {
                const delay = this.calculateRetryDelay(retryCount);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.executeRequest(request, retryCount + 1);
            }
            throw error;
        }
    }

    // Rate Limiting with improved tracking
    async checkRateLimit(endpoint) {
        const now = Date.now();
        if (!this.rateLimitCounter[endpoint]) {
            this.rateLimitCounter[endpoint] = {
                count: 0,
                timestamp: now,
                blocked: false
            };
        }

        const counter = this.rateLimitCounter[endpoint];

        // Reset counter after 1 minute
        if (now - counter.timestamp > 60000) {
            counter.count = 0;
            counter.timestamp = now;
            counter.blocked = false;
        }

        if (counter.blocked) {
            throw new Error('Rate limit exceeded. Please try again later.');
        }

        if (counter.count >= 60) { // 60 requests per minute
            counter.blocked = true;
            setTimeout(() => {
                counter.blocked = false;
                counter.count = 0;
            }, 60000);
            throw new Error('Rate limit exceeded. Please try again later.');
        }

        counter.count++;
    }

    // Determine if request should be retried
    shouldRetry(error) {
        const retryableStatuses = [408, 429, 500, 502, 503, 504];
        return error.name === 'TypeError' || // Network errors
               (error.response && retryableStatuses.includes(error.response.status));
    }

    // Calculate retry delay with exponential backoff
    calculateRetryDelay(retryCount) {
        const delay = Math.min(
            this.retryConfig.baseDelay * Math.pow(2, retryCount),
            this.retryConfig.maxDelay
        );
        return delay + Math.random() * 1000; // Add jitter
    }

    // Error Handler with improved logging
    handleError(error) {
        console.error('API Error:', error);
        
        // Log error to analytics with more context
        if (window.analytics) {
            window.analytics.logError({
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                userAgent: navigator.userAgent,
                type: error.name,
                code: error.code
            });
        }

        // Show user-friendly error message
        this.showErrorNotification(this.getErrorMessage(error));
    }

    // Get user-friendly error message
    getErrorMessage(error) {
        const errorMessages = {
            'TypeError': 'Network error. Please check your connection.',
            'RateLimitError': 'Too many requests. Please try again later.',
            'ValidationError': 'Invalid input. Please check your data.',
            'AuthError': 'Authentication failed. Please log in again.',
            'default': 'An unexpected error occurred. Please try again.'
        };

        return errorMessages[error.name] || errorMessages.default;
    }

    // Show Error Notification with improved UI
    showErrorNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'alert alert-danger alert-dismissible fade show position-fixed top-0 end-0 m-3';
        notification.style.zIndex = '9999';
        notification.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-exclamation-circle me-2"></i>
                <div>
                    <strong>Error</strong>
                    <p class="mb-0">${message}</p>
                </div>
                <button type="button" class="btn-close ms-3" data-bs-dismiss="alert"></button>
            </div>
        `;
        document.body.appendChild(notification);

        // Auto-dismiss after 5 seconds
        const dismissTimeout = setTimeout(() => notification.remove(), 5000);

        // Clear timeout if manually dismissed
        notification.querySelector('.btn-close').addEventListener('click', () => {
            clearTimeout(dismissTimeout);
        });
    }

    // Image Processing API with improved error handling
    async processImage(file, options) {
        try {
            this.validateFile(file);
            await this.checkRateLimit('processImage');
            
            const formData = new FormData();
            formData.append('image', file);
            formData.append('options', JSON.stringify(options));

            const request = {
                url: `${this.baseURL}/api/process-image`,
                options: {
                    method: 'POST',
                    headers: {
                        'X-CSRF-Token': this.csrfToken
                    },
                    body: formData
                },
                endpoint: 'processImage'
            };

            return new Promise((resolve, reject) => {
                this.requestQueue.push({ request, resolve, reject });
            });
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }

    // Batch Processing API with progress tracking
    async processBatch(files, options) {
        try {
            files.forEach(file => this.validateFile(file));
            await this.checkRateLimit('processBatch');
            
            const formData = new FormData();
            files.forEach(file => formData.append('images[]', file));
            formData.append('options', JSON.stringify(options));

            const request = {
                url: `${this.baseURL}/api/process-batch`,
                options: {
                    method: 'POST',
                    headers: {
                        'X-CSRF-Token': this.csrfToken
                    },
                    body: formData
                },
                endpoint: 'processBatch'
            };

            return new Promise((resolve, reject) => {
                this.requestQueue.push({ request, resolve, reject });
            });
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }

    // File Validation with improved checks
    validateFile(file) {
        // Check file presence
        if (!file) {
            throw new Error('No file provided');
        }

        // Check file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            throw new Error('Invalid file type. Only JPG, PNG, GIF, and WebP files are allowed.');
        }

        // Check file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        if (file.size > maxSize) {
            throw new Error('File size exceeds 10MB limit.');
        }

        // Check file name length
        if (file.name.length > 255) {
            throw new Error('File name is too long.');
        }

        return true;
    }

    // Cloud Storage Integration with retry mechanism
    async uploadToCloud(file) {
        try {
            this.validateFile(file);
            await this.checkRateLimit('cloudUpload');
            
            const formData = new FormData();
            formData.append('file', file);

            const request = {
                url: `${this.baseURL}/api/cloud-upload`,
                options: {
                    method: 'POST',
                    headers: {
                        'X-CSRF-Token': this.csrfToken
                    },
                    body: formData
                },
                endpoint: 'cloudUpload'
            };

            return new Promise((resolve, reject) => {
                this.requestQueue.push({ request, resolve, reject });
            });
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }

    // User Analytics with improved tracking
    logUserAction(action, data) {
        try {
            if (window.analytics) {
                window.analytics.logAction({
                    action,
                    data,
                    timestamp: new Date().toISOString(),
                    userId: this.getUserId(),
                    sessionId: this.getSessionId(),
                    page: window.location.pathname,
                    referrer: document.referrer
                });
            }
        } catch (error) {
            console.error('Analytics Error:', error);
        }
    }

    // Get/Generate User ID with improved persistence
    getUserId() {
        let userId = localStorage.getItem('userId');
        if (!userId) {
            userId = 'user_' + this.generateUUID();
            localStorage.setItem('userId', userId);
        }
        return userId;
    }

    // Get/Generate Session ID
    getSessionId() {
        let sessionId = sessionStorage.getItem('sessionId');
        if (!sessionId) {
            sessionId = 'session_' + this.generateUUID();
            sessionStorage.setItem('sessionId', sessionId);
        }
        return sessionId;
    }

    // Generate UUID
    generateUUID() {
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    }
}

// Export the APIHandler class
export default APIHandler; 