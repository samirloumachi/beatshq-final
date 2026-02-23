// Routes for samples, packs, library, and downloads.
const conn = require('../dbConfig.js');
const path = require('path');
const fs = require('fs');

module.exports = function(app) {
    // Preview audio file (stream the MP3 for the player).
    app.get('/samples/preview/:id', function(req, res) {
        var sampleId = req.params.id;
        
        // Look up the sample so we can locate its file.
        conn.query('SELECT * FROM samples WHERE id = ?', [sampleId], function(error, sampleResult) {
            if (error || sampleResult.length === 0) {
                return res.status(404).send('Sample not found');
            }
            
            var sample = sampleResult[0];
            var filePath = path.join(__dirname, '..', 'samples', 'audio', sample.filename);
            
            // Ensure the file exists before streaming.
            if (!fs.existsSync(filePath)) {
                return res.status(404).send('Audio file not found');
            }
            
            // Set headers for basic streaming support.
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Accept-Ranges', 'bytes');
            
            var stat = fs.statSync(filePath);
            res.setHeader('Content-Length', stat.size);
            
            // Stream file contents directly to the response.
            var stream = fs.createReadStream(filePath);
            stream.pipe(res);
        });
    });
    
    // Samples page now redirects to packs (pack-first browsing).
    app.get('/samples', function(req, res) {
        res.redirect('/packs');
    });
    
    // User's library (purchased samples grouped by pack).
    app.get('/library', function(req, res) {
        if (!req.session.loggedin) {
            req.session.loginError = 'Please login to view your library';
            return res.redirect('/login');
        }
        
        // Pull packs the user owns at least one sample from.
        var sql = `
            SELECT sp.id, sp.name, sp.description, sp.genre, sp.created_at, sp.cover_image,
                   COUNT(s.id) as sample_count
            FROM sample_downloads sd
            JOIN samples s ON sd.sample_id = s.id
            JOIN sample_packs sp ON s.pack_id = sp.id
            WHERE sd.user_id = ?
            GROUP BY sp.id
            ORDER BY sp.created_at DESC
        `;
        
        conn.query(sql, [req.session.userId], function(error, packs) {
            if (error) {
                console.error('Error fetching library:', error);
                // Render with an error message but keep the page usable.
                return res.render('library', {
                    loggedin: req.session.loggedin,
                    username: req.session.username,
                    isAdmin: req.session.isAdmin || false,
                    packs: [],
                    error: 'Error loading your library'
                });
            }
            
            // For each pack, get the samples the user owns.
            if (packs.length === 0) {
                return res.render('library', {
                    loggedin: req.session.loggedin,
                    username: req.session.username,
                    isAdmin: req.session.isAdmin || false,
                    packs: [],
                    error: null
                });
            }
            
            var packsWithSamples = [];
            var packsProcessed = 0;
            
            packs.forEach(pack => {
                conn.query(`
                    SELECT s.* FROM sample_downloads sd
                    JOIN samples s ON sd.sample_id = s.id
                    WHERE sd.user_id = ? AND s.pack_id = ?
                    ORDER BY s.upload_date DESC
                `, [req.session.userId, pack.id], function(err, ownedSamples) {
                    // Attach owned samples to each pack result.
                    pack.owned_samples = ownedSamples || [];
                    packsWithSamples.push(pack);
                    packsProcessed++;
                    
                    // Render after all packs have been processed.
                    if (packsProcessed === packs.length) {
                        res.render('library', {
                            loggedin: req.session.loggedin,
                            username: req.session.username,
                            isAdmin: req.session.isAdmin || false,
                            packs: packsWithSamples,
                            error: null
                        });
                    }
                });
            });
        });
    });
    
    // ===== Sample Pack Routes =====
    
    // Browse sample packs with optional filters.
    app.get('/packs', function(req, res) {
        var genreFilter = req.query.genre || '';
        var searchQuery = req.query.search || '';
        
        // Base query: compute counts and credit totals per pack.
        var sql = `
            SELECT DISTINCT sp.*, 
                   COUNT(DISTINCT s.id) as sample_count,
                   COALESCE(SUM(s.credits), 0) as total_credits,
                   GROUP_CONCAT(DISTINCT s.type) as types
            FROM sample_packs sp 
            LEFT JOIN samples s ON s.pack_id = sp.id
            WHERE 1=1
        `;
        var params = [];
        
        // Apply genre filter if selected.
        if (genreFilter) {
            sql += ' AND sp.genre = ?';
            params.push(genreFilter);
        }
        
        // Apply search filter across pack fields and sample titles.
        if (searchQuery) {
            sql += ' AND (sp.name LIKE ? OR sp.description LIKE ? OR EXISTS (SELECT 1 FROM samples WHERE pack_id = sp.id AND title LIKE ?))';
            params.push('%' + searchQuery + '%', '%' + searchQuery + '%', '%' + searchQuery + '%');
        }
        
        sql += ' GROUP BY sp.id ORDER BY sp.created_at DESC';
        
        conn.query(sql, params, function(error, packs) {
            if (error) {
                console.error('Error fetching packs:', error);
                // Render with empty data to keep the page from breaking.
                return res.render('packs', {
                    loggedin: req.session.loggedin || false,
                    username: req.session.username || '',
                    isAdmin: req.session.isAdmin || false,
                    userCredits: 0,
                    packs: [],
                    ownedPackIds: [],
                    genres: [],
                    filters: {},
                    error: 'Error loading packs'
                });
            }
            
            // Load genre list for filter dropdowns.
            conn.query('SELECT DISTINCT genre FROM sample_packs WHERE genre IS NOT NULL ORDER BY genre', function(err, genreResults) {
                var genres = genreResults ? genreResults.map(g => g.genre) : [];
                var filters = { search: searchQuery, genre: genreFilter };
                
                // Fetch matching samples for each pack if search is active.
                if (searchQuery && packs.length > 0) {
                    var packsWithSamples = [];
                    var packsProcessed = 0;
                    
                    packs.forEach(pack => {
                        conn.query('SELECT * FROM samples WHERE pack_id = ? AND title LIKE ? ORDER BY upload_date DESC', [pack.id, '%' + searchQuery + '%'], function(err, samples) {
                            pack.matching_samples = samples || [];
                            packsWithSamples.push(pack);
                            packsProcessed++;
                            
                            if (packsProcessed === packs.length) {
                                // Sort so packs with matching samples appear first.
                                packsWithSamples.sort((a, b) => b.matching_samples.length - a.matching_samples.length);
                                
                                if (req.session.loggedin) {
                                    // Load credits and ownership state for the signed-in user.
                                    conn.query('SELECT credits FROM users WHERE id = ?', [req.session.userId], function(err, userResult) {
                                        const userCredits = userResult && userResult[0] ? userResult[0].credits : 0;
                                        
                                        conn.query('SELECT DISTINCT sp.id FROM sample_downloads sd JOIN samples s ON sd.sample_id = s.id JOIN sample_packs sp ON s.pack_id = sp.id WHERE sd.user_id = ?', [req.session.userId], function(err, packResults) {
                                            const ownedPackIds = packResults ? packResults.map(p => p.id) : [];
                                            
                                            res.render('packs', {
                                                loggedin: req.session.loggedin,
                                                username: req.session.username,
                                                isAdmin: req.session.isAdmin || false,
                                                userCredits: userCredits,
                                                packs: packsWithSamples,
                                                ownedPackIds: ownedPackIds,
                                                genres: genres,
                                                filters: filters,
                                                error: null
                                            });
                                        });
                                    });
                                } else {
                                    // Anonymous view (no credits or ownership).
                                    res.render('packs', {
                                        loggedin: false,
                                        username: '',
                                        isAdmin: false,
                                        userCredits: 0,
                                        packs: packsWithSamples,
                                        ownedPackIds: [],
                                        genres: genres,
                                        filters: filters,
                                        error: null
                                    });
                                }
                            }
                        });
                    });
                } else {
                    // No search or no results - render normally without matching samples.
                    packs.forEach(pack => {
                        pack.matching_samples = [];
                    });
                    
                    if (req.session.loggedin) {
                        // Load credits and ownership state for the signed-in user.
                        conn.query('SELECT credits FROM users WHERE id = ?', [req.session.userId], function(err, userResult) {
                            const userCredits = userResult && userResult[0] ? userResult[0].credits : 0;
                            
                            conn.query('SELECT DISTINCT sp.id FROM sample_downloads sd JOIN samples s ON sd.sample_id = s.id JOIN sample_packs sp ON s.pack_id = sp.id WHERE sd.user_id = ?', [req.session.userId], function(err, packResults) {
                                const ownedPackIds = packResults ? packResults.map(p => p.id) : [];
                                
                                res.render('packs', {
                                    loggedin: req.session.loggedin,
                                    username: req.session.username,
                                    isAdmin: req.session.isAdmin || false,
                                    userCredits: userCredits,
                                    packs: packs,
                                    ownedPackIds: ownedPackIds,
                                    genres: genres,
                                    filters: filters,
                                    error: null
                                });
                            });
                        });
                    } else {
                        // Anonymous view (no credits or ownership).
                        res.render('packs', {
                            loggedin: false,
                            username: '',
                            isAdmin: false,
                            userCredits: 0,
                            packs: packs,
                            ownedPackIds: [],
                            genres: genres,
                            filters: filters,
                            error: null
                        });
                    }
                }
            });
        });
    });
    
    // View pack details and list its samples.
    app.get('/packs/:id', function(req, res) {
        var packId = req.params.id;
        
        // Load pack metadata first.
        conn.query('SELECT * FROM sample_packs WHERE id = ?', [packId], function(error, packResult) {
            if (error || packResult.length === 0) {
                return res.redirect('/packs');
            }
            
            var pack = packResult[0];
            
            // Load samples inside this pack.
            conn.query('SELECT * FROM samples WHERE pack_id = ? ORDER BY upload_date DESC', [packId], function(error, samples) {
                if (error) {
                    samples = [];
                }
                
                // Calculate total pack price by summing all sample credits.
                const totalPackPrice = samples.reduce((sum, sample) => sum + (sample.credits || 0), 0);
                
                if (req.session.loggedin) {
                    // Include user credits for the buy UI.
                    conn.query('SELECT credits FROM users WHERE id = ?', [req.session.userId], function(err, userResult) {
                        const userCredits = userResult && userResult[0] ? userResult[0].credits : 0;
                        
                        res.render('pack-detail', {
                            loggedin: req.session.loggedin,
                            username: req.session.username,
                            isAdmin: req.session.isAdmin || false,
                            userCredits: userCredits,
                            pack: pack,
                            samples: samples,
                            totalPackPrice: totalPackPrice,
                            error: null
                        });
                    });
                } else {
                    // Anonymous view (no credits).
                    res.render('pack-detail', {
                        loggedin: false,
                        username: '',
                        isAdmin: false,
                        userCredits: 0,
                        pack: pack,
                        samples: samples,
                        totalPackPrice: totalPackPrice,
                        error: null
                    });
                }
            });
        });
    });
    
    // Download owned sample (GET - re-download files you already own).
    app.get('/samples/download/:id', function(req, res) {
        if (!req.session.loggedin) {
            return res.status(401).send('Please login to download samples');
        }
        
        var sampleId = req.params.id;
        var userId = req.session.userId;
        
        // Verify ownership before allowing download.
        conn.query('SELECT * FROM sample_downloads WHERE user_id = ? AND sample_id = ?', [userId, sampleId], function(error, ownership) {
            if (error || ownership.length === 0) {
                return res.status(403).send('You do not own this sample');
            }
            
            // Get sample file details.
            conn.query('SELECT * FROM samples WHERE id = ?', [sampleId], function(error, sampleResult) {
                if (error || sampleResult.length === 0) {
                    return res.status(404).send('Sample not found');
                }
                
                var sample = sampleResult[0];
                var filePath = path.join(__dirname, '..', 'samples', 'audio', sample.filename);
                
                // Serve the file as a download.
                res.download(filePath, sample.filename, function(err) {
                    if (err) {
                        console.error('Error downloading file:', err);
                        res.status(500).send('Error downloading file');
                    }
                });
            });
        });
    });
    
    // Purchase individual sample (POST - buy and download).
    app.post('/samples/download/:id', function(req, res) {
        if (!req.session.loggedin) {
            req.session.loginError = 'Please login to download samples';
            return res.redirect('/login');
        }
        
        var sampleId = req.params.id;
        var userId = req.session.userId;
        
        // Get sample details.
        conn.query('SELECT * FROM samples WHERE id = ?', [sampleId], function(error, sampleResult) {
            if (error || sampleResult.length === 0) {
                return res.redirect('/packs?error=sample_not_found');
            }
            
            var sample = sampleResult[0];
            var packId = sample.pack_id;
            
            // Check if user already owns this sample.
            conn.query('SELECT * FROM sample_downloads WHERE user_id = ? AND sample_id = ?', [userId, sampleId], function(error, existing) {
                if (error) {
                    return res.redirect('/packs/' + packId + '?error=database');
                }
                
                if (existing.length > 0) {
                    // Already owns it - serve the file directly.
                    var filePath = path.join(__dirname, '..', 'samples', 'audio', sample.filename);
                    return res.download(filePath, sample.filename, function(err) {
                        if (err) {
                            console.error('Error downloading file:', err);
                            return res.redirect('/packs/' + packId + '?error=download_failed');
                        }
                    });
                }
                
                // Get user credits.
                conn.query('SELECT credits FROM users WHERE id = ?', [userId], function(error, userResult) {
                    if (error || userResult.length === 0) {
                        return res.redirect('/packs?error=user_not_found');
                    }
                    
                    var userCredits = userResult[0].credits;
                    var sampleCost = sample.credits || 1;
                    
                    // Enforce credit balance.
                    if (userCredits < sampleCost) {
                        return res.redirect('/packs/' + packId + '?error=insufficient_credits');
                    }
                    
                    // Deduct credits and record download.
                    conn.query('UPDATE users SET credits = credits - ? WHERE id = ?', [sampleCost, userId], function(error) {
                        if (error) {
                            return res.redirect('/packs?error=update_failed');
                        }
                        
                        conn.query('INSERT INTO sample_downloads (user_id, sample_id, credits_spent) VALUES (?, ?, ?)', [userId, sampleId, sampleCost], function(error) {
                            if (error) {
                                // Roll back credits if insert fails.
                                conn.query('UPDATE users SET credits = credits + ? WHERE id = ?', [sampleCost, userId]);
                                return res.redirect('/packs?error=download_failed');
                            }
                            
                            // Purchase successful - serve the file.
                            var filePath = path.join(__dirname, '..', 'samples', 'audio', sample.filename);
                            res.download(filePath, sample.filename, function(err) {
                                if (err) {
                                    console.error('Error downloading file:', err);
                                }
                            });
                        });
                    });
                });
            });
        });
    });
    
    // Download entire pack (all samples as ZIP).
    app.post('/packs/download/:id', function(req, res) {
        if (!req.session.loggedin) {
            req.session.loginError = 'Please login to download packs';
            return res.redirect('/login');
        }
        
        var packId = req.params.id;
        var userId = req.session.userId;
        
        // Get all samples in pack.
        conn.query('SELECT * FROM samples WHERE pack_id = ?', [packId], function(error, samples) {
            if (error || samples.length === 0) {
                return res.redirect('/packs/' + packId + '?error=no_samples');
            }
            
            // Calculate total cost.
            const totalCost = samples.reduce((sum, sample) => sum + (sample.credits || 0), 0);
            
            // Check user credits.
            conn.query('SELECT credits FROM users WHERE id = ?', [userId], function(error, userResult) {
                if (error || userResult.length === 0) {
                    return res.redirect('/packs?error=user_not_found');
                }
                
                var userCredits = userResult[0].credits;
                
                // If the user cannot afford the total pack, stop here.
                if (userCredits < totalCost) {
                    return res.redirect('/packs/' + packId + '?error=insufficient_credits');
                }
                
                // Get pack name for ZIP.
                conn.query('SELECT name FROM sample_packs WHERE id = ?', [packId], function(error, packResult) {
                    if (error || packResult.length === 0) {
                        return res.redirect('/packs?error=pack_not_found');
                    }
                    
                    var packName = packResult[0].name;
                    
                    // Check which samples user already owns.
                    var sampleIds = samples.map(s => s.id);
                    
                    if (sampleIds.length === 0) {
                        return res.redirect('/packs/' + packId + '?error=no_samples');
                    }
                    
                    conn.query('SELECT sample_id FROM sample_downloads WHERE user_id = ? AND sample_id IN (?)', [userId, sampleIds], function(error, ownedSamples) {
                        var ownedSampleIds = (ownedSamples || []).map(s => s.sample_id);
                        var newSamples = samples.filter(s => !ownedSampleIds.includes(s.id));
                        
                        if (newSamples.length === 0) {
                            // Already owns all samples - create ZIP with all samples and serve.
                            createAndServeZip(samples, packName, res);
                            return;
                        }
                        
                        // Calculate cost for new samples only.
                        const newSamplesCost = newSamples.reduce((sum, sample) => sum + (sample.credits || 0), 0);
                        
                        // Verify balance for the remaining samples.
                        if (userCredits < newSamplesCost) {
                            return res.redirect('/packs/' + packId + '?error=insufficient_credits');
                        }
                        
                        // Deduct credits for only the new samples.
                        conn.query('UPDATE users SET credits = credits - ? WHERE id = ?', [newSamplesCost, userId], function(error) {
                            if (error) {
                                return res.redirect('/packs?error=update_failed');
                            }
                            
                            // Record all new sample downloads.
                            var downloaded = 0;
                            newSamples.forEach(sample => {
                                conn.query('INSERT IGNORE INTO sample_downloads (user_id, sample_id, credits_spent) VALUES (?, ?, ?)', [userId, sample.id, sample.credits || 1], function(err) {
                                    downloaded++;
                                    if (downloaded === newSamples.length) {
                                        // Purchase complete - create ZIP with all owned samples and serve.
                                        createAndServeZip(samples, packName, res);
                                    }
                                });
                            });
                        });
                    });
                });
            });
        });
    });
    
    // Helper: create and stream a ZIP file of sample audio.
    function createAndServeZip(samples, packName, res) {
        const archiver = require('archiver');
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        // Set response headers for a downloadable archive.
        res.attachment(packName.replace(/[^a-z0-9]/gi, '_') + '.zip');
        
        // Pipe the ZIP stream to the response.
        archive.pipe(res);
        
        // Add each sample file to the archive.
        samples.forEach(sample => {
            var filePath = path.join(__dirname, '..', 'samples', 'audio', sample.filename);
            archive.file(filePath, { name: sample.filename });
        });
        
        // Handle archive errors.
        archive.on('error', function(err) {
            console.error('ZIP creation error:', err);
            res.status(500).send('Error creating ZIP file');
        });
        
        // Finalize the archive to start streaming.
        archive.finalize();
    }
};
