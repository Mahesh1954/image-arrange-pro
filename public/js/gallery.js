// ========================================
// GalleryManager - Handle Image Gallery with Lazy Loading
// ========================================

class GalleryManager {
    constructor() {
        this.images = [];
        this.displayedImages = [];
        this.selectedImages = new Set();
        this.currentPage = 1;
        this.itemsPerPage = 50; // Show 50 images initially
        this.totalPages = 1;
        this.init();
    }

    init() {
        this.galleryGrid = document.getElementById('gallery-grid');
        this.uploadZone = document.getElementById('upload-zone');
        this.loadMoreContainer = document.getElementById('load-more-container');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Sort
        document.getElementById('sort-select')?.addEventListener('change', (e) => {
            this.sortImages(e.target.value);
        });

        // View toggle
        document.getElementById('btn-grid')?.addEventListener('click', () => {
            document.getElementById('btn-grid').classList.add('active');
            document.getElementById('btn-list').classList.remove('active');
            this.galleryGrid?.classList.remove('list-view');
        });

        document.getElementById('btn-list')?.addEventListener('click', () => {
            document.getElementById('btn-list').classList.add('active');
            document.getElementById('btn-grid').classList.remove('active');
            this.galleryGrid?.classList.add('list-view');
        });

        // Delete selected
        document.getElementById('btn-delete-selected')?.addEventListener('click', () => {
            this.deleteSelected();
        });

        // Quick actions
        document.getElementById('btn-sort-asc')?.addEventListener('click', () => {
            this.sortImages('name-asc');
        });
        
        document.getElementById('btn-sort-desc')?.addEventListener('click', () => {
            this.sortImages('name-desc');
        });
        
        document.getElementById('btn-clear-all')?.addEventListener('click', () => {
            this.clearAll();
        });

        // Load more
        document.getElementById('btn-load-more')?.addEventListener('click', () => {
            this.loadMore();
        });

        // Search
        document.getElementById('search-input')?.addEventListener('input', 
            Utils.debounce((e) => this.searchImages(e.target.value), 300)
        );

        // Infinite scroll
        this.setupInfiniteScroll();
    }

    setupInfiniteScroll() {
        const galleryArea = document.querySelector('.gallery-area');
        if (galleryArea) {
            galleryArea.addEventListener('scroll', () => {
                const { scrollTop, scrollHeight, clientHeight } = galleryArea;
                if (scrollTop + clientHeight >= scrollHeight - 100) {
                    this.loadMore();
                }
            });
        }
    }

    addImages(images) {
        console.log('Adding', images.length, 'images');
        this.images.push(...images);
        this.sortImages(document.getElementById('sort-select')?.value || 'default');
        this.render();
    }

    addImagesStreaming(images) {
        // Add images one by one for streaming effect
        this.images.push(...images);
        this.currentPage = 1;
        this.render();
        this.updateImageCounter();
    }

    removeImage(imageId) {
        const idx = this.images.findIndex(img => img.id === imageId);
        if (idx > -1) {
            this.images.splice(idx, 1);
            this.selectedImages.delete(imageId);
            this.render();
            this.deleteImageFromServer(imageId);
        }
    }

    async deleteImageFromServer(imageId) {
        const sessionId = window.UploadManager?.getSessionId();
        if (!sessionId) return;

        try {
            await fetch(`/api/sessions/${sessionId}/images/${imageId}`, {
                method: 'DELETE'
            });
        } catch (err) {
            console.error('Failed to delete image from server:', err);
        }
    }

    refreshGallery() {
        this.render();
        this.updateImageCounter();
    }

    updateImageCounter() {
        const counterText = document.getElementById('image-count-text');
        if (counterText) {
            counterText.textContent = `${Utils.formatNumber(this.images.length)} images`;
        }
    }

    render() {
        if (!this.galleryGrid || !this.uploadZone) return;

        if (this.images.length === 0) {
            this.galleryGrid.style.display = 'none';
            this.uploadZone.style.display = 'block';
            this.loadMoreContainer.style.display = 'none';
            this.updateImageCounter();
            this.updatePreview();
            return;
        }

        this.uploadZone.style.display = 'none';
        this.galleryGrid.style.display = 'grid';

        // Calculate pagination
        this.totalPages = Math.ceil(this.images.length / this.itemsPerPage);
        
        // Get images for current page
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        this.displayedImages = this.images.slice(start, end);

        // Render
        this.galleryGrid.innerHTML = this.displayedImages.map((img, idx) => `
            <div class="gallery-item ${this.selectedImages.has(img.id) ? 'selected' : ''}" 
                 data-id="${img.id}" 
                 data-index="${this.images.indexOf(img)}"
                 draggable="true">
                <img src="${img.thumbnailPath || img.path}" 
                     alt="${img.originalName}"
                     loading="lazy">
                <div class="overlay">
                    <div class="checkbox ${this.selectedImages.has(img.id) ? 'checked' : ''}" data-action="select"></div>
                    <div class="actions">
                        <button class="action-btn" data-action="rotate" title="Rotate">
                            <i class="fas fa-redo"></i>
                        </button>
                        <button class="action-btn delete" data-action="delete" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="info">
                    <div title="${img.originalName}">${img.originalName}</div>
                    <div>${Utils.formatFileSize(img.size)}</div>
                </div>
                <div class="drag-handle"><i class="fas fa-arrows-alt"></i></div>
            </div>
        `).join('');

        this.attachEvents();
        this.updateSelectionUI();
        this.updatePreview();
        this.updateLoadMoreUI();
        this.updateImageCounter();
    }

    attachEvents() {
        this.galleryGrid.querySelectorAll('.gallery-item').forEach(item => {
            const id = item.dataset.id;
            const img = this.images.find(i => i.id === id);
            const idx = parseInt(item.dataset.index);

            // Click
            item.addEventListener('click', (e) => {
                const action = e.target.closest('[data-action]')?.dataset.action;
                
                if (action === 'select') {
                    this.toggleSelection(id, e.ctrlKey || e.metaKey);
                } else if (action === 'rotate') {
                    img.rotation = ((img.rotation || 0) + 90) % 360;
                    this.render();
                } else if (action === 'delete') {
                    this.removeImage(id);
                } else {
                    this.toggleSelection(id, e.ctrlKey || e.metaKey);
                }
            });

            // Double click - go to preview
            item.addEventListener('dblclick', () => {
                if (window.PreviewManager) {
                    window.PreviewManager.goToPage(idx + 1);
                }
            });

            // Drag events
            item.addEventListener('dragstart', (e) => {
                item.classList.add('dragging');
                e.dataTransfer.setData('text/plain', idx);
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (!item.classList.contains('dragging')) {
                    item.classList.add('drag-over');
                }
            });

            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over');
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.classList.remove('drag-over');
                const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
                if (fromIdx !== idx) {
                    this.reorder(fromIdx, idx);
                }
            });
        });
    }

    toggleSelection(id, multi = false) {
        if (!multi) {
            this.selectedImages.clear();
        }
        
        if (this.selectedImages.has(id)) {
            this.selectedImages.delete(id);
        } else {
            this.selectedImages.add(id);
        }
        
        this.updateSelectionUI();
        this.render();
    }

    updateSelectionUI() {
        const info = document.getElementById('selection-info');
        const count = document.getElementById('selected-count');
        
        if (info && count) {
            if (this.selectedImages.size > 0) {
                info.style.display = 'flex';
                count.textContent = this.selectedImages.size;
            } else {
                info.style.display = 'none';
            }
        }
    }

    reorder(from, to) {
        const [item] = this.images.splice(from, 1);
        this.images.splice(to, 0, item);
        this.render();
        
        // Sync with server
        this.syncReorderToServer();
    }

    async syncReorderToServer() {
        const sessionId = window.UploadManager?.getSessionId();
        if (!sessionId) return;

        try {
            const imageIds = this.images.map(img => img.id);
            await fetch(`/api/sessions/${sessionId}/reorder`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageIds })
            });
        } catch (err) {
            console.error('Failed to sync reorder:', err);
        }
    }

    sortImages(type) {
        switch (type) {
            case 'name-asc':
                this.images.sort((a, b) => a.originalName.localeCompare(b.originalName));
                break;
            case 'name-desc':
                this.images.sort((a, b) => b.originalName.localeCompare(a.originalName));
                break;
            case 'size-asc':
                this.images.sort((a, b) => a.size - b.size);
                break;
            case 'size-desc':
                this.images.sort((a, b) => b.size - a.size);
                break;
            default:
                this.images.sort((a, b) => a.order - b.order);
        }
        this.currentPage = 1;
        this.render();
    }

    searchImages(query) {
        if (!query) {
            this.render();
            return;
        }

        const filtered = this.images.filter(img => 
            img.originalName.toLowerCase().includes(query.toLowerCase())
        );

        // Temporarily show filtered results
        const originalImages = this.images;
        this.images = filtered;
        this.galleryGrid.innerHTML = this.displayedImages.map((img, idx) => `
            <div class="gallery-item ${this.selectedImages.has(img.id) ? 'selected' : ''}" 
                 data-id="${img.id}" 
                 data-index="${this.images.indexOf(img)}"
                 draggable="true">
                <img src="${img.thumbnailPath || img.path}" alt="${img.originalName}" loading="lazy">
                <div class="overlay">
                    <div class="checkbox ${this.selectedImages.has(img.id) ? 'checked' : ''}" data-action="select"></div>
                    <div class="actions">
                        <button class="action-btn" data-action="rotate" title="Rotate">
                            <i class="fas fa-redo"></i>
                        </button>
                        <button class="action-btn delete" data-action="delete" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="info">
                    <div title="${img.originalName}">${img.originalName}</div>
                    <div>${Utils.formatFileSize(img.size)}</div>
                </div>
                <div class="drag-handle"><i class="fas fa-arrows-alt"></i></div>
            </div>
        `).join('');

        this.attachEvents();
        this.updateImageCounter();

        // Restore on empty search
        if (query === '') {
            this.images = originalImages;
            this.render();
        }
    }

    loadMore() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.render();
        }
    }

    updateLoadMoreUI() {
        const container = document.getElementById('load-more-container');
        const info = document.getElementById('load-more-info');
        
        if (container && info) {
            if (this.images.length > this.itemsPerPage) {
                container.style.display = 'flex';
                const displayed = Math.min(this.currentPage * this.itemsPerPage, this.images.length);
                info.textContent = `Showing ${displayed} of ${Utils.formatNumber(this.images.length)} images`;
                
                const btn = document.getElementById('btn-load-more');
                if (btn) {
                    btn.style.display = this.currentPage < this.totalPages ? 'inline-flex' : 'none';
                }
            } else {
                container.style.display = 'none';
            }
        }
    }

    async deleteSelected() {
        for (const id of this.selectedImages) {
            await this.deleteImageFromServer(id);
            this.removeImage(id);
        }
        this.selectedImages.clear();
        this.updateSelectionUI();
    }

    clearAll() {
        if (this.images.length === 0) return;
        if (confirm(`Remove all ${this.images.length} images?`)) {
            // Delete all from server
            const sessionId = window.UploadManager?.getSessionId();
            if (sessionId) {
                fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' })
                    .catch(err => console.error('Failed to clear session:', err));
            }
            
            this.images = [];
            this.selectedImages.clear();
            this.currentPage = 1;
            this.render();
        }
    }

    updatePreview() {
        if (window.PreviewManager) {
            window.PreviewManager.updatePreview();
        }
    }

    getImages() {
        return this.images;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.GalleryManager = new GalleryManager();
});
