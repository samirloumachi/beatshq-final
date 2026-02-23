// Centralized application constants and configuration.
module.exports = {
    // File upload limits (used by upload middleware and UI validation).
    MAX_AUDIO_SIZE: 50 * 1024 * 1024, // 50MB
    MAX_IMAGE_SIZE: 5 * 1024 * 1024,  // 5MB
    
    // Allowed file extensions for validation and filtering.
    ALLOWED_AUDIO_EXTS: ['.mp3', '.wav', '.m4a', '.ogg'],
    ALLOWED_IMAGE_EXTS: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    
    // Default values used across the app.
    DEFAULT_CREDITS: 10,
    SESSION_MAX_AGE: 1000 * 60 * 60 * 24, // 24 hours
    
    // Shared error messages to keep wording consistent.
    ERRORS: {
        AUTH_REQUIRED: 'Please login to continue',
        ADMIN_REQUIRED: 'Access denied. Admins only.',
        INSUFFICIENT_CREDITS: 'Insufficient credits',
        ALREADY_DOWNLOADED: 'You have already downloaded this',
        NOT_FOUND: 'Resource not found',
        DATABASE_ERROR: 'Database error occurred'
    },
    
    // Shared success messages for UI feedback.
    SUCCESS: {
        UPLOAD: 'Upload successful!',
        UPDATE: 'Updated successfully!',
        DELETE: 'Deleted successfully!',
        DOWNLOAD: 'Download started!'
    }
};
