import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface Task {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  is_completed: boolean;
  user_id: number | null;
}

const TasksPage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '', due_date: '' });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await api.get('/tasks/');
      setTasks(response.data);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: formData.title,
        description: formData.description || null,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
        is_completed: false
      };
      
      if (editingId) {
        // If editing, we should probably keep the existing is_completed status
        const existingTask = tasks.find(t => t.id === editingId);
        payload.is_completed = existingTask ? existingTask.is_completed : false;
        await api.put(`/tasks/${editingId}`, payload);
      } else {
        await api.post('/tasks/', payload);
      }
      
      handleCloseModal();
      fetchTasks();
      toast.success(editingId ? 'Task updated successfully' : 'Task created successfully');
    } catch (err) {
      console.error('Failed to save task', err);
      toast.error('Failed to save task');
    }
  };

  const toggleTask = async (task: Task) => {
    try {
      await api.put(`/tasks/${task.id}`, {
        title: task.title,
        description: task.description,
        due_date: task.due_date,
        is_completed: !task.is_completed
      });
      fetchTasks();
    } catch (err) {
      console.error('Failed to update task', err);
      toast.error('Failed to update task status');
    }
  };

  const handleEdit = (task: Task) => {
    setEditingId(task.id);
    let formattedDate = '';
    if (task.due_date) {
      // The input type="date" expects YYYY-MM-DD
      const dateObj = new Date(task.due_date);
      if (!isNaN(dateObj.getTime())) {
        formattedDate = dateObj.toISOString().split('T')[0];
      }
    }
    
    setFormData({
      title: task.title,
      description: task.description || '',
      due_date: formattedDate
    });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (deleteTaskId === null) return;
    try {
      await api.delete(`/tasks/${deleteTaskId}`);
      fetchTasks();
      toast.success('Task deleted successfully');
    } catch (err) {
      console.error('Failed to delete task', err);
      toast.error('Failed to delete task');
    } finally {
      setDeleteTaskId(null);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ title: '', description: '', due_date: '' });
  };

  if (loading) return <div>Loading tasks...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 600 }}>My Tasks</h1>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">+ Add Task</button>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        {tasks.map(task => (
          <div key={task.id} style={{
            display: 'flex',
            alignItems: 'center',
            padding: '1rem 0',
            borderBottom: '1px solid var(--border-color)',
            opacity: task.is_completed ? 0.6 : 1
          }}>
            <input
              type="checkbox"
              checked={task.is_completed}
              onChange={() => toggleTask(task)}
              style={{ marginRight: '1rem', width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '1.125rem',
                textDecoration: task.is_completed ? 'line-through' : 'none'
              }}>
                {task.title}
              </div>
              {task.description && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  {task.description}
                </div>
              )}
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
              <button 
                onClick={() => handleEdit(task)}
                style={{ background: 'transparent', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', padding: '0.25rem 0.5rem', cursor: 'pointer' }}
              >
                Edit
              </button>
              <button 
                onClick={() => setDeleteTaskId(task.id)}
                style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '0.25rem 0.5rem', cursor: 'pointer' }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingId ? "Edit Task" : "Add Task"}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            className="input-field"
            placeholder="Task Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <input
            className="input-field"
            placeholder="Description (optional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <input
            type="date"
            className="input-field"
            style={{ colorScheme: 'dark' }}
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
          />
          <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>
            {editingId ? "Update Task" : "Save Task"}
          </button>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={deleteTaskId !== null}
        onClose={() => setDeleteTaskId(null)}
        onConfirm={handleDelete}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
      />
    </div>
  );
};

export default TasksPage;