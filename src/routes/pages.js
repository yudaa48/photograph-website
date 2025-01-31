const express = require('express');
const router = express.Router();
const {Datastore} = require('@google-cloud/datastore');
const {Storage} = require('@google-cloud/storage');

const datastore = new Datastore();
const storage = new Storage();
const bucketName = 'hanacophotography.com';

// Fetch all pages
router.get('/', async (req, res) => {
    try {
        const query = datastore.createQuery('Page')
            .order('createdAt', { descending: true });
        
        const [pages] = await datastore.runQuery(query);

        const formattedPages = pages.map(page => ({
            id: page[datastore.KEY].id,
            title: page.title,
            path: page.path,
            createdAt: page.createdAt,
            updatedAt: page.updatedAt
        }));

        res.status(200).json({
            success: true,
            pages: formattedPages
        });
    } catch (error) {
        console.error('Error fetching pages:', error);
        res.status(500).json({ error: 'Failed to fetch pages' });
    }
});

// Get specific page by title
router.get('/:title', async (req, res) => {
    const { title } = req.params;

    try {
        const query = datastore.createQuery('Page')
            .filter('title', '=', title)
            .limit(1);

        const [pages] = await datastore.runQuery(query);
        const page = pages[0];

        if (!page) {
            return res.status(404).json({ error: 'Page not found' });
        }

        // Get the HTML content from Cloud Storage
        const file = storage.bucket(bucketName).file(`pages/${title}.html`);
        const [exists] = await file.exists();

        if (!exists) {
            return res.status(404).json({ error: 'Page content not found' });
        }

        const [content] = await file.download();

        res.status(200).json({
            success: true,
            page: {
                title: page.title,
                content: content.toString(),
                createdAt: page.createdAt,
                updatedAt: page.updatedAt
            }
        });
    } catch (error) {
        console.error('Error fetching page:', error);
        res.status(500).json({ error: 'Failed to fetch page' });
    }
});

// Duplicate a page
router.post('/duplicate', async (req, res) => {
    const { sourcePage, newPageName } = req.body;

    if (!sourcePage || !newPageName) {
        return res.status(400).json({ error: 'Source page and new page name are required.' });
    }

    try {
        // Check if source page exists
        const sourceFile = storage.bucket(bucketName).file(`pages/${sourcePage}.html`);
        const [sourceExists] = await sourceFile.exists();

        if (!sourceExists) {
            return res.status(404).json({ error: 'Source page not found' });
        }

        // Get source page content
        const [content] = await sourceFile.download();
        let htmlContent = content.toString();

        // Generate new unique grid IDs
        const gridNumber = Date.now();
        const weekGridNumber = gridNumber + 1;

        // Update content with new IDs
        htmlContent = htmlContent
            .replace(/id="show-grid"/g, `id="show${gridNumber}-grid"`)
            .replace(/'show-grid-data'/g, `'show${gridNumber}-grid-data'`)
            .replace(/localStorage\.setItem\('show-grid-data'/g, `localStorage.setItem('show${gridNumber}-grid-data'`)
            .replace(/id="week-grid"/g, `id="week${weekGridNumber}-grid"`)
            .replace(/'week-grid-data'/g, `'week${weekGridNumber}-grid-data'`)
            .replace(/localStorage\.setItem\('week-grid-data'/g, `localStorage.setItem('week${weekGridNumber}-grid-data'`)
            .replace(/<title>.*<\/title>/, `<title>${newPageName}</title>`)
            .replace(/localStorage\.setItem\('.*?-titles'/g, `localStorage.setItem('${newPageName}-titles'`)
            .replace(/JSON\.parse\(localStorage\.getItem\('.*?-titles'\)\)/g, `JSON.parse(localStorage.getItem('${newPageName}-titles'))`);

        // Upload new page to Cloud Storage
        const newFile = storage.bucket(bucketName).file(`pages/${newPageName}.html`);
        await newFile.save(htmlContent);

        // Save page metadata to Datastore
        const pageKey = datastore.key('Page');
        const pageEntity = {
            key: pageKey,
            data: {
                title: newPageName,
                path: `pages/${newPageName}.html`,
                createdAt: new Date(),
                updatedAt: new Date(),
                isClone: true,
                clonedFrom: sourcePage
            }
        };

        await datastore.save(pageEntity);

        res.status(200).json({
            success: true,
            message: 'Page duplicated successfully',
            page: {
                title: newPageName,
                gridIds: {
                    showGrid: `show${gridNumber}-grid`,
                    weekGrid: `week${weekGridNumber}-grid`
                }
            }
        });
    } catch (error) {
        console.error('Error duplicating page:', error);
        res.status(500).json({ error: 'Failed to duplicate page' });
    }
});

// Delete a page
router.delete('/:title', async (req, res) => {
    const { title } = req.params;

    try {
        // Delete from Cloud Storage
        const file = storage.bucket(bucketName).file(`pages/${title}.html`);
        const [exists] = await file.exists();

        if (exists) {
            await file.delete();
        }

        // Delete from Datastore
        const query = datastore.createQuery('Page')
            .filter('title', '=', title)
            .limit(1);

        const [pages] = await datastore.runQuery(query);
        if (pages.length > 0) {
            const pageKey = pages[0][datastore.KEY];
            await datastore.delete(pageKey);
        }

        res.status(200).json({
            success: true,
            message: 'Page deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting page:', error);
        res.status(500).json({ error: 'Failed to delete page' });
    }
});

// Clean undefined folders
router.post('/clean-folders', async (req, res) => {
    const { pageTitle } = req.body;

    if (!pageTitle) {
        return res.status(400).json({ error: 'Page title is required.' });
    }

    try {
        const [files] = await storage.bucket(bucketName).getFiles({
            prefix: 'uploads/'
        });

        const undefinedFolders = files.filter(file => 
            file.name.includes('undefined') && 
            file.name.includes(pageTitle)
        );

        await Promise.all(undefinedFolders.map(file => file.delete()));

        res.status(200).json({
            success: true,
            message: 'Undefined folders cleaned successfully',
            cleanedCount: undefinedFolders.length
        });
    } catch (error) {
        console.error('Error cleaning undefined folders:', error);
        res.status(500).json({ error: 'Failed to clean undefined folders' });
    }
});

const populatePageDropdown = async () => {
    try {
        const response = await fetch('/api/pages');
        if (!response.ok) {
            throw new Error('Failed to fetch pages.');
        }
        const data = await response.json();
        const pages = data.pages.map(page => page.title);  // Extract titles from the page objects

        linkPageDropdown.innerHTML = '<option value="" disabled selected>Select a page</option>';
        pages.forEach(page => {
            const option = document.createElement('option');
            option.value = page;
            option.textContent = page;
            linkPageDropdown.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching pages:', error);
    }
};

module.exports = router;