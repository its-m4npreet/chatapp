
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

    // Upload audio to cloudinary
    const uploadAudio = async (req, res) => {
        try {
            const { audio } = req.body;
            
            if (!audio) {
                return res.status(400).json({ message: "No audio data provided" });
            }

            const uploadPromise = new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'chat-audio',
                        resource_type: 'video', // webm is treated as video
                        format: 'webm',
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );

                const base64Data = audio.replace(/^data:audio\/\w+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                
                const chunkSize = 64 * 1024;
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
                message: "Audio uploaded successfully",
                url: result.secure_url,
                public_id: result.public_id
            });
        } catch (error) {
            console.error('Audio upload error:', error);
            res.status(500).json({ message: "Failed to upload audio" });
        }
    };

    // Send message and emit via socket.io
    const sendMessage = async (req, res) => {
        const { receiverId, content, imageUrl, publicId, audioUrl, replyToId } = req.body;
        const senderId = req.userId;

        if (!receiverId) {
            return res.status(400).json({ message: "receiverId is required" });
        }
        if (!content?.trim() && !imageUrl && !audioUrl) {
            return res.status(400).json({ message: "Message content, image, or audio is required" });
        }

        try {
            let messageType = 'text';
            if (content?.trim() && (imageUrl || audioUrl)) messageType = 'mixed';
            else if (imageUrl) messageType = 'image';
            else if (audioUrl) messageType = 'audio';

            const newMessage = new Message({
                sender: senderId,
                receiver: receiverId,
                content: content?.trim() || '',
                image: imageUrl ? { url: imageUrl, public_id: publicId } : null,
                audio: audioUrl ? { url: audioUrl } : null,
                messageType,
                replyTo: replyToId || null
            });

            // Save to database
            await newMessage.save();
            await newMessage.populate('sender', 'name profilePicture');
            
            // Populate replyTo message if it exists
            if (newMessage.replyTo) {
                await newMessage.populate('replyTo', 'content messageType sender');
            }

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

    // Get messages between authenticated user and receiverId with cursor-based pagination
    // 3-Tier Caching: Redis (fast) → MongoDB (persistent)
    // Supports 'since' param for incremental sync (only get new messages)
    const getMessages = async (req, res) => {
        const receiverId = req.params.receiverId;
        const userId = req.userId;
        const { cursor, limit = 20, since } = req.query;

        if (!receiverId) {
            return res.status(400).json({ message: "receiverId is required" });
        }

        try {
            const parsedLimit = parseInt(limit);
            
            // TIER 1: If 'since' param provided, this is an incremental sync request
            // Only return messages newer than the 'since' timestamp
            if (since) {
                const sinceDate = new Date(since);
                
                // First try Redis for very recent messages
                const cachedMessages = await cacheService.getRecentMessages(userId, receiverId, 100);
                const newCachedMessages = cachedMessages.filter(msg => 
                    new Date(msg.createdAt) > sinceDate
                );
                
                if (newCachedMessages.length > 0) {
                    // Return cached new messages (already newest first, reverse for display)
                    newCachedMessages.reverse();
                    return res.status(200).json({
                        message: "New messages fetched (from cache)",
                        data: newCachedMessages,
                        hasMore: false,
                        cursor: null,
                        source: 'redis',
                        syncType: 'incremental'
                    });
                }
                
                // Fall back to MongoDB for incremental sync
                const newMessages = await Message.find({
                    $or: [
                        { sender: userId, receiver: receiverId },
                        { sender: receiverId, receiver: userId }
                    ],
                    createdAt: { $gt: sinceDate }
                })
                    .sort({ createdAt: 1 }) // Oldest to newest for display
                    .limit(100) // Reasonable limit for incremental sync
                    .populate('sender', 'name profilePicture')
                    .populate('receiver', 'name profilePicture')
                    .populate({
                        path: 'replyTo',
                        select: 'content messageType sender',
                        populate: {
                            path: 'sender',
                            select: 'name profilePicture'
                        }
                    });
                
                return res.status(200).json({
                    message: "New messages fetched",
                    data: newMessages,
                    hasMore: false,
                    cursor: null,
                    source: 'mongodb',
                    syncType: 'incremental'
                });
            }
            
            // TIER 2: If no cursor (first load), try Redis first for recent messages
            if (!cursor) {
                const cachedMessages = await cacheService.getRecentMessages(userId, receiverId, parsedLimit + 1);
                
                if (cachedMessages.length > 0) {
                    // Check if we have enough cached messages
                    const hasMore = cachedMessages.length > parsedLimit;
                    const messagesToSend = hasMore ? cachedMessages.slice(0, -1) : cachedMessages;
                    
                    // Reverse to get chronological order (oldest to newest)
                    messagesToSend.reverse();
                    
                    // If we have enough messages from cache, return them
                    if (cachedMessages.length >= parsedLimit) {
                        return res.status(200).json({
                            message: "Messages fetched successfully (from cache)",
                            data: messagesToSend,
                            hasMore,
                            cursor: messagesToSend.length > 0 ? messagesToSend[0].createdAt : null,
                            source: 'redis'
                        });
                    }
                }
            }

            // TIER 3: Fetch from MongoDB (for older messages or if cache miss)
            const query = {
                $or: [
                    { sender: userId, receiver: receiverId },
                    { sender: receiverId, receiver: userId }
                ]
            };

            // If cursor provided, fetch older messages (messages created before cursor)
            if (cursor) {
                query.createdAt = { $lt: new Date(cursor) };
            }

            const messages = await Message.find(query)
                .sort({ createdAt: -1 }) // Newest first for pagination
                .limit(parsedLimit + 1) // +1 to check if there are more messages
                .populate('sender', 'name profilePicture')
                .populate('receiver', 'name profilePicture')
                .populate({
                    path: 'replyTo',
                    select: 'content messageType sender',
                    populate: {
                        path: 'sender',
                        select: 'name profilePicture'
                    }
                });

            // Check if there are more messages
            const hasMore = messages.length > parsedLimit;
            const messagesToSend = hasMore ? messages.slice(0, -1) : messages;

            // Return in chronological order (oldest to newest) for display
            messagesToSend.reverse();
            
            // Cache these messages in Redis for future requests (background, non-blocking)
            if (!cursor && messagesToSend.length > 0) {
                // Only cache on initial load (no cursor)
                for (const msg of messagesToSend) {
                    cacheService.addToRecentCache(msg);
                }
            }

            res.status(200).json({
                message: "Messages fetched successfully",
                data: messagesToSend,
                hasMore,
                cursor: messagesToSend.length > 0 ? messagesToSend[0].createdAt : null,
                source: 'mongodb'
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

    // Get last message with a specific user
    const getLastMessage = async (req, res) => {
        try {
            const { receiverId } = req.params;
            const userId = req.userId;

            if (!receiverId) {
                return res.status(400).json({ message: "receiverId is required" });
            }

            // Find the last message between current user and the other user
            const lastMessage = await Message.findOne({
                $or: [
                    { sender: userId, receiver: receiverId },
                    { sender: receiverId, receiver: userId }
                ]
            })
            .sort({ createdAt: -1 })
            .select('content messageType createdAt sender receiver');

            if (!lastMessage) {
                return res.status(200).json({ lastMessage: null });
            }

            res.status(200).json({ lastMessage });
        } catch (error) {
            console.error('Get last message error:', error);
            res.status(500).json({ message: "Server error" });
        }
    };

    // Edit a message (only sender can edit, only text content)
    const editMessage = async (req, res) => {
        try {
            const { messageId } = req.params;
            const { content } = req.body;
            const userId = req.userId;

            if (!messageId) {
                return res.status(400).json({ message: "messageId is required" });
            }

            if (!content || content.trim() === '') {
                return res.status(400).json({ message: "Content is required" });
            }

            const message = await Message.findById(messageId);
            if (!message) {
                return res.status(404).json({ message: "Message not found" });
            }

            // Only sender can edit
            if (message.sender.toString() !== userId) {
                return res.status(403).json({ message: "Only the sender can edit this message" });
            }

            // Can't edit deleted messages
            if (message.deletedForEveryone) {
                return res.status(400).json({ message: "Cannot edit a deleted message" });
            }

            // Update message
            message.content = content.trim();
            message.isEdited = true;
            message.editedAt = new Date();
            await message.save();

            await message.populate('sender', 'name profilePicture');
            await message.populate('receiver', 'name profilePicture');

            // Emit to both users
            const payload = {
                messageId: message._id,
                content: message.content,
                isEdited: true,
                editedAt: message.editedAt,
            };

            io.to(message.sender._id.toString()).emit('messageEdited', payload);
            io.to(message.receiver._id.toString()).emit('messageEdited', payload);

            res.status(200).json({
                message: "Message edited successfully",
                data: message,
            });
        } catch (error) {
            console.error('Edit message error:', error);
            res.status(500).json({ message: "Server error" });
        }
    };

    // Delete message for me (only removes from current user's view)
    const deleteForMe = async (req, res) => {
        try {
            const { messageId } = req.params;
            const userId = req.userId;

            if (!messageId) {
                return res.status(400).json({ message: "messageId is required" });
            }

            const message = await Message.findById(messageId);
            if (!message) {
                return res.status(404).json({ message: "Message not found" });
            }

            // User must be sender or receiver
            if (message.sender.toString() !== userId && message.receiver.toString() !== userId) {
                return res.status(403).json({ message: "Not authorized for this message" });
            }

            // Add user to deletedFor array if not already there
            if (!message.deletedFor.includes(userId)) {
                message.deletedFor.push(userId);
                await message.save();
            }

            res.status(200).json({
                message: "Message deleted for you",
                messageId: message._id,
            });
        } catch (error) {
            console.error('Delete for me error:', error);
            res.status(500).json({ message: "Server error" });
        }
    };

    // Delete message for everyone (only sender can do this)
    const deleteForEveryone = async (req, res) => {
        try {
            const { messageId } = req.params;
            const userId = req.userId;

            if (!messageId) {
                return res.status(400).json({ message: "messageId is required" });
            }

            const message = await Message.findById(messageId);
            if (!message) {
                return res.status(404).json({ message: "Message not found" });
            }

            // Only sender can delete for everyone
            if (message.sender.toString() !== userId) {
                return res.status(403).json({ message: "Only the sender can delete for everyone" });
            }

            // Mark as deleted for everyone
            message.deletedForEveryone = true;
            message.content = "";
            message.image = { url: "", public_id: "" };
            message.audio = { url: "", public_id: "" };
            await message.save();

            // Emit to both users
            const payload = {
                messageId: message._id,
                deletedForEveryone: true,
            };

            io.to(message.sender.toString()).emit('messageDeletedForEveryone', payload);
            io.to(message.receiver.toString()).emit('messageDeletedForEveryone', payload);

            res.status(200).json({
                message: "Message deleted for everyone",
                messageId: message._id,
            });
        } catch (error) {
            console.error('Delete for everyone error:', error);
            res.status(500).json({ message: "Server error" });
        }
    };

    return { sendMessage, getMessages, uploadImage, uploadAudio, reactToMessage, getLastMessage, editMessage, deleteForMe, deleteForEveryone };
};

module.exports = createMessageController;