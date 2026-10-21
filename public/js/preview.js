// ========================================
// PreviewManager - Live Preview
// ========================================

class PreviewManager {
    constructor() {
        this.currentPage = 1;
        this.totalPages = 0;
        this.zoom = 100;
        this.init();
    }

    init() {
        this.setupEvents();
        this.updatePreview();
    }

    setupEvents() {
        // Zoom
        document.getElementById('btn-zoom-in')?.addEventListener('click', () => this.zoomIn());
        document.getElementById('btn-zoom-out')?.addEventListener('click', () => this.zoomOut());
        document.getElementById('btn-fit')?.addEventListener('click', () => this.fitToScreen());

        // Navigation
        document.getElementById('btn-first')?.addEventListener('click', () => this.goToPage(1));
        document.getElementById('btn-prev')?.addEventListener('click', () => this.prevPage());
        document.getElementById('btn-next')?.addEventListener('click', () => this.nextPage());
        document.getElementById('btn-last')?.addEventListener('click', () => this.goToPage(this.totalPages));

        document.getElementById('page-input')?.addEventListener('change', (e) => {
            const page = parseInt(e.target.value);
            if (page >= 1 && page <= this.totalPages) {
                this.goToPage(page);
            } else {
                e.target.value = this.currentPage;
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            
            if (e.key === 'ArrowLeft') this.prevPage();
            if (e.key === 'ArrowRight') this.nextPage();
            if (e.key === 'Home') this.goToPage(1);
            if (e.key === 'End') this.goToPage(this.totalPages);
        });
    }

    updatePreview() {
        const images = window.GalleryManager?.getImages() || [];
        this.totalPages = images.length;

        const emptyState = document.getElementById('empty-state');
        const pageWrapper = document.getElementById('page-wrapper');
        const previewFooter = document.getElementById('preview-footer');

        if (images.length === 0) {
            if (emptyState) emptyState.style.display = 'flex';
            if (pageWrapper) pageWrapper.style.display = 'none';
            if (previewFooter) previewFooter.style.display = 'none';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        if (pageWrapper) pageWrapper.style.display = 'flex';
        if (previewFooter) previewFooter.style.display = 'block';

        // Reset current page if out of bounds
        if (this.currentPage > this.totalPages) {
            this.currentPage = this.totalPages;
        }

        this.renderPage();
        this.updateNav();
    }

    renderPage() {
        const images = window.GalleryManager?.getImages() || [];
        if (this.currentPage < 1 || this.currentPage > images.length) return;

        const image = images[this.currentPage - 1];
        if (!image) return;

        const settings = window.SettingsManager?.getSettings() || {};
        const sizes = {
            'a4': { w: 595, h: 842 },
            'letter': { w: 612, h: 792 },
            'a3': { w: 842, h: 1191 },
            'a5': { w: 420, h: 595 }
        };

        let dims = sizes[settings.pageSize] || sizes['a4'];
        if (settings.orientation === 'landscape') {
            dims = { w: dims.h, h: dims.w };
        }

        const scale = this.zoom / 100;
        const preview = document.getElementById('page-preview');
        const img = document.getElementById('preview-image');

        if (preview) {
            preview.style.width = `${dims.w * scale}px`;
            preview.style.height = `${dims.h * scale}px`;
            preview.style.backgroundColor = settings.backgroundColor || '#ffffff';
        }

        if (img) {
            img.src = image.path;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            img.style.objectFit = 'contain';
        }
    }

    updateNav() {
        const totalSpan = document.getElementById('total-pages');
        const input = document.getElementById('page-input');
        
        if (totalSpan) totalSpan.textContent = Utils.formatNumber(this.totalPages);
        if (input) {
            input.value = this.currentPage;
            input.max = this.totalPages;
        }

        const prevBtn = document.getElementById('btn-prev');
        const nextBtn = document.getElementById('btn-next');
        const firstBtn = document.getElementById('btn-first');
        const lastBtn = document.getElementById('btn-last');

        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= this.totalPages;
        if (firstBtn) firstBtn.disabled = this.currentPage <= 1;
        if (lastBtn) lastBtn.disabled = this.currentPage >= this.totalPages;

        // Dots
        const dots = document.getElementById('page-dots');
        if (dots) {
            let html = '';
            const maxDots = 10;
            const total = this.totalPages;
            
            if (total <= maxDots) {
                for (let i = 1; i <= total; i++) {
                    html += `<div class="page-dot ${i === this.currentPage ? 'active' : ''}" data-page="${i}"></div>`;
                }
            } else {
                // Show first, last, and some around current
                html += `<div class="page-dot ${1 === this.currentPage ? 'active' : ''}" data-page="1"></div>`;
                
                if (this.currentPage > 3) {
                    html += '<span style="color: var(--text-muted);">...</span>';
                }
                
                for (let i = Math.max(2, this.currentPage - 1); i <= Math.min(total - 1, this.currentPage + 1); i++) {
                    html += `<div class="page-dot ${i === this.currentPage ? 'active' : ''}" data-page="${i}"></div>`;
                }
                
                if (this.currentPage < total - 2) {
                    html += '<span style="color: var(--text-muted);">...</span>';
                }
                
                html += `<div class="page-dot ${total === this.currentPage ? 'active' : ''}" data-page="${total}"></div>`;
            }
            
            dots.innerHTML = html;

            dots.querySelectorAll('.page-dot').forEach(dot => {
                dot.addEventListener('click', () => {
                    this.goToPage(parseInt(dot.dataset.page));
                });
            });
        }
    }

    goToPage(page) {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        this.renderPage();
        this.updateNav();
    }

    nextPage() { 
        if (this.currentPage < this.totalPages) {
            this.goToPage(this.currentPage + 1);
        }
    }

    prevPage() { 
        if (this.currentPage > 1) {
            this.goToPage(this.currentPage - 1);
        }
    }

    zoomIn() { 
        this.zoom = Math.min(400, this.zoom + 25); 
        this.updateZoom(); 
    }

    zoomOut() { 
        this.zoom = Math.max(25, this.zoom - 25); 
        this.updateZoom(); 
    }

    fitToScreen() { 
        this.zoom = 100; 
        this.updateZoom(); 
    }

    updateZoom() {
        const zoomLevel = document.getElementById('zoom-level');
        if (zoomLevel) {
            zoomLevel.textContent = `${this.zoom}%`;
        }
        this.renderPage();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.PreviewManager = new PreviewManager();
});
