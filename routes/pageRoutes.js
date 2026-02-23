// Database connection for homepage data.
const conn = require('../dbConfig.js');

module.exports = function(app) {
    // Home page: show random packs and ownership status (if logged in).
    app.get('/', (req, res) => {
        // Fetch random packs for the hero section.
        const sql = `
            SELECT sp.*, 
                   COUNT(DISTINCT s.id) as sample_count,
                   COALESCE(SUM(s.credits), 0) as total_credits,
                   GROUP_CONCAT(DISTINCT s.type) as types
            FROM sample_packs sp 
            LEFT JOIN samples s ON s.pack_id = sp.id
            GROUP BY sp.id 
            ORDER BY RAND() 
            LIMIT 3
        `;
        
        conn.query(sql, function(error, randomPacks) {
            if (error) {
                console.error('Error fetching random packs:', error);
                // If the DB fails, render with empty data so the page still loads.
                return res.render('home', {
                    loggedin: req.session.loggedin || false,
                    username: req.session.username || '',
                    isAdmin: req.session.isAdmin || false,
                    randomPacks: []
                });
            }
            
            // If user is logged in, get their owned packs for UI badges.
            if (req.session.loggedin) {
                conn.query('SELECT DISTINCT sp.id FROM sample_downloads sd JOIN samples s ON sd.sample_id = s.id JOIN sample_packs sp ON s.pack_id = sp.id WHERE sd.user_id = ?', [req.session.userId], function(err, packResults) {
                    const ownedPackIds = packResults ? packResults.map(p => p.id) : [];
                    
                    res.render('home', {
                        loggedin: req.session.loggedin,
                        username: req.session.username,
                        isAdmin: req.session.isAdmin || false,
                        randomPacks: randomPacks,
                        ownedPackIds: ownedPackIds
                    });
                });
            } else {
                // Anonymous users see packs but no ownership info.
                res.render('home', {
                    loggedin: false,
                    username: '',
                    isAdmin: false,
                    randomPacks: randomPacks,
                    ownedPackIds: []
                });
            }
        });
    });

    // Static information pages.
    app.get('/about', (req, res) => {
        res.render('about');
    });

    app.get('/privacy-policy', (req, res) => {
        res.render('privacy-policy');
    });
};
