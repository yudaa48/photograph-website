const express = require('express');
const router = express.Router();
const { Datastore } = require('@google-cloud/datastore');

// Initialize Datastore
const datastore = new Datastore({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'original-mesh-448418-j2',
    databaseId: process.env.DATASTORE_DATABASE_ID || 'hanacophotography',
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

const USER_KIND = 'User';

// Comprehensive error logging
function logError(context, error, additionalInfo = {}) {
    console.error(`[FAVORITES ERROR - ${context}]`, {
        message: error.message,
        name: error.name,
        stack: error.stack,
        additionalInfo: JSON.stringify(additionalInfo, null, 2),
        timestamp: new Date().toISOString()
    });
}

// Get User Favorites
router.get('/', async (req, res) => {
    try {
        const { email } = req.query;

        // Validate email
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Perform a query to find the user by email
        const query = datastore
            .createQuery(USER_KIND)
            .filter('email', '=', email)
            .limit(1);

        let [users] = await datastore.runQuery(query);

        // Log detailed query information
        console.log('User Query Results:', {
            email,
            usersFound: users.length,
            userEmails: users.map(u => u.email)
        });

        // Handle no users found
        if (users.length === 0) {
            return res.status(404).json({ 
                message: 'User not found', 
                email 
            });
        }

        // Get the first (and only) user
        const user = users[0];

        // Log user object details
        console.log('User Object Inspection:', {
            userKeys: Object.keys(user),
            favoritesExists: 'favorites' in user,
            favoritesType: typeof user.favorites,
            favoritesValue: user.favorites
        });

        // Safely handle favorites - ensure it's an array
        const favorites = Array.isArray(user.favorites) ? user.favorites : [];

        // If favorites is not an array, update the user
        if (!Array.isArray(user.favorites)) {
            try {
                // Get the user's key
                const userKey = user[Datastore.KEY];

                await datastore.save({
                    key: userKey,
                    data: {
                        ...user,
                        favorites: []
                    },
                    excludeFromIndexes: ['favorites', 'cart', 'password']
                });
            } catch (saveError) {
                logError('Favorites Update', saveError, { 
                    email, 
                    originalUser: JSON.stringify(user) 
                });
            }
        }

        res.status(200).json({ 
            email: user.email,
            favorites: favorites
        });

    } catch (error) {
        // Catch any unexpected errors
        logError('Get Favorites Unexpected Error', error);
        res.status(500).json({ 
            message: 'Failed to retrieve favorites',
            details: error.message
        });
    }
});

// Add to Favorites
router.post('/add', async (req, res) => {
    try {
        const { email, folderName } = req.body;

        if (!email || !folderName) {
            return res.status(400).json({ message: 'Email and folder name are required' });
        }

        // Find user by email
        const query = datastore
            .createQuery(USER_KIND)
            .filter('email', '=', email)
            .limit(1);

        let [users] = await datastore.runQuery(query);

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = users[0];
        const userKey = user[Datastore.KEY];

        // Ensure favorites is an array
        const favorites = Array.isArray(user.favorites) ? user.favorites : [];

        // Check if already in favorites
        if (favorites.includes(folderName)) {
            return res.status(409).json({ message: 'Folder is already in favorites' });
        }

        // Add to favorites
        favorites.push(folderName);

        // Save updated user
        await datastore.save({
            key: userKey,
            data: {
                ...user,
                favorites: favorites
            },
            excludeFromIndexes: ['favorites', 'cart', 'password']
        });

        res.status(200).json({ 
            message: 'Folder added to favorites',
            favorites: favorites
        });

    } catch (error) {
        logError('Add to Favorites', error);
        res.status(500).json({ 
            message: 'Failed to add to favorites',
            details: error.message
        });
    }
});

// Remove from Favorites
router.post('/remove', async (req, res) => {
    try {
        const { email, folderName } = req.body;

        if (!email || !folderName) {
            return res.status(400).json({ message: 'Email and folder name are required' });
        }

        // Find user by email
        const query = datastore
            .createQuery(USER_KIND)
            .filter('email', '=', email)
            .limit(1);

        let [users] = await datastore.runQuery(query);

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = users[0];
        const userKey = user[Datastore.KEY];

        // Ensure favorites is an array
        const favorites = Array.isArray(user.favorites) ? user.favorites : [];

        // Remove the folder
        const updatedFavorites = favorites.filter(favorite => favorite !== folderName);

        // Save updated user
        await datastore.save({
            key: userKey,
            data: {
                ...user,
                favorites: updatedFavorites
            },
            excludeFromIndexes: ['favorites', 'cart', 'password']
        });

        res.status(200).json({ 
            message: 'Favorite removed successfully',
            favorites: updatedFavorites
        });

    } catch (error) {
        logError('Remove from Favorites', error);
        res.status(500).json({ 
            message: 'Failed to remove from favorites',
            details: error.message
        });
    }
});

module.exports = router;