import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { TaskRunner } from './components/TaskRunner';
import { Task, TaskStatus, RequirementType } from './types';
import { evaluateTaskState } from './services/taskEngine';

const MOCK_TASKS: Task[] = [
  {
    id: '1',
    title: 'Daily Difficult Training',
    description: 'Complete a set of physical exercises. Mutually exclusive choices included.',
    status: TaskStatus.IDLE,
    elapsedTime: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    requirements: [
      {
        id: 'req_1',
        title: 'Warm Up',
        type: RequirementType.BOOLEAN,
        isFulfilled: false,
        description: '5 minutes of stretching',
        isOptional: false
      },
      {
        id: 'req_2',
        title: 'Core Workout',
        type: RequirementType.GROUP,
        isFulfilled: false,
        children: [
            { id: 'c1', title: 'Pushups', type: RequirementType.NUMERIC, targetValue: 20, currentValue: 0, isFulfilled: false },
            { id: 'c2', title: 'Situps', type: RequirementType.NUMERIC, targetValue: 30, currentValue: 0, isFulfilled: false },
        ]
      },
      {
        id: 'req_3a',
        title: 'Run 5km',
        type: RequirementType.BOOLEAN,
        isFulfilled: false,
        xorGroup: 'cardio',
        description: 'Outdoor run'
      },
      {
        id: 'req_3b',
        title: 'Swim 1km',
        type: RequirementType.BOOLEAN,
        isFulfilled: false,
        xorGroup: 'cardio',
        description: 'Pool swim'
      },
      {
        id: 'req_4',
        title: 'Cool Down',
        type: RequirementType.BOOLEAN,
        isFulfilled: false,
        isOptional: true
      }
    ]
  }
];

export default function App() {
  // Simple state-based routing
  const [currentView, setCurrentView] = useState<'dashboard' | 'runner'>('dashboard');
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Initialize all tasks with the engine to ensure valid initial state
  useEffect(() => {
    setTasks(prev => prev.map(t => evaluateTaskState(t)));
  }, []);

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const activeTask = tasks.find(t => t.id === activeTaskId);

  return (
    <div className="min-h-screen font-sans bg-slate-900 text-slate-200 selection:bg-blue-500/30">
      {currentView === 'dashboard' && (
        <Dashboard 
          tasks={tasks}
          onSelect={(task) => {
            setActiveTaskId(task.id);
            setCurrentView('runner');
          }}
          onDelete={(id) => setTasks(prev => prev.filter(t => t.id !== id))}
          onAdd={(task) => setTasks(prev => [...prev, evaluateTaskState(task)])}
        />
      )}

      {currentView === 'runner' && activeTask && (
        <TaskRunner 
          initialTask={activeTask}
          onUpdate={handleTaskUpdate}
          onBack={() => {
             setActiveTaskId(null);
             setCurrentView('dashboard');
          }}
        />
      )}
    </div>
  );
}
