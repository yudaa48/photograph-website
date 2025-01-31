// test-datastore.js
const { Datastore } = require('@google-cloud/datastore');
require('dotenv').config();

async function testConnection() {
    try {
        console.log('Testing Datastore connection...');
        
        const datastore = new Datastore({
            projectId: 'original-mesh-448418-j2',
            databaseId: 'hanacophotography',
            keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
        });

        const query = datastore.createQuery('User').limit(1);
        const [users] = await datastore.runQuery(query);
        
        console.log('Connection successful!');
        console.log('Found users:', users.length);
        
    } catch (error) {
        console.error('Connection test failed:', error);
    }
}

testConnection();