const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    mobileNumber: { type: String, unique: true },
    name: String,
    dob: Date,
    email: String
});
module.exports = mongoose.model('User', userSchema);