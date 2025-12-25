import Task from "../Models/Task.js";
import User from "../Models/User.js";

// Create a new task (Admin only)
export const createTask = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const creatorRole = req.user.role;

    // Only admins can create tasks
    if (creatorRole !== "admin") {
      return res.status(403).json({ message: "Only admins can assign tasks" });
    }

    const {
      assignedTo,
      title,
      description,
      priority,
      dueDate,
      attachments,
    } = req.body;

    // Validate required fields
    if (!assignedTo || !title) {
      return res.status(400).json({ message: "Assigned user and title are required" });
    }

    // Verify assigned user exists
    const assignedUser = await User.findById(assignedTo);
    if (!assignedUser) {
      return res.status(404).json({ message: "Assigned user not found" });
    }

    // Create task
    const task = await Task.create({
      createdBy: creatorId,
      assignedTo,
      title,
      description: description || "",
      priority: priority || "medium",
      dueDate: dueDate || null,
      attachments: attachments || [],
    });

    // Populate user details
    await task.populate("createdBy", "firstName lastName role profileImage");
    await task.populate("assignedTo", "firstName lastName role profileImage");

    console.log(`✅ Task created: "${title}" assigned to ${assignedUser.firstName} ${assignedUser.lastName}`);

    res.status(201).json(task);

  } catch (err) {
    console.error("❌ Create task error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// Get all tasks (for current user)
export const getMyTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let tasks;

    // Admins can see all tasks (created by them or assigned to them)
    if (userRole === "admin") {
      tasks = await Task.find({
        $or: [{ createdBy: userId }, { assignedTo: userId }],
      })
        .populate("createdBy", "firstName lastName role profileImage")
        .populate("assignedTo", "firstName lastName role profileImage")
        .sort({ createdAt: -1 });
    } else {
      // Non-admins can only see tasks assigned to them
      tasks = await Task.find({ assignedTo: userId })
        .populate("createdBy", "firstName lastName role profileImage")
        .populate("assignedTo", "firstName lastName role profileImage")
        .sort({ createdAt: -1 });
    }

    res.json(tasks);

  } catch (err) {
    console.error("❌ Get tasks error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// Get task by ID
export const getTaskById = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;

    const task = await Task.findById(taskId)
      .populate("createdBy", "firstName lastName role profileImage")
      .populate("assignedTo", "firstName lastName role profileImage");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if user has access to this task
    if (
      String(task.createdBy._id) !== String(userId) &&
      String(task.assignedTo._id) !== String(userId)
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(task);

  } catch (err) {
    console.error("❌ Get task by ID error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// Update task status
export const updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, completionNotes } = req.body;
    const userId = req.user.id;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Only assigned user or creator can update status
    if (
      String(task.assignedTo) !== String(userId) &&
      String(task.createdBy) !== String(userId)
    ) {
      return res.status(403).json({ message: "Not authorized to update this task" });
    }

    // Validate status
    const validStatuses = ["pending", "in-progress", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    task.status = status;

    // If task is completed, set completion time and notes
    if (status === "completed") {
      task.completedAt = new Date();
      if (completionNotes) {
        task.completionNotes = completionNotes;
      }
    }

    await task.save();

    await task.populate("createdBy", "firstName lastName role profileImage");
    await task.populate("assignedTo", "firstName lastName role profileImage");

    console.log(`✅ Task status updated: "${task.title}" -> ${status}`);

    res.json(task);

  } catch (err) {
    console.error("❌ Update task status error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// Update task details (Admin only)
export const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Only admins can update task details
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Only admins can edit tasks" });
    }

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Only creator can update
    if (String(task.createdBy) !== String(userId)) {
      return res.status(403).json({ message: "Only the task creator can edit it" });
    }

    const {
      title,
      description,
      priority,
      dueDate,
      assignedTo,
    } = req.body;

    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (assignedTo) task.assignedTo = assignedTo;

    await task.save();

    await task.populate("createdBy", "firstName lastName role profileImage");
    await task.populate("assignedTo", "firstName lastName role profileImage");

    console.log(`✅ Task updated: "${task.title}"`);

    res.json(task);

  } catch (err) {
    console.error("❌ Update task error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// Delete task (Admin only)
export const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Only admins can delete tasks
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Only admins can delete tasks" });
    }

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Only creator can delete
    if (String(task.createdBy) !== String(userId)) {
      return res.status(403).json({ message: "Only the task creator can delete it" });
    }

    await Task.findByIdAndDelete(taskId);

    console.log(`✅ Task deleted: "${task.title}"`);

    res.json({ message: "Task deleted successfully" });

  } catch (err) {
    console.error("❌ Delete task error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// Mark task as read
export const markTaskAsRead = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Only assigned user can mark as read
    if (String(task.assignedTo) !== String(userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    task.isRead = true;
    await task.save();

    res.json({ message: "Task marked as read" });

  } catch (err) {
    console.error("❌ Mark task as read error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// Get task statistics (Admin only)
export const getTaskStats = async (req, res) => {
  try {
    const userRole = req.user.role;

    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const totalTasks = await Task.countDocuments();
    const pendingTasks = await Task.countDocuments({ status: "pending" });
    const inProgressTasks = await Task.countDocuments({ status: "in-progress" });
    const completedTasks = await Task.countDocuments({ status: "completed" });
    const cancelledTasks = await Task.countDocuments({ status: "cancelled" });
    const overdueTasks = await Task.countDocuments({
      dueDate: { $lt: new Date() },
      status: { $nin: ["completed", "cancelled"] },
    });

    res.json({
      total: totalTasks,
      pending: pendingTasks,
      inProgress: inProgressTasks,
      completed: completedTasks,
      cancelled: cancelledTasks,
      overdue: overdueTasks,
    });

  } catch (err) {
    console.error("❌ Get task stats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
