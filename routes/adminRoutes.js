// Admin routes for managing samples, packs, and users.
const conn = require('../dbConfig.js');
const { requireAdmin } = require('../middleware/auth');
const { uploadAudio, uploadImage } = require('../config/multer');
const path = require('path');
const fs = require('fs');

module.exports = function(app) {
    // Helper: keep the current admin tab sticky across redirects.
    const getTab = (req, fallback) => (req.query && req.query.tab) || (req.body && req.body.tab) || (req.session && req.session.adminTab) || fallback;
    const redirectWithTab = (req, res, fallback) => res.redirect(`/admin?tab=${getTab(req, fallback)}`);
    
    // Admin dashboard view (UI loads tab data via JS).
    app.get('/admin', requireAdmin, (req, res) => {
        const success = req.session.adminSuccess;
        const error = req.session.adminError;
        delete req.session.adminSuccess;
        delete req.session.adminError;

        const activeTab = getTab(req, 'upload');
        req.session.adminTab = activeTab;
        res.render('admin', { success, error, activeTab });
    });
    
    // API: list all samples for the admin table.
    app.get('/admin/samples', requireAdmin, (req, res) => {
        const sql = `
            SELECT s.*, u.name as uploader_name, COALESCE(sp.name, '') as pack_name
            FROM samples s
            LEFT JOIN users u ON s.uploaded_by = u.id
            LEFT JOIN sample_packs sp ON s.pack_id = sp.id
            ORDER BY s.upload_date DESC
        `;
        conn.query(sql, (error, results) => {
            if (error) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ samples: results });
        });
    });
    
    // Upload new sample (audio file + metadata).
    app.post('/admin/upload-sample', requireAdmin, uploadAudio.single('audioFile'), (req, res) => {
        if (!req.file) {
            req.session.adminError = 'No file uploaded';
            return redirectWithTab(req, res, 'upload');
        }
        
        const { title, type, bpm, pack_id, credits } = req.body;
        const packIdValue = parseInt(pack_id, 10);

        // Pack is required to keep samples organized.
        if (!packIdValue) {
            req.session.adminError = 'Please select a pack for this sample';
            return redirectWithTab(req, res, 'upload');
        }
        
        // Normalize type and enforce BPM for loops/tracks.
        const normalizedType = (type || 'sample').toLowerCase();
        const bpmValue = (normalizedType === 'loop' || normalizedType === 'track') ? (bpm || null) : null;
        if ((normalizedType === 'loop' || normalizedType === 'track') && !bpmValue) {
            fs.unlinkSync(req.file.path);
            req.session.adminError = 'BPM is required for loops and tracks';
            return redirectWithTab(req, res, 'upload');
        }

        const creditsValue = parseInt(credits) || 1;
        // Build a clean filename from the title.
        const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const newFilename = sanitizedTitle + path.extname(req.file.originalname);
        const oldPath = req.file.path;
        const newPath = path.join('./samples/audio', newFilename);
        
        // Rename the uploaded temp file to the final name.
        fs.renameSync(oldPath, newPath);
        
        const sql = 'INSERT INTO samples (title, filename, type, credits, bpm, pack_id, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)';
        
        conn.query(sql, [title, newFilename, normalizedType, creditsValue, bpmValue, packIdValue, req.session.userId], (error) => {
            if (error) {
                // Roll back the file if the DB insert fails.
                fs.unlinkSync(newPath);
                req.session.adminError = 'Error saving sample to database';
                return redirectWithTab(req, res, 'upload');
            }
            
            req.session.adminSuccess = 'Sample uploaded successfully!';
            redirectWithTab(req, res, 'upload');
        });
    });
    
    // Edit sample metadata.
    app.post('/admin/edit-sample/:id', requireAdmin, (req, res) => {
        const { id } = req.params;
        const { title, type, bpm, pack_id, credits } = req.body;
        const packIdValue = parseInt(pack_id, 10);
        if (!packIdValue) {
            req.session.adminError = 'Please select a pack for this sample';
            return redirectWithTab(req, res, 'samples');
        }
        const normalizedType = (type || 'sample').toLowerCase();
        const bpmValue = (normalizedType === 'loop' || normalizedType === 'track') ? (bpm || null) : null;
        if ((normalizedType === 'loop' || normalizedType === 'track') && !bpmValue) {
            req.session.adminError = 'BPM is required for loops and tracks';
            return redirectWithTab(req, res, 'samples');
        }
        const creditsValue = parseInt(credits) || 1;
        const sql = 'UPDATE samples SET title = ?, type = ?, bpm = ?, credits = ?, pack_id = ? WHERE id = ?';
        
        conn.query(sql, [title, normalizedType, bpmValue, creditsValue, packIdValue, id], (error) => {
            if (error) {
                console.error('Error updating sample:', error);
                // Surface referential integrity errors in a friendly way.
                if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.errno === 1452) {
                    req.session.adminError = 'Selected pack no longer exists';
                } else {
                    req.session.adminError = 'Error updating sample: ' + error.message;
                }
                req.session.adminSuccess = null;
            } else {
                req.session.adminError = null;
                req.session.adminSuccess = 'Sample updated successfully!';
            }
            redirectWithTab(req, res, 'samples');
        });
    });
    
    // Delete a sample and its audio file.
    app.post('/admin/delete-sample/:id', requireAdmin, (req, res) => {
        const { id } = req.params;
        
        // Look up the filename so we can remove the file after deletion.
        conn.query('SELECT filename FROM samples WHERE id = ?', [id], (error, results) => {
            if (error || !results.length) {
                req.session.adminError = 'Sample not found';
                return redirectWithTab(req, res, 'samples');
            }
            
            const filePath = path.join('./samples/audio', results[0].filename);
            
            conn.query('DELETE FROM samples WHERE id = ?', [id], (error) => {
                if (error) {
                    req.session.adminError = 'Error deleting sample';
                    return redirectWithTab(req, res, 'samples');
                }
                
                // Remove the file from disk if it exists.
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
                
                req.session.adminSuccess = 'Sample deleted successfully!';
                redirectWithTab(req, res, 'samples');
            });
        });
    });
    
    // API: list users for the admin table.
    app.get('/admin/users', requireAdmin, (req, res) => {
        const sql = 'SELECT id, name, email, is_admin, credits, created_at FROM users ORDER BY created_at DESC';
        conn.query(sql, (error, results) => {
            if (error) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ users: results });
        });
    });

    // API: list recent credit grants for the admin audit table.
    app.get('/admin/credit-grants', requireAdmin, (req, res) => {
        const sql = `
            SELECT cg.id, cg.amount, cg.note, cg.created_at,
                   g.id AS grantor_id, g.name AS grantor_name,
                   r.id AS recipient_id, r.name AS recipient_name
            FROM credit_grants cg
            JOIN users g ON g.id = cg.grantor_id
            JOIN users r ON r.id = cg.recipient_id
            ORDER BY cg.created_at DESC
            LIMIT 50
        `;
        conn.query(sql, (error, results) => {
            if (error) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ grants: results });
        });
    });

    // Grant credits to a user (admin-only).
    app.post('/admin/grant-credits', requireAdmin, (req, res) => {
        const recipientId = parseInt(req.body.recipient_id, 10);
        const amount = parseInt(req.body.amount, 10);
        const note = (req.body.note || '').trim();

        if (!recipientId || !amount || amount <= 0) {
            req.session.adminError = 'Please select a user and enter a positive credit amount';
            return redirectWithTab(req, res, 'users');
        }

        const grantorId = req.session.userId;
        if (!grantorId) {
            req.session.adminError = 'Admin session missing user id. Please log in again.';
            return redirectWithTab(req, res, 'users');
        }

        conn.beginTransaction((txError) => {
            if (txError) {
                req.session.adminError = 'Error starting credit transaction';
                return redirectWithTab(req, res, 'users');
            }

            conn.query('SELECT id FROM users WHERE id = ?', [recipientId], (userError, userResults) => {
                if (userError || !userResults.length) {
                    return conn.rollback(() => {
                        req.session.adminError = 'Recipient not found';
                        redirectWithTab(req, res, 'users');
                    });
                }

                conn.query('UPDATE users SET credits = credits + ? WHERE id = ?', [amount, recipientId], (updateError) => {
                    if (updateError) {
                        return conn.rollback(() => {
                            req.session.adminError = 'Error updating credits';
                            redirectWithTab(req, res, 'users');
                        });
                    }

                    conn.query(
                        'INSERT INTO credit_grants (grantor_id, recipient_id, amount, note) VALUES (?, ?, ?, ?)',
                        [grantorId, recipientId, amount, note || null],
                        (insertError) => {
                            if (insertError) {
                                return conn.rollback(() => {
                                    console.error('Credit grant insert failed:', insertError);
                                    if (insertError.code === 'ER_NO_SUCH_TABLE') {
                                        req.session.adminError = 'Credit grants table missing. Run database-setup.sql.';
                                    } else if (insertError.code === 'ER_NO_REFERENCED_ROW_2') {
                                        req.session.adminError = 'Credit grant failed: user record missing.';
                                    } else {
                                        req.session.adminError = 'Error recording credit grant';
                                    }
                                    redirectWithTab(req, res, 'users');
                                });
                            }

                            conn.commit((commitError) => {
                                if (commitError) {
                                    return conn.rollback(() => {
                                        req.session.adminError = 'Error saving credit grant';
                                        redirectWithTab(req, res, 'users');
                                    });
                                }

                                req.session.adminSuccess = 'Credits granted successfully!';
                                redirectWithTab(req, res, 'users');
                            });
                        }
                    );
                });
            });
        });
    });
    
    // Toggle admin status for a user.
    app.post('/admin/toggle-admin/:id', requireAdmin, (req, res) => {
        const userId = parseInt(req.params.id);
        
        // Prevent self-demotion.
        if (userId === req.session.userId) {
            req.session.adminError = 'You cannot change your own admin status';
            return redirectWithTab(req, res, 'users');
        }
        
        conn.query('UPDATE users SET is_admin = NOT is_admin WHERE id = ?', [userId], (error) => {
            req.session.adminError = error ? 'Error updating user' : null;
            req.session.adminSuccess = error ? null : 'User admin status updated!';
            redirectWithTab(req, res, 'users');
        });
    });
    
    // Delete a user account.
    app.post('/admin/delete-user/:id', requireAdmin, (req, res) => {
        const userId = parseInt(req.params.id);
        
        // Prevent self-deletion from the admin panel.
        if (userId === req.session.userId) {
            req.session.adminError = 'You cannot delete your own account';
            return redirectWithTab(req, res, 'users');
        }
        
        conn.query('DELETE FROM users WHERE id = ?', [userId], (error) => {
            req.session.adminError = error ? 'Error deleting user' : null;
            req.session.adminSuccess = error ? null : 'User deleted successfully!';
            redirectWithTab(req, res, 'users');
        });
    });
    
    // ===== Sample Pack Management =====
    
    // API: list all sample packs with sample counts and total credits.
    app.get('/admin/packs', requireAdmin, function(req, res) {
        // First get all packs.
        var sql = 'SELECT * FROM sample_packs ORDER BY created_at DESC';
        
        conn.query(sql, function(error, packs) {
            if (error) {
                console.error('Error loading packs:', error);
                return res.status(500).json({ error: 'Database error', details: error.message });
            }
            
            // Then get sample counts and total credits for each pack.
            var packIds = packs.map(p => p.id);
            if (packIds.length === 0) {
                console.log('No packs found');
                return res.json({ packs: [] });
            }
            
            var countSql = 'SELECT pack_id, COUNT(*) as sample_count, SUM(credits) as total_credits FROM samples WHERE pack_id IN (?) GROUP BY pack_id';
            conn.query(countSql, [packIds], function(err, counts) {
                // Add sample counts and total credits to packs.
                packs.forEach(pack => {
                    var countData = counts ? counts.find(c => c.pack_id === pack.id) : null;
                    pack.sample_count = countData ? countData.sample_count : 0;
                    pack.total_credits = countData ? (countData.total_credits || 0) : 0;
                    pack.creator_name = 'Admin'; // You can enhance this later
                });
                
                console.log('Packs loaded:', packs.length);
                res.json({ packs: packs });
            });
        });
    });
    
    // Create new sample pack (with optional cover image).
    app.post('/admin/create-pack', requireAdmin, uploadImage.single('coverImage'), function(req, res) {
        console.log('Create pack route hit!', req.body);
        console.log('File uploaded:', req.file ? req.file.filename : 'No file');
        var { name, description, genre } = req.body;
        
        // Pack name is required; remove uploaded file if missing.
        if (!name) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            req.session.adminError = 'Pack name is required';
            return redirectWithTab(req, res, 'packs');
        }
        
        var coverImage = req.file ? req.file.filename : null;
        
        var sql = 'INSERT INTO sample_packs (name, description, genre, cover_image, created_by) VALUES (?, ?, ?, ?, ?)';
        
        conn.query(sql, [name, description || '', genre || '', coverImage, req.session.userId], function(error, result) {
            if (error) {
                // Remove cover image if the DB insert fails.
                if (coverImage) {
                    var filePath = path.join('./public/images/pack-covers', coverImage);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                }
                console.error('Pack creation error:', error);
                req.session.adminError = 'Error creating pack: ' + error.message;
                return redirectWithTab(req, res, 'packs');
            }
            
            console.log('Pack created successfully!', result.insertId);
            req.session.adminSuccess = 'Sample pack created successfully!';
            redirectWithTab(req, res, 'packs');
        });
    });
    
    // Edit sample pack metadata and optionally replace the cover image.
    app.post('/admin/edit-pack/:id', requireAdmin, uploadImage.single('coverImage'), function(req, res) {
        var packId = req.params.id;
        var { name, description, genre } = req.body;
        
        // Validate required fields before proceeding.
        if (!name) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            req.session.adminError = 'Pack name is required';
            return redirectWithTab(req, res, 'packs');
        }
        
        // If there's a new image, get the old image first to delete it.
        if (req.file) {
            conn.query('SELECT cover_image FROM sample_packs WHERE id = ?', [packId], function(error, results) {
                if (error) {
                    console.error('Error fetching old image:', error);
                    fs.unlinkSync(req.file.path);
                    req.session.adminError = 'Error updating pack';
                    return redirectWithTab(req, res, 'packs');
                }
                
                var oldImage = results && results.length > 0 ? results[0].cover_image : null;
                
                var sql = 'UPDATE sample_packs SET name = ?, description = ?, genre = ?, cover_image = ? WHERE id = ?';
                conn.query(sql, [name, description, genre, req.file.filename, packId], function(updateError) {
                    if (updateError) {
                        console.error('Error updating pack with image:', updateError);
                        fs.unlinkSync(req.file.path);
                        req.session.adminError = 'Error updating pack';
                        return redirectWithTab(req, res, 'packs');
                    }
                    
                    // Delete old image if it exists.
                    if (oldImage) {
                        var oldImagePath = path.join('./public/images/pack-covers', oldImage);
                        if (fs.existsSync(oldImagePath)) {
                            fs.unlinkSync(oldImagePath);
                        }
                    }
                    
                    req.session.adminSuccess = 'Sample pack updated successfully!';
                    redirectWithTab(req, res, 'packs');
                });
            });
        } else {
            // No new image, just update other fields.
            var sql = 'UPDATE sample_packs SET name = ?, description = ?, genre = ? WHERE id = ?';
            conn.query(sql, [name, description, genre, packId], function(error) {
                if (error) {
                    console.error('Error updating pack without image:', error);
                    req.session.adminError = 'Error updating pack';
                    return redirectWithTab(req, res, 'packs');
                }
                
                req.session.adminSuccess = 'Sample pack updated successfully!';
                redirectWithTab(req, res, 'packs');
            });
        }
    });
    
    // Delete sample pack (samples remain but lose their pack association).
    app.post('/admin/delete-pack/:id', requireAdmin, function(req, res) {
        var packId = req.params.id;
        
        // This will set pack_id to NULL for all samples in this pack (due to ON DELETE SET NULL).
        conn.query('DELETE FROM sample_packs WHERE id = ?', [packId], function(error) {
            if (error) {
                req.session.adminError = 'Error deleting pack';
                return redirectWithTab(req, res, 'packs');
            }
            
            req.session.adminSuccess = 'Sample pack deleted successfully!';
            redirectWithTab(req, res, 'packs');
        });
    });
    
    // API: list samples for a specific pack.
    app.get('/admin/pack-samples/:id', requireAdmin, function(req, res) {
        var packId = req.params.id;
        
        conn.query('SELECT * FROM samples WHERE pack_id = ? ORDER BY upload_date DESC', [packId], function(error, results) {
            if (error) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ samples: results });
        });
    });
    
    // API: add a sample to a pack.
    app.post('/admin/add-to-pack', requireAdmin, function(req, res) {
        var { sampleId, packId } = req.body;
        
        conn.query('UPDATE samples SET pack_id = ? WHERE id = ?', [packId, sampleId], function(error) {
            if (error) {
                return res.status(500).json({ error: 'Error adding sample to pack' });
            }
            res.json({ success: true });
        });
    });
    
    // API: remove a sample from a pack.
    app.post('/admin/remove-from-pack/:id', requireAdmin, function(req, res) {
        var sampleId = req.params.id;
        
        conn.query('UPDATE samples SET pack_id = NULL WHERE id = ?', [sampleId], function(error) {
            if (error) {
                return res.status(500).json({ error: 'Error removing sample from pack' });
            }
            res.json({ success: true });
        });
    });
};
