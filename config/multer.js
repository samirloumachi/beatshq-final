// Multer handles multipart/form-data file uploads.
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Audio file upload configuration.
const audioStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        // Ensure the audio upload directory exists.
        const uploadPath = './samples/audio';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function(req, file, cb) {
        // Use a timestamp + random suffix to avoid collisions.
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// Audio upload middleware with extension and size checks.
const uploadAudio = multer({
    storage: audioStorage,
    fileFilter: function(req, file, cb) {
        // Allow only supported audio extensions.
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExts = ['.mp3', '.wav', '.m4a', '.ogg'];
        if (!allowedExts.includes(ext)) {
            return cb(new Error('Only audio files are allowed'));
        }
        cb(null, true);
    },
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Image file upload configuration for pack covers.
const imageStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        // Ensure the cover image directory exists.
        const uploadPath = './public/images/pack-covers';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function(req, file, cb) {
        // Build a readable slug from the pack name for the filename.
        const ext = path.extname(file.originalname).toLowerCase();
        const rawName = req.body && req.body.name ? req.body.name : '';
        const slug = rawName
            .toString()
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .replace(/-+/g, '-');

        // Fallback to a unique name if the slug is empty.
        const base = slug || (Date.now() + '-' + Math.round(Math.random() * 1E9));
        let filename = `${base}${ext}`;
        const fullPath = path.join('./public/images/pack-covers', filename);

        // Avoid overwriting existing files by adding a counter.
        if (fs.existsSync(fullPath)) {
            let counter = 1;
            while (fs.existsSync(path.join('./public/images/pack-covers', `${base}-${counter}${ext}`))) {
                counter += 1;
            }
            filename = `${base}-${counter}${ext}`;
        }

        cb(null, filename);
    }
});

// Image upload middleware with extension and size checks.
const uploadImage = multer({
    storage: imageStorage,
    fileFilter: function(req, file, cb) {
        // Allow only supported image extensions.
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        if (!allowedExts.includes(ext)) {
            return cb(new Error('Only image files are allowed'));
        }
        cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Export both upload middleware variants.
module.exports = { uploadAudio, uploadImage };
