// Authentication middleware for route protection.
function requireAuth(req, res, next) {
    // If not logged in, store a message and redirect to login.
    if (!req.session.loggedin) {
        req.session.loginError = 'Please login to continue';
        return res.redirect('/login');
    }
    // User is authenticated, continue to the route handler.
    next();
}

function requireAdmin(req, res, next) {
    // Admin-only check: must be logged in and flagged as admin.
    if (!req.session.loggedin || !req.session.isAdmin) {
        req.session.loginError = 'Access denied. Admins only.';
        return res.redirect('/login');
    }
    // User is authorized as admin.
    next();
}

// Attach common session data to res.locals for all views.
function attachLocals(req, res, next) {
    // These values are read by EJS templates to show/hide UI.
    res.locals.loggedin = req.session.loggedin || false;
    res.locals.username = req.session.username || '';
    res.locals.isAdmin = req.session.isAdmin || false;
    res.locals.userId = req.session.userId || null;
    next();
}

// Export middleware helpers for reuse in routes.
module.exports = { requireAuth, requireAdmin, attachLocals };
