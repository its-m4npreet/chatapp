
const Message = require('../model/message');

// Factory function to inject io
const createMessageController = (io) => {
    // Send message and emit via socket.io
    const sendMessage = async (req, res) => {
        const { receiverId, content, imageUrl, publicId } = req.body;
        const senderId = req.userId;

        if (!receiverId) {
            return res.status(400).json({ message: "receiverId is required" });
        }
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

            // Emit to both sender and receiver rooms for full duplex communication
            io.to(receiverId).emit('newMessage', newMessage);
            io.to(senderId).emit('newMessage', newMessage);

            res.status(201).json({
                message: "Message sent successfully",
                data: newMessage
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Server error" });
        }
    };

    // Get all messages between authenticated user and receiverId
    const getMessages = async (req, res) => {
        const receiverId = req.params.receiverId;
        const userId = req.userId;

        if (!receiverId) {
            return res.status(400).json({ message: "receiverId is required" });
        }

        try {
            const messages = await Message.find({
                $or: [
                    { sender: userId, receiver: receiverId },
                    { sender: receiverId, receiver: userId }
                ]
            })
                .sort({ createdAt: 1 })
                .populate('sender', 'name profilePicture')
                .populate('receiver', 'name profilePicture');

            res.status(200).json({
                message: "Messages fetched successfully",
                data: messages
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Server error" });
        }
    };

    return { sendMessage, getMessages };
};

module.exports = createMessageController;