// ========================================
// UploadManager - Handle Unlimited Image Uploads
// ========================================

class UploadManager {
    constructor() {
        this.sessionId = null;
        this.isUploading = false;
        this.uploadQueue = [];
        this.uploadedFiles = [];
        this.failedFiles = [];
        this.BATCH_SIZE = 20; // Upload 20 images at a time
        this.init();
    }

    async init() {
        await this.createSession();
        this.setupListeners();
    }

    async createSession() {
        try {
            const res = await fetch('/api/sessions', { method: 'POST' });
            const data = await res.json();
            this.sessionId = data.sessionId;
            console.log('Session created:', this.sessionId);
        } catch (err) {
            console.error('Session error:', err);
            Utils.showToast('Failed to connect to server', 'error');
        }
    }

    setupListeners() {
        // Select files button
        document.getElementById('btn-select')?.addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('file-input').click();
        });

        // File input - handles unlimited files
        document.getElementById('file-input')?.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFiles(e.target.files);
                e.target.value = ''; // Reset input for next selection
            }
        });

        // Header upload button
        document.getElementById('btn-upload-header')?.addEventListener('click', () => {
            document.getElementById('file-input').click();
        });

        // Upload zone drag/drop
        const zone = document.getElementById('upload-zone');
        
        zone?.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('dragover');
        });

        zone?.addEventListener('dragleave', () => {
            zone.classList.remove('dragover');
        });

        zone?.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                this.handleFiles(e.dataTransfer.files);
            }
        });

        // Global drag/drop
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length > 0) {
                this.handleFiles(e.dataTransfer.files);
            }
        });

        // Paste from clipboard
        document.addEventListener('paste', (e) => {
            const items = e.clipboardData?.items;
            if (items) {
                const files = [];
                for (const item of items) {
                    if (item.type.startsWith('image/')) {
                        const file = item.getAsFile();
                        if (file) files.push(file);
                    }
                }
                if (files.length > 0) {
                    this.handleFiles(files);
                }
            }
        });

        // Upload modal close/cancel
        document.getElementById('btn-close-upload')?.addEventListener('click', () => {
            this.closeUploadModal();
        });

        document.getElementById('btn-cancel-upload')?.addEventListener('click', () => {
            this.closeUploadModal();
        });
    }

    handleFiles(fileList) {
        // Filter only images
        const validFiles = Array.from(fileList).filter(file => 
            file.type.startsWith('image/')
        );

        if (validFiles.length === 0) {
            Utils.showToast('No valid image files selected', 'info');
            return;
        }

        // Add to queue
        this.uploadQueue.push(...validFiles);
        
        // Show count
        if (validFiles.length > 10) {
            Utils.showToast(`${validFiles.length} images added to upload queue`, 'info');
        }

        // Start uploading if not already
        if (!this.isUploading) {
            this.startUpload();
        }
    }

    async startUpload() {
        if (!this.sessionId) {
            await this.createSession();
        }

        if (!this.sessionId) {
            Utils.showToast('Failed to create session', 'error');
            return;
        }

        this.isUploading = true;
        this.uploadedFiles = [];
        this.failedFiles = [];

        // Show upload modal
        this.showUploadModal();

        // Process queue in batches
        while (this.uploadQueue.length > 0 && this.isUploading) {
            const batch = this.uploadQueue.splice(0, this.BATCH_SIZE);
            await this.uploadBatch(batch);
        }

        // Finalize
        this.finalizeUpload();
    }

    async uploadBatch(files) {
        this.updateModalStatus(`Uploading ${files.length} images...`);

        try {
            const formData = new FormData();
            files.forEach(file => formData.append('images', file));

            const res = await fetch(`/api/sessions/${this.sessionId}/upload`, {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (data.images && data.images.length > 0) {
                this.uploadedFiles.push(...data.images);
                
                // Add to gallery immediately (streaming update)
                if (window.GalleryManager) {
                    window.GalleryManager.addImagesStreaming(data.images);
                }

                this.updateModalProgress();
            }

            if (data.images.length !== files.length) {
                const failed = files.length - data.images.length;
                this.failedFiles.push(...files.slice(data.images.length));
            }

        } catch (err) {
            console.error('Upload batch error:', err);
            this.failedFiles.push(...files);
        }
    }

    showUploadModal() {
        const modal = document.getElementById('upload-modal');
        const fileList = document.getElementById('upload-file-list');
        
        if (modal) {
            modal.classList.add('active');
        }

        // Show all queued files in the list
        if (fileList) {
            fileList.innerHTML = this.uploadQueue.map(file => `
                <div class="upload-file-item" data-filename="${file.name}">
                    <i class="fas fa-image" style="color: var(--text-muted);"></i>
                    <span class="upload-file-name" 
title="${file.name}">${Utils.truncateFilename(file.name)}</span>
                    <span class="upload-file-size">${Utils.formatFileSize(file.size)}</span>
                    <span class="upload-file-status pending">
                        <i class="fas fa-clock"></i>
                    </span>
                </div>
            `).join('');
        }
    }

    updateModalStatus(text) {
        const status = document.getElementById('upload-status-text');
        if (status) {
            status.textContent = text;
        }
    }

    updateModalProgress() {
        const total = this.uploadedFiles.length + this.failedFiles.length + this.uploadQueue.length;
        const uploaded = this.uploadedFiles.length;
        const percent = total > 0 ? Math.round((uploaded / total) * 100) : 0;

        // Update progress bar
        const progressFill = document.getElementById('upload-progress-fill');
        if (progressFill) {
            progressFill.style.width = `${percent}%`;
        }

        // Update count text
        const countText = document.getElementById('upload-count-text');
        if (countText) {
            countText.textContent = `${Utils.formatNumber(uploaded)} of ${Utils.formatNumber(total)}`;
        }

        // Update percent text
        const percentText = document.getElementById('upload-percent-text');
        if (percentText) {
            percentText.textContent = `${percent}%`;
        }

        // Update status for recent files
        const fileItems = document.querySelectorAll('.upload-file-item');
        fileItems.forEach((item, index) => {
            if (index < this.uploadedFiles.length) {
                item.querySelector('.upload-file-status').innerHTML = '<i class="fas fa-check" style="color: var(--success);"></i>';
                item.querySelector('.upload-file-status').className = 'upload-file-status success';
            }
        });
    }

    finalizeUpload() {
        this.isUploading = false;

        const totalUploaded = this.uploadedFiles.length;
        const totalFailed = this.failedFiles.length;

        // Update gallery
        if (window.GalleryManager) {
            window.GalleryManager.refreshGallery();
        }

        // Show final status
        if (totalFailed === 0 && totalUploaded > 0) {
            Utils.showToast(`${Utils.formatNumber(totalUploaded)} images uploaded successfully!`, 
'success');
            this.closeUploadModal();
        } else if (totalFailed > 0) {
            Utils.showToast(`${Utils.formatNumber(totalUploaded)} uploaded, 
${Utils.formatNumber(totalFailed)} failed`, 'info');
            // Close after showing failed message
            setTimeout(() => this.closeUploadModal(), 2000);
        }
    }

    closeUploadModal() {
        const modal = document.getElementById('upload-modal');
        if (modal) {
            modal.classList.remove('active');
        }
        this.isUploading = false;
        this.uploadQueue = [];
    }

    getSessionId() {
        return this.sessionId;
    }

    async refreshSession() {
        try {
            const res = await fetch(`/api/sessions/${this.sessionId}`);
            const data = await res.json();
            return data.images || [];
        } catch (err) {
            console.error('Failed to refresh session:', err);
            return [];
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.UploadManager = new UploadManager();
});
