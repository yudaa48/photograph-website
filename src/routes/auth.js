const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Datastore } = require('@google-cloud/datastore');

// Initialize Datastore
const datastore = new Datastore({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'original-mesh-448418-j2',
    databaseId: process.env.DATASTORE_DATABASE_ID || 'hanacophotography',
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

const USER_KIND = 'User';

// Validation functions
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    return password.length >= 8;
}

// Custom function to check user existence without using index-requiring query
async function findUserByEmail(email) {
    const query = datastore.createQuery(USER_KIND);
    const [users] = await datastore.runQuery(query);
    
    // Client-side filtering to avoid index requirement
    return users.find(user => user.email === email);
}

// Signup endpoint
router.post('/signup', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Input validations
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        if (!validatePassword(password)) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long' });
        }

        // Check if user exists
        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ message: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user entity
        const newUserKey = datastore.key(USER_KIND);
        const newUser = {
            email: email,
            password: hashedPassword,
            createdAt: new Date(),
            lastLogin: null,
            cart: [],
            favorites: [],
            isAdmin: email === 'hanacophotography@gmail.com'
        };

        // Save new user
        await datastore.save({
            key: newUserKey,
            data: newUser,
            excludeFromIndexes: ['password', 'cart', 'favorites']
        });

        res.status(201).json({ 
            message: 'Signup successful',
            email: email
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ 
            message: 'Registration failed',
            details: error.message
        });
    }
});

// Login endpoint with similar approach
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Find user by email using client-side filtering
        const user = await findUserByEmail(email);

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign(
            { 
                userId: user[Datastore.KEY].id,
                email: user.email,
                isAdmin: user.isAdmin
            },
            process.env.JWT_SECRET || 'default-secret-key',
            { expiresIn: '24h' }
        );

        // Update last login
        user.lastLogin = new Date();
        const userKey = user[Datastore.KEY];
        await datastore.save({
            key: userKey,
            data: user
        });

        res.json({
            token,
            email: user.email,
            isAdmin: user.isAdmin
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            message: 'Login failed',
            details: error.message
        });
    }
});

module.exports = router;