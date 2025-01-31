const express = require('express');
const router = express.Router();
const {Storage} = require('@google-cloud/storage');
const {Datastore} = require('@google-cloud/datastore');
const Multer = require('multer');
const path = require('path');

const storage = new Storage();
const datastore = new Datastore();
const bucketName = 'hanacophotography.com';

// Configure multer for memory storage
const multer = Multer({
    storage: Multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB file size limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedTypes.includes(file.mimetype)) {
            cb(new Error('Invalid file type. Only JPG and PNG are allowed.'));
            return;
        }
        cb(null, true);
    }
});

// Handle file uploads
router.post('/', multer.array('files'), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded.' });
    }

    const { folder, pageTitle, price } = req.body;

    if (!folder || !pageTitle || !price) {
        return res.status(400).json({ error: 'Folder name, page title, and price are required.' });
    }

    try {
        const bucket = storage.bucket(bucketName);
        const uploadPromises = req.files.map(async (file) => {
            const folderPath = `uploads/${folder}-${pageTitle}`;
            const fileName = `${folderPath}/${file.originalname}`;
            const blob = bucket.file(fileName);

            // Create write stream
            const blobStream = blob.createWriteStream({
                metadata: {
                    contentType: file.mimetype,
                    metadata: {
                        folder: folder,
                        pageTitle: pageTitle,
                        price: price
                    }
                }
            });

            // Handle upload
            await new Promise((resolve, reject) => {
                blobStream.on('error', (err) => reject(err));
                blobStream.on('finish', () => resolve());
                blobStream.end(file.buffer);
            });

            // Make file public
            await blob.makePublic();

            // Create entity in Datastore
            const photoKey = datastore.key('Photo');
            const photoEntity = {
                key: photoKey,
                data: {
                    name: file.originalname,
                    folder: folder,
                    page: pageTitle,
                    path: fileName,
                    price: parseFloat(price).toFixed(2),
                    url: `https://storage.googleapis.com/${bucketName}/${fileName}`,
                    uploadedAt: new Date()
                }
            };

            await datastore.save(photoEntity);

            return photoEntity.data;
        });

        const uploadedFiles = await Promise.all(uploadPromises);

        res.status(200).json({
            success: true,
            message: 'Files uploaded successfully',
            files: uploadedFiles
        });

    } catch (error) {
        console.error('Error uploading files:', error);
        res.status(500).json({ error: 'Failed to upload files' });
    }
});

// Get photos from a folder
router.get('/folder/:folderName', async (req, res) => {
    const { folderName } = req.params;
    const { page } = req.query;

    if (!page) {
        return res.status(400).json({ error: 'Page title is required.' });
    }

    try {
        const query = datastore.createQuery('Photo')
            .filter('folder', '=', folderName)
            .filter('page', '=', page);

        const [photos] = await datastore.runQuery(query);

        res.status(200).json({
            success: true,
            photos: photos
        });
    } catch (error) {
        console.error('Error fetching photos:', error);
        res.status(500).json({ error: 'Failed to fetch photos' });
    }
});

router.post('/website-file', multer.single('file'), async (req, res) => {
    console.log('Website file upload request received');
    console.log('Request file:', req.file);
    console.log('Request body:', req.body);

    if (!req.file) {
        console.error('No file uploaded');
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
        const bucket = storage.bucket(bucketName);
        
        // Generate a unique filename to prevent overwriting
        const uniqueFileName = `uploads/websitefiles/${Date.now()}-${req.file.originalname}`;
        console.log('Generated filename:', uniqueFileName);

        const blob = bucket.file(uniqueFileName);

        const blobStream = blob.createWriteStream({
            metadata: {
                contentType: req.file.mimetype,
                // Set ACL to public-read for UBLA
                acl: [
                    {
                        entity: 'allUsers',
                        role: storage.acl.READER_ROLE
                    }
                ]
            }
        });

        blobStream.on('error', (err) => {
            console.error('Blob stream error:', err);
            res.status(500).json({ error: 'Failed to upload website file', details: err.message });
        });

        blobStream.on('finish', async () => {
            try {
                // With UBLA, you don't need makePublic()
                // Generate the public URL directly
                const publicUrl = `https://storage.googleapis.com/${bucketName}/${uniqueFileName}`;
                console.log('Generated public URL:', publicUrl);

                res.status(200).json({
                    success: true,
                    filePath: publicUrl
                });
            } catch (publicError) {
                console.error('Error generating public URL:', publicError);
                res.status(500).json({ error: 'Failed to generate public URL', details: publicError.message });
            }
        });

        // Write the file buffer to the blob stream
        blobStream.end(req.file.buffer);

    } catch (error) {
        console.error('Comprehensive error in website file upload:', error);
        res.status(500).json({ 
            error: 'Failed to upload website file', 
            details: error.message,
            fullError: error
        });
    }
});

// Delete photo
router.delete('/:photoId', async (req, res) => {
    const { photoId } = req.params;

    try {
        const photoKey = datastore.key(['Photo', datastore.int(photoId)]);
        const [photo] = await datastore.get(photoKey);

        if (!photo) {
            return res.status(404).json({ error: 'Photo not found' });
        }

        // Delete from Cloud Storage
        const file = storage.bucket(bucketName).file(photo.path);
        await file.delete();

        // Delete from Datastore
        await datastore.delete(photoKey);

        res.status(200).json({
            success: true,
            message: 'Photo deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting photo:', error);
        res.status(500).json({ error: 'Failed to delete photo' });
    }
});

// Save folder details
router.post('/save-folder', async (req, res) => {
    const { folderName, price, page } = req.body;

    if (!folderName || !price || !page) {
        return res.status(400).json({ error: 'Folder name, price, and page are required.' });
    }

    try {
        const folderKey = datastore.key('Folder');
        const folderEntity = {
            key: folderKey,
            data: {
                folderName,
                price: parseFloat(price).toFixed(2),
                page,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        };

        await datastore.save(folderEntity);

        res.status(200).json({
            success: true,
            message: 'Folder saved successfully'
        });
    } catch (error) {
        console.error('Error saving folder:', error);
        res.status(500).json({ error: 'Failed to save folder' });
    }
});

// Get folder details
router.get('/folder-details', async (req, res) => {
    const { folderName, page } = req.query;

    if (!folderName || !page) {
        return res.status(400).json({ error: 'Folder name and page are required.' });
    }

    try {
        const query = datastore.createQuery('Folder')
            .filter('folderName', '=', folderName)
            .filter('page', '=', page);

        const [folders] = await datastore.runQuery(query);
        const folder = folders[0];

        if (!folder) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        res.status(200).json({
            success: true,
            folder
        });
    } catch (error) {
        console.error('Error getting folder details:', error);
        res.status(500).json({ error: 'Failed to get folder details' });
    }
});

module.exports = router;