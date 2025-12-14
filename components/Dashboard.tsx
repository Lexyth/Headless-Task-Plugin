import React, { useState } from 'react';
import { Task, TaskStatus, RequirementType } from '../types';
import { Plus, Wand2, Trash2, ArrowRight } from 'lucide-react';
import { generateTaskFromPrompt } from '../services/geminiService';

interface DashboardProps {
  tasks: Task[];
  onSelect: (task: Task) => void;
  onDelete: (id: string) => void;
  onAdd: (task: Task) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ tasks, onSelect, onDelete, onAdd }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const template = await generateTaskFromPrompt(prompt);
      const newTask: Task = {
        id: crypto.randomUUID(),
        status: TaskStatus.IDLE,
        elapsedTime: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        requirements: template.requirements.map((r: any) => ({...r, id: crypto.randomUUID(), isFulfilled: false})),
        ...template
      };
      onAdd(newTask);
      setPrompt('');
    } catch (e) {
      setError("Failed to generate task. Please try again or check your API Key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const createBasicTask = () => {
      const newTask: Task = {
        id: crypto.randomUUID(),
        title: "New Task",
        description: "A manually created task.",
        status: TaskStatus.IDLE,
        elapsedTime: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        requirements: [
            { id: crypto.randomUUID(), type: RequirementType.BOOLEAN, title: 'First Step', isFulfilled: false }
        ]
      };
      onAdd(newTask);
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">QuestEngine</h1>
          <p className="text-slate-400 mt-1">Advanced Task Management System</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={createBasicTask}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700"
          >
            <Plus size={18} /> Manual Entry
          </button>
        </div>
      </header>

      {/* AI Generator Box */}
      <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-500/30 rounded-xl p-6 mb-10">
         <h2 className="text-lg font-semibold text-blue-200 mb-2 flex items-center gap-2">
            <Wand2 size={20} /> AI Quest Generator
         </h2>
         <p className="text-sm text-slate-400 mb-4">Describe a complex task or quest, and our engine will construct the logic tree, including requirements, thresholds, and groups.</p>
         
         <div className="flex gap-2">
           <input 
             type="text" 
             value={prompt}
             onChange={(e) => setPrompt(e.target.value)}
             placeholder="E.g., 'A morning routine with exercise, shower (max 10 mins), and breakfast' or 'A fetch quest to collect 5 herbs and 3 stones'"
             className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600"
             onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
           />
           <button 
             onClick={handleGenerate}
             disabled={isGenerating || !prompt}
             className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-all"
           >
             {isGenerating ? 'Generating...' : 'Generate'}
           </button>
         </div>
         {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.map(task => (
          <div 
            key={task.id}
            className="group bg-slate-850 border border-slate-700 hover:border-slate-500 rounded-xl p-5 transition-all cursor-pointer flex flex-col h-full"
            onClick={() => onSelect(task)}
          >
            <div className="flex justify-between items-start mb-3">
               <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                 task.status === TaskStatus.COMPLETED ? 'bg-green-900 text-green-300' : 
                 task.status === TaskStatus.RUNNING ? 'bg-blue-900 text-blue-300' :
                 'bg-slate-700 text-slate-400'
               }`}>
                 {task.status}
               </span>
               <button 
                 onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                 className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
               >
                 <Trash2 size={16} />
               </button>
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{task.title}</h3>
            <p className="text-sm text-slate-400 mb-4 line-clamp-2 flex-1">{task.description}</p>
            
            <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-800">
               <div className="text-xs text-slate-500">
                 {task.requirements.length} Requirements
               </div>
               <div className="flex items-center gap-1 text-sm font-medium text-blue-400 group-hover:translate-x-1 transition-transform">
                 Open <ArrowRight size={14} />
               </div>
            </div>
          </div>
        ))}
        
        {tasks.length === 0 && (
           <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-800 rounded-xl">
              <p className="text-slate-500">No active quests. Generate one above!</p>
           </div>
        )}
      </div>
    </div>
  );
};