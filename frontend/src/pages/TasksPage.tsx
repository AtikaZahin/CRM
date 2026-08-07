import React, { useState } from 'react';

const mockTasks = [
  { id: 1, title: 'Call Tech Corp about proposal', dueDate: 'Today', completed: false },
  { id: 2, title: 'Send contract to Global LLC', dueDate: 'Tomorrow', completed: false },
  { id: 3, title: 'Follow up with Design Co', dueDate: 'Next Week', completed: true },
];

const TasksPage = () => {
  const [tasks, setTasks] = useState(mockTasks);

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 600 }}>My Tasks</h1>
        <button className="btn-primary">+ Add Task</button>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        {tasks.map(task => (
          <div key={task.id} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '1rem 0',
            borderBottom: '1px solid var(--border-color)',
            opacity: task.completed ? 0.6 : 1
          }}>
            <input 
              type="checkbox" 
              checked={task.completed}
              onChange={() => toggleTask(task.id)}
              style={{ marginRight: '1rem', width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontSize: '1.125rem',
                textDecoration: task.completed ? 'line-through' : 'none' 
              }}>
                {task.title}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                Due: {task.dueDate}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TasksPage;
