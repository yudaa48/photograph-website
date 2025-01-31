const express = require('express');
const router = express.Router();
const {Datastore} = require('@google-cloud/datastore');
const {Storage} = require('@google-cloud/storage');

const datastore = new Datastore();
const storage = new Storage();
const bucketName = ' hanacophotography.com'; // Your GCS bucket name

// Save a new box
router.post('/save', async (req, res) => {
    const { line1, line2, imagePath } = req.body;

    if (!line1 || !line2 || !imagePath) {
        return res.status(400).json({ 
            error: 'Missing required fields: line1, line2, or imagePath.' 
        });
    }

    try {
        // Create a new entity key
        const boxKey = datastore.key('Box');
        
        // Create the box entity
        const boxEntity = {
            key: boxKey,
            data: {
                line1,
                line2,
                imagePath,
                createdAt: new Date(),
                imageUrl: `https://storage.googleapis.com/${bucketName}/${imagePath}`
            }
        };

        // Save to Datastore
        await datastore.save(boxEntity);
        
        res.status(200).json({
            success: true,
            message: 'Box saved successfully',
            box: {
                id: boxKey.id,
                ...boxEntity.data
            }
        });

    } catch (error) {
        console.error('Error saving box:', error);
        res.status(500).json({ 
            error: 'Failed to save box.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get all boxes
router.get('/', async (req, res) => {
    try {
        // Query all boxes from Datastore
        const query = datastore.createQuery('Box')
            .order('createdAt', { descending: true });
        
        const [boxes] = await datastore.runQuery(query);

        // Format the response
        const formattedBoxes = boxes.map(box => ({
            id: box[datastore.KEY].id,
            line1: box.line1,
            line2: box.line2,
            imagePath: box.imagePath,
            imageUrl: box.imageUrl,
            createdAt: box.createdAt
        }));

        res.status(200).json({
            success: true,
            boxes: formattedBoxes,
            count: formattedBoxes.length
        });

    } catch (error) {
        console.error('Error fetching boxes:', error);
        res.status(500).json({ 
            error: 'Failed to fetch boxes.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Delete a box
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: 'Box ID is required.' });
    }

    try {
        // Create key for the box to delete
        const boxKey = datastore.key(['Box', datastore.int(id)]);

        // Get the box first to check if it exists and get the image path
        const [box] = await datastore.get(boxKey);

        if (!box) {
            return res.status(404).json({ error: 'Box not found.' });
        }

        // Delete the image from Google Cloud Storage if it exists
        if (box.imagePath) {
            try {
                await storage.bucket(bucketName).file(box.imagePath).delete();
            } catch (storageError) {
                console.error('Error deleting image from storage:', storageError);
                // Continue with box deletion even if image deletion fails
            }
        }

        // Delete from Datastore
        await datastore.delete(boxKey);

        res.status(200).json({
            success: true,
            message: 'Box deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting box:', error);
        res.status(500).json({ 
            error: 'Failed to delete box.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Update a box
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { line1, line2, imagePath } = req.body;

    if (!id) {
        return res.status(400).json({ error: 'Box ID is required.' });
    }

    try {
        const boxKey = datastore.key(['Box', datastore.int(id)]);
        const [box] = await datastore.get(boxKey);

        if (!box) {
            return res.status(404).json({ error: 'Box not found.' });
        }

        // Update box data
        const updatedBox = {
            ...box,
            line1: line1 || box.line1,
            line2: line2 || box.line2,
            updatedAt: new Date()
        };

        // Update image if provided
        if (imagePath) {
            updatedBox.imagePath = imagePath;
            updatedBox.imageUrl = `https://storage.googleapis.com/${bucketName}/${imagePath}`;
        }

        await datastore.update({
            key: boxKey,
            data: updatedBox
        });

        res.status(200).json({
            success: true,
            message: 'Box updated successfully',
            box: {
                id: boxKey.id,
                ...updatedBox
            }
        });

    } catch (error) {
        console.error('Error updating box:', error);
        res.status(500).json({ 
            error: 'Failed to update box.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;