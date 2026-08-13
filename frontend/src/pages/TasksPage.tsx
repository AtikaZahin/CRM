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

  if (loading) {
    return (
      <div style={{ paddingTop: 60, textAlign: 'center' }}>
        <div className="spinner" style={{ marginTop: 40 }} />
        <p style={{ marginTop: 16, color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          Loading tasks…
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p className="section-label" style={{ marginBottom: 4 }}>To-Do List</p>
          <h1 className="page-title">Tasks</h1>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">+ Add Task</button>
      </div>

      <div className="card card-p">
        {tasks.length === 0 ? (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px 0', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
            No tasks found. Click "+ Add Task" to create one.
          </p>
        ) : (
          tasks.map(task => (
            <div key={task.id} style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: '1px solid var(--border)',
              opacity: task.is_completed ? 0.5 : 1
            }}>
              <input
                type="checkbox"
                checked={task.is_completed}
                onChange={() => toggleTask(task)}
                style={{ marginRight: 16, width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--accent2)' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 15,
                  fontWeight: 500,
                  textDecoration: task.is_completed ? 'line-through' : 'none',
                  color: 'var(--ink)'
                }}>
                  {task.title}
                </div>
                {task.description && (
                  <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>
                    {task.description}
                  </div>
                )}
                <div style={{ color: 'var(--subtle)', fontSize: 11, marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                  Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                </div>
              </div>
              
              <div className="row gap-6" style={{ marginLeft: 16 }}>
                <button 
                  onClick={() => handleEdit(task)}
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--child)' }}
                >
                  Edit
                </button>
                <button 
                  onClick={() => setDeleteTaskId(task.id)}
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--ember)' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingId ? "Edit Task" : "Add Task"}>
        <form onSubmit={handleSubmit} className="stack gap-12">
          <div className="field">
            <label className="label">Task Title</label>
            <input
              className="input"
              placeholder="Task Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label className="label">Description (Optional)</label>
            <input
              className="input"
              placeholder="Task details..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="label">Due Date</label>
            <input
              type="date"
              className="input"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: 8, justifyContent: 'center' }}>
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
    </>
  );
};

export default TasksPage;