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
      .populate("lastSender", "firstName lastName")
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


// Send message (text/image/task/file)
export const sendMessage = async (req, res) => {
  try {
    const {
      conversationId,
      type,
      text,
      imageUrl,
      fileUrl,
      fileName,
      taskTitle,
      taskDescription,
      taskPriority,
      taskDueDate,
      assignedTo
    } = req.body;
    const senderId = req.user.id;

    // Save message
    const msg = await Message.create({
      conversationId,
      sender: senderId,
      type,
      text,
      imageUrl,
      fileUrl,
      fileName,
      taskTitle,
      taskDescription,
      taskPriority,
      taskDueDate,
      assignedTo,
      taskStatus: type === "task" ? "pending" : undefined
    });

    // Populate sender info
    await msg.populate("sender", "firstName lastName role profileImage");
    await msg.populate("assignedTo", "firstName lastName role");

    // Update conversation timestamp, unread counts, and last message
    const convo = await Conversation.findById(conversationId);

    convo.members.forEach(member => {
      if (String(member) !== String(senderId)) {
        convo.unread.set(String(member), (convo.unread.get(String(member)) || 0) + 1);
      }
    });

    // Set last message preview
    if (type === "text") {
      convo.lastMessage = text.substring(0, 50);
    } else if (type === "image") {
      convo.lastMessage = "📷 Image";
    } else if (type === "task") {
      convo.lastMessage = `📋 Task: ${taskTitle}`;
    } else if (type === "file") {
      convo.lastMessage = `📎 ${fileName}`;
    }

    convo.lastSender = senderId;
    convo.updatedAt = new Date();
    await convo.save();

    console.log(`✅ Message sent: ${type} by ${req.user.firstName}`);

    res.json(msg);

  } catch (err) {
    console.error("❌ Send message error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// Update task status
export const updateTaskStatus = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { taskStatus } = req.body;
    const userId = req.user.id;

    const msg = await Message.findById(messageId);

    if (!msg || msg.type !== "task") {
      return res.status(404).json({ message: "Task not found" });
    }

    // Only assigned user or sender can update status
    if (String(msg.assignedTo) !== String(userId) && String(msg.sender) !== String(userId)) {
      return res.status(403).json({ message: "Not authorized to update this task" });
    }

    msg.taskStatus = taskStatus;
    await msg.save();

    await msg.populate("sender", "firstName lastName role profileImage");
    await msg.populate("assignedTo", "firstName lastName role");

    console.log(`✅ Task status updated: ${taskStatus} for task ${msg.taskTitle}`);

    res.json(msg);

  } catch (err) {
    console.error("❌ Update task status error:", err);
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
