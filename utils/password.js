// Node.js crypto utilities for secure password hashing.
const crypto = require('crypto');

function hashPassword(password) {
    // Generate a unique salt per user.
    const salt = crypto.randomBytes(16).toString('hex');
    // Derive a strong key using scrypt.
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return { salt, hash };
}

function verifyPassword(password, salt, hash) {
    // Recreate the hash using the saved salt and compare.
    const hashToVerify = crypto.scryptSync(password, salt, 64).toString('hex');
    return hashToVerify === hash;
}

// Export helpers for registration and login.
module.exports = { hashPassword, verifyPassword };
