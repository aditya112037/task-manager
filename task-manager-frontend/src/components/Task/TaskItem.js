import React from 'react';

const TaskItem = ({ task, onEdit, onDelete, onUpdate }) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return '';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'status-completed';
      case 'in-progress': return 'status-in-progress';
      case 'todo': return 'status-todo';
      default: return '';
    }
  };

  const handleStatusChange = (newStatus) => {
    onUpdate(task._id, { status: newStatus });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className={`task-item ${getPriorityColor(task.priority)}`}>
      <div className="task-header">
        <h4 className="task-title">{task.title}</h4>
        <div className="task-actions">
          <button onClick={() => onEdit(task)} className="btn-icon">
            ✏️
          </button>
          <button onClick={() => onDelete(task._id)} className="btn-icon">
            🗑️
          </button>
        </div>
      </div>

      {task.description && (
        <p className="task-description">{task.description}</p>
      )}

      <div className="task-meta">
        <span className={`task-status ${getStatusColor(task.status)}`}>
          {task.status.replace('-', ' ')}
        </span>
        <span className="task-due-date">
          📅 {formatDate(task.dueDate)}
        </span>
      </div>

      <div className="task-footer">
        <div className="status-buttons">
          <button
            onClick={() => handleStatusChange('todo')}
            className={`btn-status ${task.status === 'todo' ? 'active' : ''}`}
          >
            To Do
          </button>
          <button
            onClick={() => handleStatusChange('in-progress')}
            className={`btn-status ${task.status === 'in-progress' ? 'active' : ''}`}
          >
            In Progress
          </button>
          <button
            onClick={() => handleStatusChange('completed')}
            className={`btn-status ${task.status === 'completed' ? 'active' : ''}`}
          >
            Completed
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskItem;