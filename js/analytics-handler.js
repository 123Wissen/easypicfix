// Analytics Handler Class
class AnalyticsHandler {
    constructor() {
        this.events = [];
        this.performanceMetrics = {};
        this.initializePerformanceTracking();
    }

    // Initialize Performance Tracking
    initializePerformanceTracking() {
        if (window.performance && window.performance.timing) {
            window.addEventListener('load', () => {
                const timing = window.performance.timing;
                this.performanceMetrics = {
                    pageLoadTime: timing.loadEventEnd - timing.navigationStart,
                    domLoadTime: timing.domContentLoadedEventEnd - timing.navigationStart,
                    networkLatency: timing.responseEnd - timing.requestStart,
                    serverResponseTime: timing.responseEnd - timing.requestStart,
                    domProcessingTime: timing.domComplete - timing.domLoading
                };
                this.logPerformance(this.performanceMetrics);
            });
        }
    }

    // Log User Action
    logAction(action, data = {}) {
        const event = {
            type: 'action',
            action,
            data,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        this.events.push(event);
        this.sendToAnalyticsServer(event);
    }

    // Log Error
    logError(error) {
        const event = {
            type: 'error',
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        this.events.push(event);
        this.sendToAnalyticsServer(event);
    }

    // Log Performance Metrics
    logPerformance(metrics) {
        const event = {
            type: 'performance',
            metrics,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        this.events.push(event);
        this.sendToAnalyticsServer(event);
    }

    // Track User Behavior
    trackBehavior() {
        // Track page views
        this.logAction('pageview');

        // Track clicks
        document.addEventListener('click', (e) => {
            const target = e.target.closest('button, a, .clickable');
            if (target) {
                this.logAction('click', {
                    element: target.tagName,
                    id: target.id,
                    class: target.className,
                    text: target.textContent.trim()
                });
            }
        });

        // Track form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.tagName === 'FORM') {
                this.logAction('form_submit', {
                    formId: e.target.id,
                    formAction: e.target.action
                });
            }
        });

        // Track scroll depth
        let maxScroll = 0;
        window.addEventListener('scroll', this.throttle(() => {
            const scrollDepth = Math.round((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100);
            if (scrollDepth > maxScroll) {
                maxScroll = scrollDepth;
                this.logAction('scroll_depth', { depth: maxScroll });
            }
        }, 1000));
    }

    // Track Feature Usage
    trackFeatureUsage(featureId, data = {}) {
        this.logAction('feature_usage', {
            featureId,
            ...data
        });
    }

    // Send Data to Analytics Server
    async sendToAnalyticsServer(event) {
        try {
            const response = await fetch('/api/analytics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(event)
            });

            if (!response.ok) {
                console.error('Failed to send analytics data');
            }
        } catch (error) {
            console.error('Analytics Error:', error);
        }
    }

    // Utility: Throttle Function
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Get Analytics Report
    getAnalyticsReport() {
        return {
            events: this.events,
            performanceMetrics: this.performanceMetrics,
            summary: this.generateSummary()
        };
    }

    // Generate Summary
    generateSummary() {
        const actionCounts = {};
        const errorCounts = {};
        
        this.events.forEach(event => {
            if (event.type === 'action') {
                actionCounts[event.action] = (actionCounts[event.action] || 0) + 1;
            } else if (event.type === 'error') {
                errorCounts[event.message] = (errorCounts[event.message] || 0) + 1;
            }
        });

        return {
            totalEvents: this.events.length,
            actionCounts,
            errorCounts,
            performanceMetrics: this.performanceMetrics
        };
    }
}

// Export the AnalyticsHandler class
export default AnalyticsHandler; 