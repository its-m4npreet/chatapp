const User= require('../model/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const cookieParser = require('cookie-parser');
const cloudinary = require('../config/cloudinary');

const signUp = async (req, res) => {
    const { name, email, password } = req.body;
    if(!name || !email || !password){
        return  res.status(400).json({ message: "All fields are required" });
    }
    if(password.length < 6){
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }else if(password.trim() === ''){
        return res.status(400).json({ message: "Password cannot be empty or whitespace" });
    }else if(!/\d/.test(password)){
        return res.status(400).json({ message: "Password must contain at least one number" });
    }else if(!/[!@#$%^&*]/.test(password)){
        return res.status(400).json({ message: "Password must contain at least one special character" });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
        });
        console.log(newUser);
        await newUser.save();
        res.status(201).json({ message: "User created successfully" });
    } catch (error) {
        console.error("SignUp error:", error);
        res.status(500).json({ message: error.message || "Server error" });
    }
};


const signIn = async (req, res) => {

    const {email, password}=req.body;
    if(!email || !password){
        return res.status(400).json({ message: "All fields are required" });
    }
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                return res.status(500).json({ message: "Server error" });
            }
            if (!isMatch) {
                return res.status(400).json({ message: "Invalid credentials" });
            }
            const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
           // Set HTTP-only cookie (secure in production)
        res.cookie('jwt', token, {
            httpOnly: true,        // Prevents XSS attacks (JS can't access cookie)
            secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in prod
            sameSite: 'strict',    // Helps prevent CSRF
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
        });

        // Send success response (you can also send user info if needed)
        return res.status(200).json({
            message: "Login successful",
            user: { id: user._id, name: user.name, email: user.email ,profilePicture: user.profilePicture}
        });
        });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

const logout = (req, res) => {
    res.clearCookie('jwt', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    res.status(200).json({ message: "Logout successful" });
}

const updateProfile = async (req, res) => {
    // Implementation for updating user profile
    const { name, profilePicture, bio, banner, location, website, portfolio } = req.body;
    const userId = req.userId; // Assuming you have user ID from authentication middleware

    try {
        const updateData = { name, bio, location, website, portfolio };
        
        // Only update profilePicture if provided
        if (profilePicture) {
            updateData.profilePicture = profilePicture;
        }
        
        // Only update banner if provided
        if (banner !== undefined) {
            updateData.banner = banner;
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }
        
        res.status(200).json({
            message: "Profile updated successfully",
            user: updatedUser
        });
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ message: error.message || "Server error" });
    }
}

// Get all users except the current user
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ _id: { $ne: req.userId } }).select('name email profilePicture bio username');
        res.status(200).json({ users });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

// Get current user's friends
const getFriends = async (req, res) => {
    try {
        const user = await User.findById(req.userId).populate('friends', 'name email profilePicture bio username');
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ friends: user.friends });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

// Add a friend (bidirectional - adds both users to each other's friend list)
const addFriend = async (req, res) => {
    try {
        const { friendId } = req.body;
        if (!friendId) {
            return res.status(400).json({ message: "Friend ID is required" });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if friend exists
        const friend = await User.findById(friendId);
        if (!friend) {
            return res.status(404).json({ message: "Friend not found" });
        }

        // Check if already friends
        if (user.friends.some(f => f.toString() === friendId)) {
            return res.status(400).json({ message: "Already friends" });
        }

        // Add friend to current user's friend list
        await User.findByIdAndUpdate(
            req.userId,
            { $addToSet: { friends: friendId } },
            { new: true }
        );

        // Add current user to friend's friend list (bidirectional)
        await User.findByIdAndUpdate(
            friendId,
            { $addToSet: { friends: req.userId } },
            { new: true }
        );

        // Populate the newly added friend's info
        const populatedUser = await User.findById(req.userId).populate('friends', 'name email profilePicture bio username');

        // Emit socket event to notify the friend that they've been added
        const io = req.app.get('io');
        if (io) {
            // Send the current user's info to the friend so they can update their list
            const currentUserInfo = {
                _id: user._id,
                name: user.name,
                email: user.email,
                profilePicture: user.profilePicture,
                bio: user.bio,
                username: user.username
            };
            io.to(friendId).emit('friendAdded', { friend: currentUserInfo });
        }

        res.status(200).json({ 
            message: "Friend added successfully",
            friends: populatedUser.friends
        });
    } catch (error) {
        console.error('Add friend error:', error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Remove a friend (bidirectional - removes both users from each other's friend list)
const removeFriend = async (req, res) => {
    try {
        const { friendId } = req.body;
        if (!friendId) {
            return res.status(400).json({ message: "Friend ID is required" });
        }

        // Remove friend from current user's friend list
        const updatedUser = await User.findByIdAndUpdate(
            req.userId,
            { $pull: { friends: friendId } },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Remove current user from friend's friend list (bidirectional)
        await User.findByIdAndUpdate(
            friendId,
            { $pull: { friends: req.userId } },
            { new: true }
        );

        // Emit socket event to notify the friend that they've been removed
        const io = req.app.get('io');
        if (io) {
            io.to(friendId).emit('friendRemoved', { odId: req.userId });
        }

        res.status(200).json({ 
            message: "Friend removed successfully",
            friends: updatedUser.friends
        });
    } catch (error) {
        console.error('Remove friend error:', error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = { signUp, signIn, logout, updateProfile, getAllUsers, getFriends, addFriend, removeFriend };