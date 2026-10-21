// ========================================
// App - Main Application Entry
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 ImageArrange Pro loaded');
    console.log('✨ Unlimited image uploads enabled!');
    
    // Help modal
    document.getElementById('btn-help')?.addEventListener('click', () => {
        alert(`ImageArrange Pro

• Upload unlimited images in one click
• Drag & drop images to reorder
• Select multiple images with Ctrl/Cmd+Click
• Adjust PDF settings (size, orientation, margins)
• Export to PDF

Keyboard Shortcuts:
• Arrow Left/Right: Navigate pages
• Home/End: First/Last page
• Double-click image: View in preview`);
    });

    // Save (save settings to server)
    document.getElementById('btn-save')?.addEventListener('click', async () => {
        if (window.UploadManager?.getSessionId()) {
            Utils.showToast('Settings saved automatically!', 'success');
        } else {
            Utils.showToast('Nothing to save', 'info');
        }
    });

    // Initialize managers if DOMContentLoaded fired after their initialization
    if (!window.UploadManager) {
        console.warn('UploadManager not initialized yet');
    }
    if (!window.GalleryManager) {
        console.warn('GalleryManager not initialized yet');
    }
    if (!window.PreviewManager) {
        console.warn('PreviewManager not initialized yet');
    }
    if (!window.SettingsManager) {
        console.warn('SettingsManager not initialized yet');
    }
    if (!window.ExportManager) {
        console.warn('ExportManager not initialized yet');
    }
});
