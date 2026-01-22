const User= require('../model/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();
const cookieParser = require('cookie-parser');
const cloudinary = require('../config/cloudinary');
const { generateOTP, sendOTP, verifyOTP } = require('../services/otpService');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
        
        // Generate OTP for email verification
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            otp,
            otpExpiry,
            isEmailVerified: false
        });
        
        await newUser.save();
        
        // Send OTP via email
        const emailResult = await sendOTP(email, otp);
        
        if (emailResult.success) {
            res.status(201).json({ 
                message: "User created. OTP sent to email for verification.",
                email: email,
                expiresIn: "10 minutes"
            });
        } else {
            // User was created but email failed - still inform user
            res.status(201).json({ 
                message: "User created but OTP email failed to send. Please try resending.",
                email: email,
                error: emailResult.message
            });
        }
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
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        // Set HTTP-only cookie (secure in production)
        res.cookie('jwt', token, {
            httpOnly: true,        // Prevents XSS attacks (JS can't access cookie)
            secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in prod
            sameSite: 'lax',       // Allow cookies in cross-site requests (needed for Railway)
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
        });

        // Send success response with token for frontend to store in localStorage
        return res.status(200).json({
            message: "Login successful",
            token: token,
            user: { id: user._id, name: user.name, email: user.email, profilePicture: user.profilePicture }
        });
        
    } catch (error) {
        console.error('SignIn error:', error);
        res.status(500).json({ message: "Server error" });
    }
};

const logout = async (req, res) => {
    try {
        // Update last seen timestamp before logout
        await User.findByIdAndUpdate(req.userId, { lastSeen: new Date() });

        res.clearCookie('jwt', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });
        res.status(200).json({ message: "Logout successful" });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: "Server error" });
    }
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
        const user = await User.findById(req.userId).populate('friends', 'name email profilePicture bio username lastSeen');
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

const googleAuth = async (req, res) => {
    const { credential } = req.body;
    
    if (!credential) {
        return res.status(400).json({ message: "Google credential is required" });
    }

    try {
        // Verify the Google token
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        
        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        // Check if user already exists with this email
        let user = await User.findOne({ email });

        if (user) {
            // User exists, update googleId if not already set
            if (!user.googleId) {
                user.googleId = googleId;
                await user.save();
            }
        } else {
            // Create new user
            user = new User({
                name,
                email,
                googleId,
                profilePicture: picture || undefined,
                // Password is not set for Google OAuth users
            });
            await user.save();
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        // Set HTTP-only cookie
        res.cookie('jwt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        // Send response
        return res.status(200).json({
            message: "Google authentication successful",
            token: token,
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email, 
                profilePicture: user.profilePicture 
            }
        });
    } catch (error) {
        console.error("Google Auth error:", error);
        return res.status(401).json({ message: "Invalid Google token or authentication failed" });
    }
};

// Resend OTP for email verification
const resendOtpCode = async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    try {
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        // Generate new OTP
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        user.otp = otp;
        user.otpExpiry = otpExpiry;
        await user.save();

        // Send OTP via email
        const emailResult = await sendOTP(email, otp);
        
        if (emailResult.success) {
            res.status(200).json({ 
                message: "OTP resent successfully",
                email: email,
                expiresIn: "10 minutes"
            });
        } else {
            res.status(500).json({ 
                message: "Failed to resend OTP",
                error: emailResult.message 
            });
        }
    } catch (error) {
        console.error("Resend OTP error:", error);
        res.status(500).json({ message: error.message || "Server error" });
    }
};

// Verify OTP code for email verification
const verifyOtpCode = async (req, res) => {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
    }

    try {
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        // Check if OTP has expired
        if (new Date() > user.otpExpiry) {
            return res.status(400).json({ message: "OTP has expired. Please request a new one." });
        }

        // Verify OTP
        if (user.otp !== otp.toString()) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        // Mark email as verified
        user.isEmailVerified = true;
        user.otp = null;
        user.otpExpiry = null;
        await user.save();

        res.status(200).json({
            message: "Email verified successfully",
            email: email
        });
    } catch (error) {
        console.error("Verify OTP error:", error);
        res.status(500).json({ message: error.message || "Server error" });
    }
};

// Login after OTP verification
const loginWithVerifiedEmail = async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    try {
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        if (!user.isEmailVerified) {
            return res.status(400).json({ message: "Email is not verified" });
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        // Set HTTP-only cookie
        res.cookie('jwt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            message: "Login successful",
            token: token,
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email, 
                profilePicture: user.profilePicture 
            }
        });
    } catch (error) {
        console.error("Login with email error:", error);
        res.status(500).json({ message: error.message || "Server error" });
    }
};

// Send password reset email
const sendResetPasswordEmail = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    try {
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        // Generate reset token
        const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
        
        // Save reset token to database
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        await user.save();

        // Send reset email
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD,
            }
        });

        const resetLink = `${process.env.FRONTEND_URL}/set-new-password?token=${resetToken}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset Request',
            html: `
                <h2>Reset Your Password</h2>
                <p>You requested to reset your password. Click the link below to proceed:</p>
                <a href="${resetLink}" style="background-color: #4f38f7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    Reset Password
                </a>
                <p>This link will expire in 15 minutes.</p>
                <p>If you didn't request this, you can ignore this email.</p>
                <hr/>
                <p style="font-size: 12px; color: #888;">
                    Don't click the link if you didn't request a password reset.
                </p>
            `
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ 
            message: "Password reset link sent to your email"
        });
    } catch (error) {
        console.error("Send reset email error:", error);
        res.status(500).json({ message: error.message || "Server error" });
    }
};

// Reset password with token
const resetPassword = async (req, res) => {
    const { password, token } = req.body;

    if (!password || !token) {
        return res.status(400).json({ message: "Password and token are required" });
    }

    if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
    } else if (!/\d/.test(password)) {
        return res.status(400).json({ message: "Password must contain at least one number" });
    } else if (!/[!@#$%^&*]/.test(password)) {
        return res.status(400).json({ message: "Password must contain at least one special character" });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        // Check if token matches and hasn't expired
        if (user.resetPasswordToken !== token) {
            return res.status(400).json({ message: "Invalid reset token" });
        }

        if (new Date() > user.resetPasswordExpiry) {
            return res.status(400).json({ message: "Reset token has expired" });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Update password and clear reset fields
        user.password = hashedPassword;
        user.resetPasswordToken = null;
        user.resetPasswordExpiry = null;
        await user.save();

        res.status(200).json({ 
            message: "Password reset successful"
        });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(400).json({ message: "Reset token has expired" });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).json({ message: "Invalid reset token" });
        }
        console.error("Reset password error:", error);
        res.status(500).json({ message: error.message || "Server error" });
    }
};

module.exports = { signUp, signIn, logout, updateProfile, getAllUsers, getFriends, addFriend, removeFriend, googleAuth, resendOtpCode, verifyOtpCode, loginWithVerifiedEmail, sendResetPasswordEmail, resetPassword };