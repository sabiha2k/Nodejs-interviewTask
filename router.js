const express = require('express');
const mongoose = require('mongoose');
const mongodb = require('mongodb')
const OTP = require('./models/otp');
const User = require('./models/user')
const Score = require('./models/score')
const moment = require('moment');
const router = express.Router();

// API endpoint to send OTP
router.post('/sendotp', async (req, res) => {
    const { mobileNumber } = req.body;

    // Generate OTP (hardcoded for now)
    const otp = "1234";

    try {
        // Save OTP to database
        await OTP.create({ mobileNumber, otp });
        res.status(200).json({ output: 'Success' });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
});

// API endpoint for user registration
router.post('/register', async (req, res) => {
    const { mobileNumber, name, dob, email, otp } = req.body;

    try {
        // Check if phone number already exists
        const existingUser = await User.findOne({ mobileNumber });

        if (existingUser) {
            return res.status(400).json({ error: 'Phone number already exists' });
        }

        // Verify OTP
        const validOTP = await OTP.findOne({ mobileNumber, otp });

        if (!validOTP) {
            return res.status(400).json({ error: 'Invalid OTP' });
        } else if (isExpired(validOTP.createdAt)) {
            return res.status(400).json({ error: ' expired OTP' });
        }
        const parsedDOB = new Date(dob);

        // Create new user
        const newUser = await User.create({ mobileNumber, name, dob: parsedDOB, email })

        res.status(200).json({ message: 'User registered successfully', encryptedUser: newUser._id });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

function isExpired(createdAt) {
    const now = new Date();
    const createdAtTime = new Date(createdAt);
    const diff = now - createdAtTime; // Difference in milliseconds
    const diffInSeconds = diff / 1000; // Convert difference to seconds

    // If difference is greater than 1 minute (60 seconds), token/OTP has expired
    return diffInSeconds > 60;
}

// API endpoint for saving game score
router.post('/savescore', async (req, res) => {
    const { userId, score } = req.body;

    try {
        // Check if score is within range
        if (score < 50 || score > 500) {
            return res.status(400).json({ error: 'Score must be between 50 and 500' });
        }

        // Check if user has already submitted scores 3 times today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const scoreCount = await Score.countDocuments({
            userId,
            createdAt: { $gte: today, $lt: tomorrow }
        });

        if (scoreCount >= 3) {
            return res.status(400).json({ error: 'Maximum score submissions reached for today' });
        }

        // Save the score
        await Score.create({ userId, score });
        res.status(200).json({ message: 'Score saved successfully' });
    } catch (error) {
        console.error('Error saving score:', error);
        res.status(500).json({ error: 'Failed to save score' });
    }
});

router.get('/overall', async (req, res) => {
    const { userId } = req.body;

    try {
        // Find user by ID
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Find all users
        const allUsers = await User.find({}, '_id');

        // Find all scores associated with each user
        const scorePromises = allUsers.map(async (user) => {
            const scores = await Score.find({ userId: user._id });
            const totalScore = scores.reduce((acc, curr) => acc + curr.score, 0);
            return { userId: user._id, totalScore };
        });

        // Wait for all score calculations to complete
        const userScores = await Promise.all(scorePromises);

        // Sort users by total score
        userScores.sort((a, b) => b.totalScore - a.totalScore);

        // Determine rank of the user based on total score
        const rank = userScores.findIndex(score => score.userId.toString() === userId) + 1;

        // Find total score of the current user
        const currentUserScore = userScores.find(score => score.userId.toString() === userId).totalScore;

        res.status(200).json({ message: 'Overall score retrieved successfully', rank, totalScore: currentUserScore });
    } catch (error) {
        console.error('Error retrieving overall score:', error);
        res.status(500).json({ error: 'Failed to retrieve overall score' });
    }
})

// API endpoint to show week-wise score and rank of the logged-in user
router.get('/weekwisescore', async (req, res) => {
    const { userId } = req.body;

    try {
        const userWeeklyScoresAggregate = await Score.aggregate([
            // {
            //     $match: { userId: new mongodb.ObjectId(userId) }
            // },
            // {
            //     $project: {
            //         weekStartDate: {
            //             $dateFromParts: {
            //                 isoWeekYear: { $isoWeekYear: "$createdAt" },
            //                 isoWeek: {
            //                     $subtract: [
            //                         { $week: "$createdAt" },
            //                         { $cond: [{ $gte: [{ $month: "$createdAt" }, 3] }, 8, 0] } // If month is >= 3 (March), subtract 8 from the week number to adjust start from March 1st
            //                     ]
            //                 },
            //                 isoDayOfWeek: 5 // Friday
            //             }
            //         },
            //         score: 1
            //     }
            // },
            // {
            //     $group: {
            //         _id: "$weekStartDate",
            //         totalScore: { $sum: "$score" },
            //         rank: { $sum: 1 }
            //     }
            // },
            // {
            //     $project: {
            //         _id: 0,
            //         weekNo: { $isoWeek: "$_id" },
            //         totalScore: 1,
            //         rank: 1
            //     }
            // },
            // { $sort: { weekNo: 1 } }//sort it by week
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "user"
                }
            },
            {
                $unwind: "$user"
            },
            {
                $match: { "user._id":new mongodb.ObjectId(userId) }
            },
            {
                $project: {
                    weekStartDate: {
                        $dateFromParts: {
                            isoWeekYear: { $isoWeekYear: "$createdAt" },
                            isoWeek: {
                                $subtract: [
                                    { $week: "$createdAt" },
                                    { $cond: [{ $gte: [{ $month: "$createdAt" }, 3] }, 8, 0] } // If month is >= 3 (March), subtract 8 from the week number to adjust start from March 1st
                                ]
                            },
                            isoDayOfWeek: 5 // Friday
                        }
                    },
                    userId: 1,
                    score: 1
                }
            },
            {
                $group: {
                    _id: "$weekStartDate",
                    scores: { $push: { userId: "$userId", score: "$score" } }
                }
            },
            {
                $project: {
                    _id: 0,
                    weekNo: { $isoWeek: "$_id" },
                    totalScore: { $sum: "$scores.score" }
                }
            },
            { $sort: { weekNo: 1 } } 
        
        ]);

        // Calculate rank for each week
        userWeeklyScoresAggregate.forEach((week, index) => {
            week.rank = index + 1; // Assign rank based on the index
            delete week._id; // Remove _id field
        });

        res.status(200).json({ success: true, weeks: userWeeklyScoresAggregate });
    } catch (error) {
        console.error('Error retrieving week-wise score and rank:', error);
        res.status(500).json({ error: 'Failed to retrieve week-wise score and rank' });
    }
});

module.exports = router;
