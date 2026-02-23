// MySQL client for Node.js.
const mysql = require('mysql');

// Create a single shared connection using env vars with local defaults.
const conn = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'beatshq_db'
});

// Establish the connection at startup so route handlers can reuse it.
conn.connect(function(err) {
    if (err) {
        console.error('Database connection failed:', err.message);
        throw err;
    }
    console.log('Database connected successfully!');
});

// Export the connection for queries in routes and services.
module.exports = conn;
