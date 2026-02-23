// Database connection and password helpers.
const conn = require('../dbConfig.js');
const { hashPassword, verifyPassword } = require('../utils/password.js');

module.exports = function(app) {
    // Render login page with any flash messages.
    app.get('/login', (req, res) => {
        const error = req.session.loginError;
        const success = req.session.loginSuccess;
        delete req.session.loginError;
        delete req.session.loginSuccess;
        
        res.render('login', { error, success });
    });

    // Render registration form.
    app.get('/register', (req, res) => {
        res.render('register', {
            error: null,
            success: null,
            formData: {}
        });
    });

    // Create a new user account.
    app.post('/register', (req, res) => {
        const { username, email, password, password2 } = req.body;
        // Helper to re-render with a single error message.
        const renderError = (error) => res.render('register', { error, success: null, formData: { username, email } });
        
        // Validate password confirmation.
        if (password !== password2) {
            return renderError('Passwords do not match!');
        }
        
        // Check for existing username.
        conn.query('SELECT * FROM users WHERE name = ?', [username], (error, results) => {
            if (error) return renderError('Database error');
            if (results.length) return renderError('Username already taken!');
            
            // Hash password before storing it.
            const { salt, hash } = hashPassword(password);
            const sql = 'INSERT INTO users (name, email, password_hash, salt) VALUES (?, ?, ?, ?)';
            
            conn.query(sql, [username, email, hash, salt], (error) => {
                if (error) return renderError('Error creating account');
                
                // Show success on the login page.
                req.session.loginSuccess = 'Account created! Please login.';
                res.redirect('/login');
            });
        });
    });

    // Authenticate a user and create a session.
    app.post('/auth', (req, res) => {
        const { username, password } = req.body;
        
        // Look up the user record.
        conn.query('SELECT * FROM users WHERE name = ?', [username], (error, results) => {
            if (error || results.length === 0) {
                req.session.loginError = 'Incorrect username or password!';
                return res.redirect('/login');
            }
            
            const user = results[0];
            // Verify hashed password using the stored salt.
            const isValid = verifyPassword(password, user.salt, user.password_hash);
            
            if (!isValid) {
                req.session.loginError = 'Incorrect username or password!';
                return res.redirect('/login');
            }
            
            // Save session state for later requests.
            req.session.loggedin = true;
            req.session.username = username;
            req.session.userId = user.id;
            req.session.isAdmin = user.is_admin == 1 || user.is_admin === true;
            
            // Admins land on the dashboard; users go home.
            res.redirect(req.session.isAdmin ? '/admin' : '/');
        });
    });

    // End the session and send the user back to login.
    app.get('/logout', (req, res) => {
        req.session.destroy();
        res.redirect('/login');
    });
};
