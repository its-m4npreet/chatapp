const nodemailer = require('nodemailer');
require('dotenv').config();

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail' || process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

// Generate random 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via email
const sendOTP = async (email, otp) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your OTP for ChatApp Verification',
            html: `
                <div style="font-family: Arial, sans-serif; background: linear-gradient(135deg, #4f38f7 0%, #764ba2 100%); padding: 20px; border-radius: 8px;">
                    <div style="background: white; padding: 30px; border-radius: 8px; text-align: center;">
                        <h2 style="color: #333; margin-bottom: 20px;">Email Verification</h2>
                        <p style="color: #666; font-size: 16px; margin-bottom: 20px;">Your One-Time Password (OTP) for ChatApp is:</p>
                        <div style="background: #f0f0f0; padding: 20px; border-radius: 6px; margin: 20px 0;">
                            <h1 style="color: #4f38f7; letter-spacing: 8px; margin: 0; font-size: 36px; font-weight: bold;">${otp}</h1>
                        </div>
                        <p style="color: #666; font-size: 14px; margin: 20px 0;">This OTP will expire in 10 minutes.</p>
                        <p style="color: #999; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
                    </div>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        return { success: true, message: 'OTP sent successfully' };
    } catch (error) {
        console.error('Error sending OTP:', error);
        return { success: false, message: 'Failed to send OTP', error: error.message };
    }
};

// Verify OTP
const verifyOTP = (userOTP, storedOTP, otpExpiry) => {
    // Check if OTP has expired
    if (new Date() > otpExpiry) {
        return { success: false, message: 'OTP has expired' };
    }

    // Check if OTP matches
    if (userOTP === storedOTP) {
        return { success: true, message: 'OTP verified successfully' };
    }

    return { success: false, message: 'Invalid OTP' };
};

module.exports = {
    generateOTP,
    sendOTP,
    verifyOTP,
};
