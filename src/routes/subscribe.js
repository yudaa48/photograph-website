const express = require('express');
const router = express.Router();
const { Firestore } = require('@google-cloud/firestore');

// Initialize Firestore
const firestore = new Firestore({
    projectId: 'original-mesh-448418-j2',
    databaseId: 'hanacophotography'
});

// Collection name
const SUBSCRIBERS_COLLECTION = 'subscribers';

// Add new subscriber
router.post('/', async (req, res) => {
    const { email } = req.body;
    console.log('Received subscription request for email:', email);

    if (!email) {
        return res.status(400).json({ 
            success: false,
            error: 'Email is required.' 
        });
    }

    try {
        // Reference to subscribers collection
        const subscribersRef = firestore.collection(SUBSCRIBERS_COLLECTION);

        // Create the subscriber document
        await subscribersRef.add({
            email: email,
            subscribedAt: new Date(),
            status: 'active'
        });

        console.log('Successfully saved subscriber to Firestore');

        res.status(201).json({
            success: true,
            message: 'Successfully subscribed!'
        });
    } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process subscription.',
            details: error.message
        });
    }
});

// Test route
router.get('/test', async (req, res) => {
    try {
        // Get all subscribers
        const subscribersRef = firestore.collection(SUBSCRIBERS_COLLECTION);
        const snapshot = await subscribersRef.get();

        const subscribers = [];
        snapshot.forEach(doc => {
            subscribers.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.status(200).json({
            success: true,
            message: 'Firestore connection successful',
            database: 'hanacophotography',
            subscriberCount: subscribers.length,
            subscribers: subscribers
        });
    } catch (error) {
        console.error('Test error:', error);
        res.status(500).json({
            success: false,
            error: 'Test failed',
            details: error.message
        });
    }
});

// Get all subscribers (admin endpoint)
router.get('/all', async (req, res) => {
    try {
        const subscribersRef = firestore.collection(SUBSCRIBERS_COLLECTION);
        const snapshot = await subscribersRef.orderBy('subscribedAt', 'desc').get();

        const subscribers = [];
        snapshot.forEach(doc => {
            subscribers.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.status(200).json({
            success: true,
            subscribers: subscribers
        });
    } catch (error) {
        console.error('Error fetching subscribers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch subscribers'
        });
    }
});

module.exports = router;