// ========================================
// ExportManager - Export to PDF
// ========================================

class ExportManager {
    constructor() {
        this.modal = document.getElementById('export-modal');
        this.init();
    }

    init() {
        // Open
        document.getElementById('btn-export-header')?.addEventListener('click', () => this.open());
        
        // Close
        document.getElementById('btn-close-export')?.addEventListener('click', () => this.close());
        document.getElementById('btn-cancel-export')?.addEventListener('click', () => this.close());
        this.modal?.querySelector('.modal-backdrop')?.addEventListener('click', () => this.close());

        // Export
        document.getElementById('btn-export')?.addEventListener('click', () => this.startExport());
    }

    open() {
        const images = window.GalleryManager?.getImages() || [];
        if (images.length === 0) {
            Utils.showToast('No images to export', 'info');
            return;
        }
        
        document.getElementById('export-count').textContent = Utils.formatNumber(images.length);
        document.getElementById('export-pages').textContent = Utils.formatNumber(images.length);
        this.modal?.classList.add('active');
    }

    close() {
        this.modal?.classList.remove('active');
    }

    async startExport() {
        const sessionId = window.UploadManager?.getSessionId();
        if (!sessionId) {
            Utils.showToast('Session error', 'error');
            return;
        }

        const images = window.GalleryManager?.getImages() || [];
        if (images.length === 0) {
            Utils.showToast('No images to export', 'info');
            return;
        }

        this.close();
        Utils.showToast('Generating PDF with ' + Utils.formatNumber(images.length) + ' images...', 'info');

        try {
            const res = await fetch(`/api/sessions/${sessionId}/export/pdf`, { 
                method: 'POST' 
            });
            
            const data = await res.json();

            if (data.downloadUrl) {
                // Create download link
                const link = document.createElement('a');
                link.href = data.downloadUrl;
                link.download = data.filename || 'document.pdf';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                Utils.showToast('Download started!', 'success');
            } else {
                Utils.showToast(data.error || 'Export failed', 'error');
            }
        } catch (err) {
            console.error('Export error:', err);
            Utils.showToast('Export failed', 'error');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.ExportManager = new ExportManager();
});
