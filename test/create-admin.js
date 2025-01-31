const { Datastore } = require('@google-cloud/datastore');
const bcrypt = require('bcrypt');
require('dotenv').config();

const datastore = new Datastore({
    projectId: 'original-mesh-448418-j2',
    databaseId: 'hanacophotography',
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

const USER_KIND = 'User';

async function initializeDatastore() {
    try {
        console.log('Initializing Datastore...');

        // Create an empty entity to initialize the User kind
        const initKey = datastore.key([USER_KIND, 'init']);
        const initEntity = {
            key: initKey,
            data: {
                _init: true,
                createdAt: new Date()
            }
        };

        await datastore.save(initEntity);
        console.log('User collection initialized');

        // Delete the initialization entity
        await datastore.delete(initKey);
    } catch (error) {
        console.error('Error initializing Datastore:', error);
        throw error;
    }
}

async function createAdminUser() {
    try {
        console.log('Starting admin user creation...');
        
        // Initialize Datastore first
        await initializeDatastore();
        
        const adminEmail = 'hanacophotography@gmail.com';
        const adminPassword = 'YourSecurePassword123!'; // Change this!

        // Create admin user directly without querying
        const userKey = datastore.key([USER_KIND, adminEmail]);
        const newUser = {
            email: adminEmail,
            password: await bcrypt.hash(adminPassword, 10),
            isAdmin: true,
            createdAt: new Date(),
            cart: [],
            favorites: [],
            lastLogin: null
        };

        console.log('Saving admin user to Datastore...');
        await datastore.save({
            key: userKey,
            data: newUser,
            excludeFromIndexes: ['password', 'cart', 'favorites']
        });

        console.log('Admin user created successfully!');
        console.log('Email:', adminEmail);
        console.log('Password:', adminPassword);

    } catch (error) {
        console.error('Error creating admin user:', error.message);
        console.error('Full error:', error);
    }
}

createAdminUser()
    .then(() => {
        console.log('Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });