// controllers/messageController.js
const Message = require('../models/message');

const sendMessage = async (req, res) => {
    const { receiverId, content, imageUrl, publicId } = req.body;
    const senderId = req.userId; // From JWT auth middleware

    if (!receiverId) {
        return res.status(400).json({ message: "receiverId is required" });
    }

    // Validate that at least text or image is provided
    if (!content?.trim() && !imageUrl) {
        return res.status(400).json({ message: "Message content or image is required" });
    }

    try {
        let messageType = 'text';
        if (content?.trim() && imageUrl) messageType = 'mixed';
        else if (imageUrl) messageType = 'image';

        const newMessage = new Message({
            sender: senderId,
            receiver: receiverId,
            content: content?.trim() || '',
            image: imageUrl ? { url: imageUrl, public_id: publicId } : null,
            messageType
        });

        await newMessage.save();
        await newMessage.populate('sender', 'name profilePicture');

        // For real-time: emit via Socket.IO here
        // io.to(receiverSocket).emit('newMessage', populatedMessage);

        res.status(201).json({
            message: "Message sent successfully",
            data: newMessage
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


module.exports = { sendMessage };