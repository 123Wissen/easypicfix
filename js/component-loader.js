class ComponentLoader {
    constructor() {
        this.headerPlaceholder = document.getElementById('header-placeholder');
        this.footerPlaceholder = document.getElementById('footer-placeholder');
        this.basePath = this.getBasePath();
        this.loadingPromises = new Map();
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        this.componentCache = new Map();
    }

    // Get the base path for components based on current page depth
    getBasePath() {
        const path = window.location.pathname;
        const pathParts = path.split('/').filter(Boolean);
        const depth = pathParts.length;
        
        // Handle special cases
        if (path === '/' || path === '') {
            return './components/';
        }
        
        // Calculate relative path based on depth
        let basePath = '';
        for (let i = 0; i < depth; i++) {
            basePath += '../';
        }
        return basePath + 'components/';
    }

    // Load header and footer with retry mechanism
    async loadComponents() {
        try {
            if (!this.headerPlaceholder || !this.footerPlaceholder) {
                console.warn('Header or footer placeholder not found, attempting to find them...');
                this.headerPlaceholder = document.getElementById('header-placeholder');
                this.footerPlaceholder = document.getElementById('footer-placeholder');
                
                if (!this.headerPlaceholder || !this.footerPlaceholder) {
                    throw new Error('Header or footer placeholder not found after retry');
                }
            }

            // Load components in parallel with caching
            await Promise.all([
                this.loadComponent('header'),
                this.loadComponent('footer')
            ]);

            // Initialize components after loading
            this.initializeBootstrapComponents();
            this.updateActiveNavItem();
            this.setupMobileNavigation();
            this.setupDropdownBehavior();
            this.setupEventListeners();
            this.setupThemeToggle();

        } catch (error) {
            console.error('Error loading components:', error);
            this.handleLoadError(error);
        }
    }

    // Load a single component with retry logic and caching
    async loadComponent(type, attempt = 1) {
        const placeholder = document.getElementById(`${type}-placeholder`);
        if (!placeholder) {
            console.error(`${type} placeholder not found`);
            return;
        }

        try {
            // Check cache first
            if (this.componentCache.has(type)) {
                placeholder.innerHTML = this.componentCache.get(type);
                placeholder.classList.add('component-loaded');
                return;
            }

            // Check if already loading
            if (this.loadingPromises.has(type)) {
                return this.loadingPromises.get(type);
            }

            const loadingPromise = this.fetchComponent(type);
            this.loadingPromises.set(type, loadingPromise);
            
            const content = await loadingPromise;
            if (!content) {
                throw new Error(`Failed to load ${type} component`);
            }
            
            this.componentCache.set(type, content);
            placeholder.innerHTML = content;

            // Remove from loading promises
            this.loadingPromises.delete(type);
            
            // Add loading complete class
            placeholder.classList.add('component-loaded');
            this.initializeComponentScripts(placeholder);

        } catch (error) {
            console.error(`Error loading ${type}:`, error);
            
            if (attempt < this.retryAttempts) {
                console.log(`Retrying ${type} load (attempt ${attempt + 1})`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
                return this.loadComponent(type, attempt + 1);
            } else {
                this.handleLoadError(error, type);
            }
        }
    }

    // Initialize any scripts within the loaded component
    initializeComponentScripts(container) {
        const scripts = container.getElementsByTagName('script');
        Array.from(scripts).forEach(oldScript => {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
            });
            newScript.textContent = oldScript.textContent;
            oldScript.parentNode.replaceChild(newScript, oldScript);
        });
    }

    // Setup event listeners for dynamic content
    setupEventListeners() {
        // Handle dynamic content loading
        document.addEventListener('contentLoaded', () => {
            this.initializeBootstrapComponents();
        });

        // Handle theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addListener(() => {
            this.updateTheme();
        });

        // Handle navigation changes
        window.addEventListener('popstate', () => {
            this.updateActiveNavItem();
        });
    }

    // Update theme based on system preference
    updateTheme() {
        const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.classList.toggle('dark-mode', isDarkMode);
    }

    // Clean up resources
    cleanup() {
        this.componentCache.clear();
        this.loadingPromises.clear();
    }

    // Handle component loading errors
    handleLoadError(error, type = 'component') {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'alert alert-danger m-3';
        errorMessage.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-exclamation-circle me-2"></i>
                <div>
                    <h5 class="mb-1">Error Loading ${type}</h5>
                    <p class="mb-2">${error.message}</p>
                    <button class="btn btn-outline-danger btn-sm" onclick="window.location.reload()">
                        <i class="fas fa-sync-alt me-2"></i>Retry
                    </button>
                </div>
            </div>
        `;

        const placeholder = document.getElementById(`${type}-placeholder`);
        if (placeholder) {
            placeholder.appendChild(errorMessage);
        }

        // Log error for analytics
        if (window.analytics) {
            window.analytics.logError({
                type: 'component_load_error',
                component: type,
                error: error.message,
                path: window.location.pathname,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Fetch component content
    async fetchComponent(type) {
        try {
            const response = await fetch(this.basePath + `${type}.html`);
            if (!response.ok) {
                throw new Error(`Failed to load ${type}: ${response.status} ${response.statusText}`);
            }
            const content = await response.text();
            
            // Validate content
            if (!content || content.trim().length === 0) {
                throw new Error(`Empty content received for ${type}`);
            }
            
            return content;
        } catch (error) {
            console.error(`Error fetching ${type}:`, error);
            throw error;
        }
    }

    // Initialize Bootstrap components
    initializeBootstrapComponents() {
        // Initialize tooltips
        const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(tooltip => new bootstrap.Tooltip(tooltip));

        // Initialize popovers
        const popovers = document.querySelectorAll('[data-bs-toggle="popover"]');
        popovers.forEach(popover => new bootstrap.Popover(popover));
    }

    // Update active navigation item
    updateActiveNavItem() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPath || currentPath.startsWith(href)) {
                link.classList.add('active');
            }
        });
    }

    // Setup mobile navigation
    setupMobileNavigation() {
        const navbar = document.querySelector('.navbar-collapse');
        if (!navbar) return;

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navbar.contains(e.target) && navbar.classList.contains('show')) {
                navbar.classList.remove('show');
            }
        });

        // Close mobile menu when clicking a link
        const navLinks = navbar.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth < 992) {
                    navbar.classList.remove('show');
                }
            });
        });
    }

    // Setup dropdown behavior
    setupDropdownBehavior() {
        const dropdowns = document.querySelectorAll('.dropdown');
        const isMobile = window.innerWidth < 992;

        if (!isMobile) {
            dropdowns.forEach(dropdown => {
                const menu = dropdown.querySelector('.dropdown-menu');
                if (!menu) return;

                dropdown.addEventListener('mouseenter', () => {
                    menu.classList.add('show');
                    if (menu.classList.contains('mega-menu')) {
                        this.positionMegaMenu(menu);
                    }
                });

                dropdown.addEventListener('mouseleave', () => {
                    menu.classList.remove('show');
                });
            });
        }
    }

    // Position mega menu
    positionMegaMenu(menu) {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;

        const navbarRect = navbar.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        
        menu.style.left = '50%';
        menu.style.transform = 'translateX(-50%)';
        menu.style.width = Math.min(windowWidth, 1200) + 'px';
        
        // Ensure menu doesn't overflow viewport
        const menuRect = menu.getBoundingClientRect();
        if (menuRect.left < 0) {
            menu.style.left = '0';
            menu.style.transform = 'none';
        } else if (menuRect.right > windowWidth) {
            menu.style.left = 'auto';
            menu.style.right = '0';
            menu.style.transform = 'none';
        }
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                const isDarkMode = document.body.classList.contains('dark-mode');
                themeToggle.innerHTML = `<i class="fas fa-${isDarkMode ? 'sun' : 'moon'}"></i>`;
                localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
            });

            // Set initial theme
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.body.classList.add('dark-mode');
                themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            }
        }
    }
}

export default ComponentLoader; 