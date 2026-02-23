// Core framework and middleware dependencies.
const express = require('express');
const session = require('express-session');
const path = require('path');
const { attachLocals } = require('./middleware/auth');

// Create the Express application instance.
const app = express();

// View engine setup (server-rendered pages with EJS templates).
app.set('view engine', 'ejs');

// Middleware: static assets, form parsing, and JSON parsing.
app.use('/public', express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration: store login state and flash messages.
app.use(session({
    secret: process.env.SESSION_SECRET || 'beatshq-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 hours
}));

// Attach session data to all views so templates can render user state.
app.use(attachLocals);

// Route registration (pages, auth, samples, admin).
require('./routes/pageRoutes')(app);
require('./routes/authRoutes')(app);
require('./routes/sampleRoutes')(app);
require('./routes/adminRoutes')(app);

// 404 handler: render the home page with an error message.
app.use((req, res) => {
    res.status(404).render('home', {
        error: 'Page not found'
    });
});

// Start the HTTP server.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

