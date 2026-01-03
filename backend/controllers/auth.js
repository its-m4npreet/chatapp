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
        res.status(500).json({ message: "Server error" });
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
    const { name, profilePicture, bio } = req.body;
    const userId = req.userId; // Assuming you have user ID from authentication middleware

    try {
        const updatedProfilePicture = req.file;
        if (updatedProfilePicture) {
            // Upload new profile picture to Cloudinary
            const result = await cloudinary.uploader.upload(updatedProfilePicture.path, {
                folder: 'profile_pictures',
                width: 150,
                crop: 'scale'
            });
            updatedUser.profilePicture = result.secure_url;
            await updatedUser.save();
        }
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { name, profilePicture, bio },
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
        res.status(500).json({ message: "Server error" });
    }
}

// Get all users except the current user
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ _id: { $ne: req.userId } }).select('name email profilePicture');
        res.status(200).json({ users });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { signUp, signIn, logout, updateProfile, getAllUsers };