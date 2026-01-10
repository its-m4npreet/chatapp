
const Message = require('../model/message');
const cloudinary = require('../config/cloudinary');
const cacheService = require('../services/cacheService');

// Factory function to inject io
const createMessageController = (io) => {
    // Upload image directly to cloudinary using stream
    const uploadImage = async (req, res) => {
        try {
            const { image } = req.body;
            
            if (!image) {
                return res.status(400).json({ message: "No image data provided" });
            }

            // Use upload_stream for better memory efficiency
            const uploadPromise = new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'chat-images',
                        resource_type: 'image',
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );

                // Convert base64 to buffer and pipe to stream
                const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                
                // Write in chunks for better memory handling
                const chunkSize = 64 * 1024; // 64KB chunks
                let offset = 0;
                
                const writeChunk = () => {
                    while (offset < buffer.length) {
                        const chunk = buffer.slice(offset, offset + chunkSize);
                        offset += chunkSize;
                        if (!uploadStream.write(chunk)) {
                            uploadStream.once('drain', writeChunk);
                            return;
                        }
                    }
                    uploadStream.end();
                };
                
                writeChunk();
            });

            const result = await uploadPromise;

            res.status(200).json({
                message: "Image uploaded successfully",
                url: result.secure_url,
                public_id: result.public_id
            });
        } catch (error) {
            console.error('Image upload error:', error);
            res.status(500).json({ message: "Failed to upload image" });
        }
    };

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

            // Save to database
            await newMessage.save();
            await newMessage.populate('sender', 'name profilePicture');

            // Cache the message with 5-second TTL
            const cacheKey = `message:${newMessage._id}`;
            await cacheService.setCache(cacheKey, newMessage, 5);

            // Also cache for quick retrieval by conversation
            const conversationKey = `messages:${Math.min(senderId, receiverId)}:${Math.max(senderId, receiverId)}`;
            const cachedConversation = await cacheService.getCache(conversationKey) || [];
            cachedConversation.push(newMessage);
            await cacheService.setCache(conversationKey, cachedConversation, 5);

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

    // Add or remove a reaction on a direct message
    const reactToMessage = async (req, res) => {
        try {
            const { messageId } = req.params;
            const { reaction } = req.body;
            const userId = req.userId;

            if (!messageId) {
                return res.status(400).json({ message: "messageId is required" });
            }

            const message = await Message.findById(messageId);
            if (!message) {
                return res.status(404).json({ message: "Message not found" });
            }

            if (
                message.sender.toString() !== userId &&
                message.receiver.toString() !== userId
            ) {
                return res.status(403).json({ message: "Not authorized for this message" });
            }

            const existingIndex = message.reactions.findIndex(
                (r) => r.user.toString() === userId
            );

            if (reaction) {
                if (existingIndex !== -1) {
                    message.reactions[existingIndex].reaction = reaction;
                } else {
                    message.reactions.push({ user: userId, reaction });
                }
            } else if (existingIndex !== -1) {
                message.reactions.splice(existingIndex, 1);
            }

            await message.save();
            await message.populate('sender', 'name profilePicture');
            await message.populate('receiver', 'name profilePicture');

            const payload = {
                messageId: message._id,
                reactions: message.reactions,
                updatedBy: userId,
            };

            io.to(message.sender.toString()).emit('messageReactionUpdated', payload);
            io.to(message.receiver.toString()).emit('messageReactionUpdated', payload);

            res.status(200).json({
                message: "Reaction updated",
                data: message,
            });
        } catch (error) {
            console.error('React to message error:', error);
            res.status(500).json({ message: "Server error" });
        }
    };

    return { sendMessage, getMessages, uploadImage, reactToMessage };
};

module.exports = createMessageController;