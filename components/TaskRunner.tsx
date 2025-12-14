import React, { useEffect, useState } from 'react';
import { Task, Requirement, RequirementType, TaskStatus } from '../types';
import { tickTask, startTask, pauseTask, resetTask, updateRequirementValue } from '../services/taskEngine';
import { Play, Pause, RotateCcw, CheckCircle2, Circle, AlertCircle, Lock, Trophy, Clock, ChevronRight, ChevronDown } from 'lucide-react';

interface TaskRunnerProps {
  initialTask: Task;
  onUpdate: (task: Task) => void;
  onBack: () => void;
}

// Recursive Requirement Component
const RequirementItem: React.FC<{
  req: Requirement;
  depth?: number;
  onUpdate: (id: string, updates: Partial<Requirement>) => void;
  taskStatus: TaskStatus;
}> = ({ req, depth = 0, onUpdate, taskStatus }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const isLocked = req.isDisabled;
  const isFulfilled = req.isFulfilled;
  const isInteractable = taskStatus === TaskStatus.RUNNING && !isLocked && !isFulfilled;

  // Visual Styles
  const baseClasses = `border-l-2 pl-4 py-2 my-2 transition-all duration-200 ${depth > 0 ? 'ml-4' : ''}`;
  const statusColor = isLocked 
    ? 'border-slate-700 text-slate-500' 
    : isFulfilled 
      ? 'border-green-500 bg-green-500/5' 
      : 'border-slate-600 hover:border-blue-400';

  return (
    <div className={`${baseClasses} ${statusColor}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {req.type === RequirementType.GROUP && (
              <button onClick={() => setIsExpanded(!isExpanded)} className="text-slate-400 hover:text-white">
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            )}
            
            <h4 className={`font-medium ${isFulfilled ? 'text-green-400' : 'text-slate-200'}`}>
              {req.title}
              {req.isOptional && <span className="ml-2 text-xs text-slate-500 uppercase tracking-wider">(Optional)</span>}
              {req.xorGroup && <span className="ml-2 text-xs text-amber-500 border border-amber-900/50 px-1 rounded">XOR: {req.xorGroup}</span>}
            </h4>
          </div>
          
          {req.description && <p className="text-sm text-slate-400 mt-1">{req.description}</p>}
          
          {/* Controls */}
          <div className="mt-3">
             {isLocked && <div className="flex items-center gap-2 text-xs text-amber-600"><Lock size={12}/> Mutually Exclusive Locked</div>}
             
             {!isLocked && req.type === RequirementType.BOOLEAN && (
               <button
                 disabled={!isInteractable && !isFulfilled} // Allow unchecking if fulfilled? Depends on engine. Let's assume uncheckable.
                 onClick={() => onUpdate(req.id, { isFulfilled: !req.isFulfilled })}
                 className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                   isFulfilled 
                     ? 'bg-green-500 text-black hover:bg-green-400' 
                     : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                 } ${!isInteractable && !isFulfilled ? 'opacity-50 cursor-not-allowed' : ''}`}
               >
                 {isFulfilled ? <CheckCircle2 size={16}/> : <Circle size={16}/>}
                 {isFulfilled ? 'Completed' : 'Mark Complete'}
               </button>
             )}

             {!isLocked && req.type === RequirementType.NUMERIC && (
               <div className="flex items-center gap-4">
                 <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-blue-500 transition-all duration-500"
                     style={{ width: `${Math.min(100, ((req.currentValue || 0) / (req.targetValue || 1)) * 100)}%` }}
                   />
                 </div>
                 <div className="flex items-center gap-2">
                   <span className="text-sm font-mono text-slate-300">
                     {req.currentValue || 0} / {req.targetValue}
                   </span>
                   <button
                     disabled={!isInteractable}
                     onClick={() => onUpdate(req.id, { currentValue: (req.currentValue || 0) + 1 })}
                     className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs disabled:opacity-50"
                   >
                     +1
                   </button>
                 </div>
               </div>
             )}
          </div>
        </div>
        
        <div className="ml-4 flex flex-col items-end">
           {isFulfilled && <CheckCircle2 className="text-green-500" size={20} />}
        </div>
      </div>

      {/* Children */}
      {req.type === RequirementType.GROUP && isExpanded && req.children && (
        <div className="mt-2 border-t border-slate-800/50 pt-2">
          {req.children.map(child => (
            <RequirementItem 
              key={child.id} 
              req={child} 
              depth={depth + 1} 
              onUpdate={onUpdate}
              taskStatus={taskStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const TaskRunner: React.FC<TaskRunnerProps> = ({ initialTask, onUpdate, onBack }) => {
  const [task, setTask] = useState<Task>(initialTask);

  // Sync prop changes
  useEffect(() => {
    setTask(initialTask);
  }, [initialTask]);

  // Timer Effect
  useEffect(() => {
    let interval: number;
    if (task.status === TaskStatus.RUNNING) {
      interval = window.setInterval(() => {
        const updated = tickTask(task);
        setTask(updated);
        // We only persist to parent periodically or on status change to avoid excessive re-renders up chain
        // But for this simple app, we can just local state it and save on unmount or status change?
        // Let's sync on major events, but strictly speaking, the parent holds the source of truth.
        // For smoother UI, we keep local state and flush up. 
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [task.status, task.elapsedTime]); // Dependencies need care to avoid loops

  const handleUpdate = (newTask: Task) => {
    setTask(newTask);
    onUpdate(newTask);
  };

  const handleReqUpdate = (reqId: string, updates: Partial<Requirement>) => {
    const updatedTask = updateRequirementValue(task, reqId, updates);
    handleUpdate(updatedTask);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 animate-fade-in">
      <button onClick={onBack} className="mb-6 text-slate-400 hover:text-white flex items-center gap-2">
         ← Back to Dashboard
      </button>

      {/* Header Card */}
      <div className="bg-slate-850 border border-slate-700 rounded-xl p-6 mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Trophy size={120} />
        </div>
        
        <div className="flex justify-between items-start relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">{task.title}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide 
                ${task.status === TaskStatus.RUNNING ? 'bg-blue-500/20 text-blue-400' : 
                  task.status === TaskStatus.COMPLETED ? 'bg-green-500/20 text-green-400' :
                  task.status === TaskStatus.FAILED ? 'bg-red-500/20 text-red-400' :
                  'bg-slate-700 text-slate-300'
                }`}>
                {task.status}
              </span>
            </div>
            <p className="text-slate-400 max-w-xl">{task.description}</p>
          </div>

          <div className="text-right">
             <div className="flex flex-col items-end">
                <span className="text-xs text-slate-500 uppercase font-bold mb-1">Time Elapsed</span>
                <div className="flex items-center gap-2 text-2xl font-mono text-white">
                  <Clock size={20} className="text-slate-500" />
                  {formatTime(task.elapsedTime)}
                  {task.timeLimit && <span className="text-slate-500 text-sm">/ {formatTime(task.timeLimit)}</span>}
                </div>
             </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="mt-8 flex items-center gap-3 relative z-10 border-t border-slate-700 pt-6">
          {task.status === TaskStatus.IDLE || task.status === TaskStatus.PAUSED ? (
            <button 
              onClick={() => handleUpdate(startTask(task))}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold transition-all"
            >
              <Play size={18} fill="currentColor" /> {task.status === TaskStatus.IDLE ? 'Start Quest' : 'Resume'}
            </button>
          ) : task.status === TaskStatus.RUNNING ? (
             <button 
              onClick={() => handleUpdate(pauseTask(task))}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-lg font-semibold transition-all"
            >
              <Pause size={18} fill="currentColor" /> Pause
            </button>
          ) : null}

          <button 
            onClick={() => handleUpdate(resetTask(task))}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg font-medium transition-all ml-auto"
          >
            <RotateCcw size={18} /> Reset
          </button>
        </div>
      </div>

      {/* Requirements List */}
      <div className="bg-slate-850 border border-slate-700 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <CheckCircle2 size={20} className="text-blue-500"/> Requirements
        </h3>
        
        <div className="space-y-1">
          {task.requirements.map(req => (
            <RequirementItem 
              key={req.id} 
              req={req} 
              onUpdate={handleReqUpdate}
              taskStatus={task.status}
            />
          ))}
        </div>
      </div>
      
      {/* JSON Dump for Verification */}
      <div className="mt-8 pt-8 border-t border-slate-800">
        <details>
          <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300">View Serialized JSON State</summary>
          <pre className="mt-4 bg-slate-950 p-4 rounded-lg overflow-x-auto text-xs text-green-400 font-mono">
            {JSON.stringify(task, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
};