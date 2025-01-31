const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Import routes
const authRoutes = require('./src/routes/auth');
const cartRoutes = require('./src/routes/cart');
const uploadRoutes = require('./src/routes/uploads');
const orderRoutes = require('./src/routes/orders');
const pageRoutes = require('./src/routes/pages');
const userRoutes = require('./src/routes/users');
const subscribeRoutes = require('./src/routes/subscribe');
const favoritesRoutes = require('./src/routes/favorites');
const emailRoutes = require('./src/routes/email');
const searchRoutes = require('./src/routes/search');
const boxRoutes = require('./src/routes/box');

// Essential Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes - Move these BEFORE static file serving
app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/subscribe', subscribeRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/box', boxRoutes);

// Static file serving
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Set content type for specific file extensions
app.get('*.css', (req, res, next) => {
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    next();
});

// Define routes for HTML pages
app.get('/cart', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cart.html'));
});

// Add routes for other pages
app.get('/account', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'account.html'));
});

app.get('/buypage', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'buypage.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

app.get('/controlroom', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'controlroom.html'));
});

app.get('/gallery', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'gallery.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/shows', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'shows.html'));
});

// Special routes for the fall classic pages
app.get('/p24fallclassic1wed', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'p24fallclassic1wed.html'));
});

app.get('/show24fallclassic', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'show24fallclassic.html'));
});

app.get('/week24fallclassic1', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'week24fallclassic1.html'));
});

app.get('/subscribe-test', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'subscribe-test.html'));
});

// Serve index.html for root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error route
app.get('/error', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'error.html'));
});

// Debug middleware - add this before error handler
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'production' ? {} : err.stack
    });
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Server shutting down');
    process.exit(0);
});

module.exports = app;