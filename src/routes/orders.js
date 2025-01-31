const express = require('express');
const router = express.Router();
const {Datastore} = require('@google-cloud/datastore');
const {Storage} = require('@google-cloud/storage');

const datastore = new Datastore();
const storage = new Storage();
const bucketName = 'hanacobucket';

// Submit new order
router.post('/submit', async (req, res) => {
    const { cart, addons, contactInfo, paymentMethod, creditCardInfo, email } = req.body;

    if (!cart || !contactInfo || !paymentMethod) {
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
            creditCardInfo: creditCardInfo ? {
                lastFour: creditCardInfo.number.slice(-4),
                // Don't store complete card info
            } : null,
            status: 'pending',
            paymentStatus: 'awaiting_payment',
            createdAt: new Date(),
            updatedAt: new Date(),
            orderId: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };

        await datastore.save({
            key: orderKey,
            data: order
        });

        // Calculate total amount
        const totalAmount = cart.reduce((sum, item) => sum + parseFloat(item.price || 0), 0);

        res.status(200).json({
            success: true,
            message: 'Order submitted successfully',
            orderId: order.orderId,
            totalAmount
        });
    } catch (error) {
        console.error('Error submitting order:', error);
        res.status(500).json({ error: 'Failed to submit order' });
    }
});

// Get order photos
router.get('/photos/:orderId', async (req, res) => {
    const { orderId } = req.params;

    try {
        const query = datastore.createQuery('Order')
            .filter('orderId', '=', orderId);
        
        const [orders] = await datastore.runQuery(query);
        const order = orders[0];

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const photoPaths = order.cart.map(item => ({
            name: item.name,
            url: `https://storage.googleapis.com/${bucketName}/${item.path}`
        }));

        res.status(200).json({
            success: true,
            photos: photoPaths
        });
    } catch (error) {
        console.error('Error getting order photos:', error);
        res.status(500).json({ error: 'Failed to get order photos' });
    }
});

// Process payment
router.post('/process-payment', async (req, res) => {
    const { orderId, method, amount } = req.body;

    if (!orderId || !method || !amount) {
        return res.status(400).json({ error: 'Order ID, payment method, and amount are required.' });
    }

    try {
        const query = datastore.createQuery('Order')
            .filter('orderId', '=', orderId);
        
        const [orders] = await datastore.runQuery(query);
        const order = orders[0];
        const orderKey = orders[0][datastore.KEY];

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

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
                return res.status(400).json({ error: 'Invalid payment method' });
        }

        // Update order payment status
        const updatedOrder = {
            ...order,
            paymentStatus,
            updatedAt: new Date()
        };

        await datastore.update({
            key: orderKey,
            data: updatedOrder
        });

        res.status(200).json({
            success: true,
            message: `Payment processing: ${paymentStatus}`,
            redirectUrl: method === 'paypal' ? process.env.PAYPAL_REDIRECT_URL : 
                        method === 'cashapp' ? process.env.CASHAPP_REDIRECT_URL : null
        });
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).json({ error: 'Failed to process payment' });
    }
});

// Get order status
router.get('/:orderId', async (req, res) => {
    const { orderId } = req.params;

    try {
        const query = datastore.createQuery('Order')
            .filter('orderId', '=', orderId);
        
        const [orders] = await datastore.runQuery(query);
        const order = orders[0];

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Remove sensitive information
        const safeOrder = {
            orderId: order.orderId,
            status: order.status,
            paymentStatus: order.paymentStatus,
            cart: order.cart,
            addons: order.addons,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt
        };

        res.status(200).json({
            success: true,
            order: safeOrder
        });
    } catch (error) {
        console.error('Error getting order:', error);
        res.status(500).json({ error: 'Failed to get order' });
    }
});

// Get user orders
router.get('/user/:email', async (req, res) => {
    const { email } = req.params;

    try {
        const query = datastore.createQuery('Order')
            .filter('userEmail', '=', email)
            .order('createdAt', { descending: true });
        
        const [orders] = await datastore.runQuery(query);

        // Remove sensitive information
        const safeOrders = orders.map(order => ({
            orderId: order.orderId,
            status: order.status,
            paymentStatus: order.paymentStatus,
            cart: order.cart,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            totalAmount: order.cart.reduce((sum, item) => sum + parseFloat(item.price || 0), 0)
        }));

        res.status(200).json({
            success: true,
            orders: safeOrders
        });
    } catch (error) {
        console.error('Error getting user orders:', error);
        res.status(500).json({ error: 'Failed to get user orders' });
    }
});

// Update order status (admin only)
router.put('/:orderId/status', async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ error: 'Status is required' });
    }

    try {
        const query = datastore.createQuery('Order')
            .filter('orderId', '=', orderId);
        
        const [orders] = await datastore.runQuery(query);
        const order = orders[0];
        const orderKey = orders[0][datastore.KEY];

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const updatedOrder = {
            ...order,
            status,
            updatedAt: new Date()
        };

        await datastore.update({
            key: orderKey,
            data: updatedOrder
        });

        res.status(200).json({
            success: true,
            message: 'Order status updated successfully'
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

module.exports = router;