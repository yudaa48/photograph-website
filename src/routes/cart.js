const express = require('express');
const router = express.Router();
const {Datastore} = require('@google-cloud/datastore');
const datastore = new Datastore();

// Get user's cart
router.get('/user', async (req, res) => {
    console.log('User cart route accessed');
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
    }

    try {
        // Create a key for the User kind
        const userKey = datastore.key(['User', email]);
        
        // Get user from Datastore
        const [user] = await datastore.get(userKey);
        
        console.log('User data from Datastore:', user);

        // If no user exists, return empty cart instead of 404
        if (!user) {
            console.log('No user found, returning empty cart');
            return res.status(200).json({ cart: [] });
        }

        // Return cart (or empty array if cart doesn't exist)
        res.status(200).json({ cart: user?.cart || [] });
    } catch (error) {
        console.error('Error getting cart:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add to cart
router.post('/add', async (req, res) => {
    const { email, folderName, price } = req.body;

    if (!email || !folderName) {
        return res.status(400).json({ error: 'Email and folder name are required.' });
    }

    try {
        const userKey = datastore.key(['User', email]);
        let [user] = await datastore.get(userKey);

        // If user doesn't exist, create a new user entity
        if (!user) {
            user = {
                email,
                cart: []
            };
        }

        // Initialize cart if it doesn't exist
        if (!user.cart) {
            user.cart = [];
        }

        // Check if item already in cart
        const existingItem = user.cart.find(item => item.name === folderName);
        if (existingItem) {
            return res.status(409).json({ error: 'Item already in cart.' });
        }

        // Add new item to cart with price
        user.cart.push({
            name: folderName,
            price: price || 0
        });

        // Update user entity
        await datastore.save({
            key: userKey,
            data: user
        });

        res.status(200).json({ message: 'Item added to cart successfully.' });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Remove from cart
router.post('/remove', async (req, res) => {
    const { email, folderName } = req.body;

    if (!email || !folderName) {
        return res.status(400).json({ error: 'Email and folder name are required.' });
    }

    try {
        const userKey = datastore.key(['User', email]);
        const user = await getUserEntity(email);

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Remove item from cart
        if (user.cart) {
            user.cart = user.cart.filter(item => item !== folderName);
        }

        // Update user entity
        const entity = {
            key: userKey,
            data: user
        };

        await datastore.save(entity);
        res.status(200).json({ message: 'Item removed from cart successfully.' });
    } catch (error) {
        console.error('Error removing from cart:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Submit order
router.post('/submit-order', async (req, res) => {
    const { email, cart, addons, contactInfo, paymentMethod, creditCardInfo } = req.body;

    if (!email || !cart || !contactInfo || !paymentMethod) {
        return res.status(400).json({ error: 'Missing required order details.' });
    }

    try {
        // Create order entity
        const orderKey = datastore.key('Order');
        const order = {
            userEmail: email,
            cart,
            addons,
            contactInfo,
            paymentMethod,
            creditCardInfo,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Save order
        await datastore.save({
            key: orderKey,
            data: order
        });

        // Clear user's cart
        const userKey = datastore.key(['User', email]);
        const user = await getUserEntity(email);
        user.cart = [];
        await datastore.save({
            key: userKey,
            data: user
        });

        // Calculate total amount
        const totalAmount = cart.reduce((sum, item) => sum + parseFloat(item.price || 0), 0);

        res.status(200).json({
            message: 'Order submitted successfully',
            orderId: orderKey.id,
            totalAmount
        });
    } catch (error) {
        console.error('Error submitting order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Process payment
router.post('/process-payment', async (req, res) => {
    const { orderId, method, amount } = req.body;

    if (!orderId || !method || !amount) {
        return res.status(400).json({ error: 'Order ID, payment method, and amount are required.' });
    }

    try {
        const orderKey = datastore.key(['Order', datastore.int(orderId)]);
        const [order] = await datastore.get(orderKey);

        if (!order) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        // Update payment status based on method
        let paymentStatus;
        switch (method) {
            case 'paypal':
                paymentStatus = 'redirecting_to_paypal';
                break;
            case 'cashapp':
                paymentStatus = 'redirecting_to_cashapp';
                break;
            case 'credit_card':
                paymentStatus = 'processing_credit_card';
                break;
            default:
                return res.status(400).json({ error: 'Invalid payment method!' });
        }

        order.paymentStatus = paymentStatus;
        order.updatedAt = new Date();

        await datastore.save({
            key: orderKey,
            data: order
        });

        res.status(200).json({ message: `Payment processing: ${paymentStatus}` });
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get order details
router.get('/order/:orderId', async (req, res) => {
    const { orderId } = req.params;

    try {
        const orderKey = datastore.key(['Order', datastore.int(orderId)]);
        const [order] = await datastore.get(orderKey);

        if (!order) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        res.status(200).json({ order });
    } catch (error) {
        console.error('Error getting order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;