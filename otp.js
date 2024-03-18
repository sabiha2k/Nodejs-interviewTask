const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    mobileNumber: { type: String, unique: true },
    otp: String,
    createdAt: { type: Date,  default: Date.now } // OTP expires in 1 minute
});

otpSchema.index({ mobileNumber: 1, otp: 1 }, { unique: true }); // Compound index on mobileNumber and otp

module.exports = mongoose.model('OTP', otpSchema);
