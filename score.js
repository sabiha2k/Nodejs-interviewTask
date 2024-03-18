const mongoose = require('mongoose');
const scoreSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    score: { type: Number, min: 50, max: 500 },
    createdAt: { type: Date, default: Date.now } 
});
module.exports= mongoose.model('Score', scoreSchema);