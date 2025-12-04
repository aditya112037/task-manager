// utils/notifications.js
const Notification = require("../models/Notification");
const TTask = require("../models/TTask");
const Team = require("../models/team");

class NotificationService {
  // Create notification for assigned task
  static async createTaskAssignedNotification(taskId, assignedUserId, assignedByUserId) {
    try {
      const task = await TTask.findById(taskId).populate("team", "name");
      const assignedBy = await User.findById(assignedByUserId);
      
      const notification = await Notification.create({
        user: assignedUserId,
        type: "task_assigned",
        title: "New Task Assigned",
        message: `You have been assigned a new task "${task.title}" in team "${task.team.name}"`,
        relatedTask: taskId,
        relatedTeam: task.team._id,
        metadata: {
          assignedBy: assignedBy.name,
          priority: task.priority,
          dueDate: task.dueDate,
        }
      });
      
      return notification;
    } catch (error) {
      console.error("Error creating task assigned notification:", error);
    }
  }

  // Create due soon notification (24 hours before due date)
  static async createDueSoonNotifications() {
    try {
      const now = new Date();
      const dueSoonDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
      
      const tasksDueSoon = await TTask.find({
        dueDate: { $lte: dueSoonDate, $gt: now },
        status: { $in: ["todo", "in-progress"] },
        lastNotified: { $ne: dueSoonDate } // Don't notify twice for same period
      }).populate("assignedTo team");
      
      for (const task of tasksDueSoon) {
        if (task.assignedTo) {
          await Notification.create({
            user: task.assignedTo._id,
            type: "task_due_soon",
            title: "Task Due Soon",
            message: `Task "${task.title}" is due in less than 24 hours`,
            relatedTask: task._id,
            relatedTeam: task.team._id,
            metadata: {
              dueDate: task.dueDate,
              teamName: task.team.name,
            }
          });
          
          // Update lastNotified
          task.lastNotified = now;
          await task.save();
        }
      }
    } catch (error) {
      console.error("Error creating due soon notifications:", error);
    }
  }

  // Create overdue notifications
  static async createOverdueNotifications() {
    try {
      const now = new Date();
      const overdueTasks = await TTask.find({
        dueDate: { $lt: now },
        status: { $in: ["todo", "in-progress"] },
        notificationCount: { $lt: 3 } // Max 3 notifications per task
      }).populate("assignedTo team");
      
      for (const task of overdueTasks) {
        if (task.assignedTo) {
          await Notification.create({
            user: task.assignedTo._id,
            type: "task_overdue",
            title: "Task Overdue!",
            message: `Task "${task.title}" is overdue`,
            relatedTask: task._id,
            relatedTeam: task.team._id,
            metadata: {
              dueDate: task.dueDate,
              overdueBy: Math.floor((now - task.dueDate) / (1000 * 60 * 60 * 24)), // Days overdue
            }
          });
          
          task.notificationCount += 1;
          await task.save();
        }
      }
    } catch (error) {
      console.error("Error creating overdue notifications:", error);
    }
  }

  // Create extension request notification for admins
  static async createExtensionRequestNotification(taskId, requestingUserId, reason) {
    try {
      const task = await TTask.findById(taskId).populate("team");
      const requestingUser = await User.findById(requestingUserId);
      
      // Get all admins and managers of the team
      const team = await Team.findById(task.team._id).populate("members.user");
      const adminsAndManagers = team.members.filter(
        m => ["admin", "manager"].includes(m.role)
      );
      
      // Create notification for each admin/manager
      for (const member of adminsAndManagers) {
        await Notification.create({
          user: member.user._id,
          type: "extension_requested",
          title: "Extension Requested",
          message: `${requestingUser.name} requested an extension for task "${task.title}"`,
          relatedTask: taskId,
          relatedTeam: task.team._id,
          metadata: {
            reason: reason,
            requestedBy: requestingUser.name,
            currentDueDate: task.dueDate,
          }
        });
      }
    } catch (error) {
      console.error("Error creating extension request notification:", error);
    }
  }
}

module.exports = NotificationService;