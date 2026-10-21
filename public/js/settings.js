// ========================================
// SettingsManager - PDF Settings
// ========================================

class SettingsManager {
    constructor() {
        this.settings = {
            pageSize: 'a4',
            orientation: 'portrait',
            backgroundColor: '#ffffff',
            marginTop: 15,
            marginBottom: 15,
            marginLeft: 15,
            marginRight: 15,
            imageFit: 'contain',
            quality: 'high'
        };
        this.init();
    }

    init() {
        this.setupEvents();
    }

    setupEvents() {
        // Page size
        document.getElementById('page-size')?.addEventListener('change', (e) => {
            this.settings.pageSize = e.target.value;
            this.updatePreview();
            this.syncSettingsToServer();
        });

        // Orientation
        document.getElementById('btn-portrait')?.addEventListener('click', () => {
            this.settings.orientation = 'portrait';
            document.getElementById('btn-portrait').classList.add('active');
            document.getElementById('btn-landscape').classList.remove('active');
            this.updatePreview();
            this.syncSettingsToServer();
        });

        document.getElementById('btn-landscape')?.addEventListener('click', () => {
            this.settings.orientation = 'landscape';
            document.getElementById('btn-landscape').classList.add('active');
            document.getElementById('btn-portrait').classList.remove('active');
            this.updatePreview();
            this.syncSettingsToServer();
        });

        // Background
        document.getElementById('bg-color')?.addEventListener('input', (e) => {
            this.settings.backgroundColor = e.target.value;
            this.updatePreview();
        });

        // Margins
        ['margin-top', 'margin-bottom', 'margin-left', 'margin-right'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', (e) => {
                const value = parseInt(e.target.value) || 0;
                const key = id.replace('margin-', 'margin');
                this.settings[key] = value;
                this.updatePreview();
                this.syncSettingsToServer();
            });
        });

        // Presets
        document.querySelectorAll('.preset').forEach(btn => {
            btn.addEventListener('click', () => {
                const value = parseInt(btn.dataset.value);
                
                ['margin-top', 'margin-bottom', 'margin-left', 'margin-right'].forEach(id => {
                    const input = document.getElementById(id);
                    if (input) input.value = value;
                });
                
                this.settings.marginTop = value;
                this.settings.marginBottom = value;
                this.settings.marginLeft = value;
                this.settings.marginRight = value;
                
                document.querySelectorAll('.preset').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                this.updatePreview();
                this.syncSettingsToServer();
            });
        });

        // Image fit
        document.querySelectorAll('.fit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.settings.imageFit = btn.dataset.fit;
                document.querySelectorAll('.fit-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.updatePreview();
                this.syncSettingsToServer();
            });
        });

        // Quality
        document.getElementById('quality-select')?.addEventListener('change', (e) => {
            this.settings.quality = e.target.value;
            this.syncSettingsToServer();
        });

        // Toggle settings panel
        document.getElementById('btn-toggle-settings')?.addEventListener('click', () => {
            const body = document.getElementById('settings-body');
            const btn = document.getElementById('btn-toggle-settings');
            
            if (body) {
                body.classList.toggle('collapsed');
                if (btn) {
                    btn.innerHTML = body.classList.contains('collapsed') 
                        ? '<i class="fas fa-chevron-down"></i>' 
                        : '<i class="fas fa-chevron-up"></i>';
                }
            }
        });
    }

    async syncSettingsToServer() {
        const sessionId = window.UploadManager?.getSessionId();
        if (!sessionId) return;

        try {
            await fetch(`/api/sessions/${sessionId}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings: this.settings })
            });
        } catch (err) {
            console.error('Failed to sync settings:', err);
        }
    }

    updatePreview() {
        if (window.PreviewManager) {
            window.PreviewManager.updatePreview();
        }
    }

    getSettings() {
        return { ...this.settings };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.SettingsManager = new SettingsManager();
});
