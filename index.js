const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();
const app = express();
app.use(bodyParser.json());
// Import routes
const otpRoutes = require('./router');
app.use('/api', otpRoutes);

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/game');
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
