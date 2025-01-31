const express = require('express');
const router = express.Router();
const {Datastore} = require('@google-cloud/datastore');

const datastore = new Datastore();

// Get all members
router.get('/members', async (req, res) => {
    try {
        const query = datastore.createQuery('User');
        const [users] = await datastore.runQuery(query);

        // Remove sensitive information like passwords
        const safeUsers = users.map(user => ({
            id: user[datastore.KEY].id,
            email: user.email,
            lastLogin: user.lastLogin,
            favorites: user.favorites || [],
            cart: user.cart || []
        }));

        res.status(200).json({
            success: true,
            users: safeUsers
        });
    } catch (error) {
        console.error('Error fetching members:', error);
        res.status(500).json({ error: 'Failed to fetch members' });
    }
});

// Get user by email
router.get('/user', async (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
    }

    try {
        const query = datastore.createQuery('User')
            .filter('email', '=', email)
            .limit(1);
        
        const [users] = await datastore.runQuery(query);
        const user = users[0];

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Remove sensitive information
        const safeUser = {
            email: user.email,
            lastLogin: user.lastLogin,
            cart: user.cart || [],
            favorites: user.favorites || []
        };

        res.status(200).json(safeUser);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user data' });
    }
});

// Get user data (alternative endpoint with more details)
router.get('/user-data', async (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
    }

    try {
        const query = datastore.createQuery('User')
            .filter('email', '=', email)
            .limit(1);
        
        const [users] = await datastore.runQuery(query);
        const user = users[0];

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Include additional user data as needed
        const userData = {
            email: user.email,
            lastLogin: user.lastLogin,
            cart: user.cart || [],
            favorites: user.favorites || [],
            preferences: user.preferences || {},
            createdAt: user.createdAt,
            lastUpdated: user.lastUpdated
        };

        res.status(200).json(userData);
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ error: 'Failed to fetch user data' });
    }
});

// Update user
router.post('/update', async (req, res) => {
    const { email, updates } = req.body;

    if (!email || !updates) {
        return res.status(400).json({ error: 'Email and updates are required.' });
    }

    try {
        const query = datastore.createQuery('User')
            .filter('email', '=', email)
            .limit(1);
        
        const [users] = await datastore.runQuery(query);
        const user = users[0];
        const userKey = users[0][datastore.KEY];

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Prevent updates to sensitive fields
        delete updates.password;
        delete updates.email;

        // Update the user entity
        const updatedUser = {
            ...user,
            ...updates,
            lastUpdated: new Date()
        };

        await datastore.update({
            key: userKey,
            data: updatedUser
        });

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            user: {
                email: updatedUser.email,
                lastLogin: updatedUser.lastLogin,
                lastUpdated: updatedUser.lastUpdated
            }
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Delete user
router.delete('/:email', async (req, res) => {
    const { email } = req.params;

    try {
        const query = datastore.createQuery('User')
            .filter('email', '=', email)
            .limit(1);
        
        const [users] = await datastore.runQuery(query);
        
        if (!users.length) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const userKey = users[0][datastore.KEY];
        await datastore.delete(userKey);

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Update last login
router.post('/update-login', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
    }

    try {
        const query = datastore.createQuery('User')
            .filter('email', '=', email)
            .limit(1);
        
        const [users] = await datastore.runQuery(query);
        const user = users[0];
        const userKey = users[0][datastore.KEY];

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Update last login time
        const updatedUser = {
            ...user,
            lastLogin: new Date()
        };

        await datastore.update({
            key: userKey,
            data: updatedUser
        });

        res.status(200).json({
            success: true,
            message: 'Last login updated successfully'
        });
    } catch (error) {
        console.error('Error updating last login:', error);
        res.status(500).json({ error: 'Failed to update last login' });
    }
});

module.exports = router;