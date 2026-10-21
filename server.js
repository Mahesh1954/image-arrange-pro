// ========================================
// ImageArrange Pro - Server
// ========================================

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');
const sharp = require('sharp');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static('public'));

// Ensure directories exist
const dirs = ['uploads', 'output'];
dirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
});

// File upload configuration - NO LIMIT
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 
'image/tiff'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images are allowed.'), false);
    }
};

// UNLIMITED FILES - No limit parameter
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB per file (individual file limit)
    },
    fileFilter: fileFilter
});

// In-memory session storage
const sessions = new Map();

// ========================================
// ROUTES
// ========================================

// Create new session
app.post('/api/sessions', (req, res) => {
    const sessionId = uuidv4();
    sessions.set(sessionId, {
        id: sessionId,
        images: [],
        settings: {
            pageSize: 'a4',
            orientation: 'portrait',
            marginTop: 15,
            marginBottom: 15,
            marginLeft: 15,
            marginRight: 15,
            imageFit: 'contain',
            backgroundColor: '#ffffff',
            quality: 'high',
            outputFormat: 'pdf'
        },
        createdAt: new Date(),
        updatedAt: new Date()
    });
    res.json({ sessionId, message: 'Session created successfully' });
});

// Get session data
app.get('/api/sessions/:sessionId', (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
});

// Upload images - UNLIMITED
app.post('/api/sessions/:sessionId/upload', upload.array('images'), async (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedImages = [];

    for (const file of req.files) {
        // Generate thumbnail
        const thumbnailName = `thumb_${file.filename}`;
        const thumbnailPath = path.join(__dirname, 'uploads', thumbnailName);
        
        try {
            await sharp(file.path)
                .resize(200, 200, { fit: 'inside' })
                .toFile(thumbnailPath);
        } catch (err) {
            console.error('Thumbnail generation error:', err);
        }

        // Get image metadata
        let metadata = {};
        try {
            metadata = await sharp(file.path).metadata();
        } catch (err) {
            console.error('Metadata extraction error:', err);
        }

        const imageData = {
            id: uuidv4(),
            filename: file.filename,
            originalName: file.originalname,
            path: `/uploads/${file.filename}`,
            thumbnailPath: `/uploads/${thumbnailName}`,
            size: file.size,
            width: metadata.width || 0,
            height: metadata.height || 0,
            mimeType: file.mimetype,
            order: session.images.length,
            uploadedAt: new Date()
        };

        session.images.push(imageData);
        uploadedImages.push(imageData);
    }

    session.updatedAt = new Date();
    res.json({ 
        message: `${uploadedImages.length} images uploaded successfully`,
        images: uploadedImages,
        totalImages: session.images.length
    });
});

// Remove image
app.delete('/api/sessions/:sessionId/images/:imageId', (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    const imageIndex = session.images.findIndex(img => img.id === req.params.imageId);
    if (imageIndex === -1) {
        return res.status(404).json({ error: 'Image not found' });
    }

    const image = session.images[imageIndex];

    // Delete files
    try {
        const filePath = path.join(__dirname, 'uploads', image.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        const thumbFilename = `thumb_${image.filename}`;
        const thumbPath = path.join(__dirname, 'uploads', thumbFilename);
        if (fs.existsSync(thumbPath)) {
            fs.unlinkSync(thumbPath);
        }
    } catch (err) {
        console.error('File deletion error:', err);
    }

    session.images.splice(imageIndex, 1);
    session.updatedAt = new Date();

    res.json({ message: 'Image deleted successfully', remainingImages: session.images.length });
});

// Reorder images
app.put('/api/sessions/:sessionId/reorder', (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    const { imageIds } = req.body;
    if (!Array.isArray(imageIds)) {
        return res.status(400).json({ error: 'imageIds must be an array' });
    }

    const reorderedImages = [];
    imageIds.forEach((id, index) => {
        const image = session.images.find(img => img.id === id);
        if (image) {
            image.order = index;
            reorderedImages.push(image);
        }
    });

    const providedIds = new Set(imageIds);
    session.images.forEach(img => {
        if (!providedIds.has(img.id)) {
            img.order = reorderedImages.length;
            reorderedImages.push(img);
        }
    });

    session.images = reorderedImages;
    session.updatedAt = new Date();

    res.json({ message: 'Images reordered successfully', images: session.images });
});

// Update settings
app.put('/api/sessions/:sessionId/settings', (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    const { settings } = req.body;
    session.settings = { ...session.settings, ...settings };
    session.updatedAt = new Date();

    res.json({ message: 'Settings updated successfully', settings: session.settings });
});

// Generate PDF
app.post('/api/sessions/:sessionId/export/pdf', async (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    if (session.images.length === 0) {
        return res.status(400).json({ error: 'No images to export' });
    }

    try {
        const outputFilename = `output_${uuidv4()}.pdf`;
        const outputPath = path.join(__dirname, 'output', outputFilename);
        
        const pageSize = getPageSize(session.settings.pageSize, session.settings.orientation);
        const doc = new PDFDocument({
            size: pageSize,
            margin: session.settings.marginTop
        });

        const writeStream = fs.createWriteStream(outputPath);
        doc.pipe(writeStream);

        for (let i = 0; i < session.images.length; i++) {
            const image = session.images[i];
            const imagePath = path.join(__dirname, 'uploads', image.filename);

            if (i > 0) {
                doc.addPage();
            }

            const pageWidth = doc.page.width - (session.settings.marginLeft + 
session.settings.marginRight);
            const pageHeight = doc.page.height - (session.settings.marginTop + 
session.settings.marginBottom);

            try {
                if (session.settings.imageFit === 'contain') {
                    doc.image(imagePath, session.settings.marginLeft, session.settings.marginTop, {
                        fit: [pageWidth, pageHeight],
                        align: 'center',
                        valign: 'center'
                    });
                } else if (session.settings.imageFit === 'cover') {
                    doc.image(imagePath, session.settings.marginLeft, session.settings.marginTop, {
                        fit: [pageWidth, pageHeight],
                        align: 'center',
                        valign: 'center'
                    });
                } else if (session.settings.imageFit === 'fill') {
                    doc.image(imagePath, session.settings.marginLeft, session.settings.marginTop, {
                        width: pageWidth,
                        height: pageHeight
                    });
                } else {
                    doc.image(imagePath, session.settings.marginLeft, session.settings.marginTop, {
                        fit: [pageWidth, pageHeight],
                        align: 'center',
                        valign: 'center'
                    });
                }
            } catch (imgErr) {
                console.error('Error adding image to PDF:', imgErr);
            }
        }

        doc.end();

        writeStream.on('finish', () => {
            res.json({
                success: true,
                downloadUrl: `/output/${outputFilename}`,
                filename: outputFilename,
                pageCount: session.images.length
            });
        });

        writeStream.on('error', (err) => {
            console.error('PDF generation error:', err);
            res.status(500).json({ error: 'Error generating PDF' });
        });

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Error exporting PDF' });
    }
});

// Delete session
app.delete('/api/sessions/:sessionId', (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    session.images.forEach(img => {
        try {
            const filePath = path.join(__dirname, 'uploads', img.filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            const thumbPath = path.join(__dirname, 'uploads', `thumb_${img.filename}`);
            if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
        } catch (err) {
            console.error('File deletion error:', err);
        }
    });

    sessions.delete(req.params.sessionId);
    res.json({ message: 'Session deleted successfully' });
});

// Serve static files
app.use('/output', express.static(path.join(__dirname, 'output')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: err.message || 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Page size helper
function getPageSize(size, orientation) {
    const sizes = {
        'a4': { width: 595.28, height: 841.89 },
        'letter': { width: 612, height: 792 },
        'legal': { width: 612, height: 1008 },
        'a3': { width: 841.89, height: 1190.55 },
        'a5': { width: 420.94, height: 595.28 }
    };

    let pageSize = sizes[size] || sizes['a4'];

    if (orientation === 'landscape') {
        pageSize = { width: pageSize.height, height: pageSize.width };
    }

    return [pageSize.width, pageSize.height];
}

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🎉 ImageArrange Pro Server is running!               ║
║                                                        ║
║   📍 Local:    http://localhost:${PORT}                ║
║   📍 Home:     http://localhost:${PORT}/index.html     ║
║                                                        ║
║   ✨ Unlimited image uploads enabled!                  ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;
