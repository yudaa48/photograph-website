const express = require('express');
const router = express.Router();
const {Datastore} = require('@google-cloud/datastore');
const {Storage} = require('@google-cloud/storage');

const datastore = new Datastore();
const storage = new Storage();
const bucketName = 'hanacophotography.com'; // Your GCS bucket name

// Helper function to query photos from Datastore
async function queryPhotos(query) {
    const photoQuery = datastore
        .createQuery('Photo')
        .filter('folderName', '=', query);
    
    try {
        const [photos] = await datastore.runQuery(photoQuery);
        return photos;
    } catch (error) {
        console.error('Error querying photos:', error);
        throw error;
    }
}

// Search rides/photos route
router.get('/rides', async (req, res) => {
    const { number } = req.query;

    if (!number) {
        return res.status(400).json({ error: 'Number is required.' });
    }

    try {
        console.log('Searching for rides with number:', number);
        
        // Query photos from Datastore
        const photos = await queryPhotos(number);
        console.log('Found photos:', photos);

        // Map the results to include GCS URLs
        const matches = photos.map(photo => ({
            folderName: photo.folderName,
            page: photo.page,
            url: `https://storage.googleapis.com/${bucketName}/${photo.path}`
        }));

        res.status(200).json({
            success: true,
            results: matches,
            count: matches.length
        });

    } catch (error) {
        console.error('Error searching for rides:', error);
        res.status(500).json({ 
            error: 'Failed to search rides.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Advanced search with multiple criteria
router.get('/advanced', async (req, res) => {
    const { date, event, number } = req.query;

    try {
        let query = datastore.createQuery('Photo');

        // Add filters based on provided criteria
        if (date) {
            query = query.filter('date', '=', date);
        }
        if (event) {
            query = query.filter('event', '=', event);
        }
        if (number) {
            query = query.filter('folderName', '=', number);
        }

        const [photos] = await datastore.runQuery(query);

        // Map results to include GCS URLs
        const results = photos.map(photo => ({
            folderName: photo.folderName,
            page: photo.page,
            event: photo.event,
            date: photo.date,
            url: `https://storage.googleapis.com/${bucketName}/${photo.path}`
        }));

        res.status(200).json({
            success: true,
            results,
            count: results.length
        });

    } catch (error) {
        console.error('Error in advanced search:', error);
        res.status(500).json({ 
            error: 'Failed to perform advanced search.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Search by metadata (tags, categories, etc.)
router.get('/metadata', async (req, res) => {
    const { tags, category, event } = req.query;

    try {
        let query = datastore.createQuery('Photo');

        if (tags) {
            const tagArray = tags.split(',').map(tag => tag.trim());
            query = query.filter('tags', 'IN', tagArray);
        }
        if (category) {
            query = query.filter('category', '=', category);
        }
        if (event) {
            query = query.filter('event', '=', event);
        }

        const [photos] = await datastore.runQuery(query);

        const results = photos.map(photo => ({
            folderName: photo.folderName,
            page: photo.page,
            tags: photo.tags,
            category: photo.category,
            event: photo.event,
            url: `https://storage.googleapis.com/${bucketName}/${photo.path}`
        }));

        res.status(200).json({
            success: true,
            results,
            count: results.length
        });

    } catch (error) {
        console.error('Error in metadata search:', error);
        res.status(500).json({ 
            error: 'Failed to perform metadata search.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;