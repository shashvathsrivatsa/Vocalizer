const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();

// Load SSL certificates
const options = {
    key: fs.readFileSync('server.key'),      // Replace with your key file
    cert: fs.readFileSync('server.crt')    // Replace with your certificate file
};

// Serve static files (your HTML page)
app.use(express.static(path.join(__dirname, 'public')));

// HTTPS server
https.createServer(options, app).listen(4043, '10.100.5.254', () => {
    console.log('Server running on https://10.100.5.254:4043');
});

