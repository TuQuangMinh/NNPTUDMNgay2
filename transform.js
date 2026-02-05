const fs = require('fs');
const path = require('path');

// Read existing db.json
const dbPath = path.join(__dirname, 'db.json');
const data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

// Transform data: convert IDs to strings and add isDeleted and comments
const transformedData = data.map(product => ({
    ...product,
    id: String(product.id),
    isDeleted: false,
    comments: []
}));

// Write back to db.json
fs.writeFileSync(dbPath, JSON.stringify(transformedData, null, 2));
console.log('db.json updated successfully!');
