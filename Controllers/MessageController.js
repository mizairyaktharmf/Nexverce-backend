import Conversation from "../Models/Conversation.js";
import Message from "../Models/Message.js";

// Create or get a conversation
export const getOrCreateConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { staffId } = req.body;

    let convo = await Conversation.findOne({
      members: { $all: [userId, staffId] }
    });

    if (!convo) {
      convo = await Conversation.create({
        members: [userId, staffId],
        unread: { [staffId]: 0, [userId]: 0 }
      });
    }

    res.json(convo);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


// Get all conversations of logged-in user
export const getMyConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const convos = await Conversation.find({
      members: { $in: [userId] }
    })
      .populate("members", "firstName lastName role profileImage")
      .sort({ updatedAt: -1 });

    res.json(convos);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


// Fetch messages inside conversation
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const msgs = await Message.find({ conversationId })
      .populate("sender", "firstName lastName role profileImage")
      .sort({ createdAt: 1 });

    res.json(msgs);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


// Send message (text/image/task)
export const sendMessage = async (req, res) => {
  try {
    const { conversationId, type, text, imageUrl } = req.body;
    const senderId = req.user.id;

    // Save message
    const msg = await Message.create({
      conversationId,
      sender: senderId,
      type,
      text,
      imageUrl
    });

    // Update conversation unread counts
    const convo = await Conversation.findById(conversationId);

    convo.members.forEach(member => {
      if (String(member) !== String(senderId)) {
        convo.unread.set(String(member), (convo.unread.get(String(member)) || 0) + 1);
      }
    });

    await convo.save();

    res.json(msg);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


// Mark messages as read
export const markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.body;
    const userId = req.user.id;

    await Conversation.findByIdAndUpdate(conversationId, {
      $set: { [`unread.${userId}`]: 0 }
    });

    res.json({ message: "Read" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
