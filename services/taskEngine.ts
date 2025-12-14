import { Task, Requirement, TaskStatus, RequirementType } from '../types';

/**
 * Deep clones a task to ensure immutability during state updates.
 */
export const cloneTask = (task: Task): Task => {
  return JSON.parse(JSON.stringify(task));
};

/**
 * Evaluates a single requirement's fulfillment status.
 * Note: This is a pure function but expects the whole tree context if we were to support cross-tree dependencies fully.
 * For now, it handles local state and children.
 */
const evaluateRequirement = (req: Requirement, allSiblings: Requirement[] = []): Requirement => {
  // 1. Check XOR locks first
  // If any sibling with the same XOR group is fulfilled AND it's not THIS requirement, then this requirement is disabled.
  if (req.xorGroup) {
    const xorWinner = allSiblings.find(
      (s) => s.id !== req.id && s.xorGroup === req.xorGroup && s.isFulfilled
    );
    if (xorWinner) {
      req.isDisabled = true;
      req.isFulfilled = false; // Cannot be fulfilled if disabled
      return req;
    } else {
      req.isDisabled = false;
    }
  }

  // 2. Check Logic based on type
  if (req.type === RequirementType.BOOLEAN) {
    // Boolean is manually toggled, logic mainly handles the 'isDisabled' part above.
    // However, if it has children, it might act as a group. We assume strict types here.
  } else if (req.type === RequirementType.NUMERIC) {
    const current = req.currentValue ?? 0;
    const target = req.targetValue ?? 1;
    if (current >= target) {
      req.isFulfilled = true;
    } else {
      req.isFulfilled = false;
    }
    
    // Check limit
    if (req.valueLimit !== undefined && current > req.valueLimit) {
       // If logic dictates exceeding limit fails the requirement or resets. 
       // For this engine, let's say it just prevents fulfillment or caps it?
       // The prompt says "if x reaches x_limit, requirement cannot be fulfilled".
       req.isFulfilled = false;
       req.isDisabled = true; 
    }
  } else if (req.type === RequirementType.GROUP) {
    if (req.children && req.children.length > 0) {
      // Recursively evaluate children first
      req.children = req.children.map(child => evaluateRequirement(child, req.children));
      
      // Group is fulfilled if all MANDATORY (non-optional) children are fulfilled.
      // And children that are disabled (due to XOR) count as ignored if they aren't the winner? 
      // No, usually in XOR, the group waits for one to be fulfilled.
      
      // Simplified Logic: 
      // 1. All non-optional, non-disabled children must be fulfilled.
      // 2. If a child is XOR-locked (disabled), it is effectively excluded from the requirement check 
      //    UNLESS all members of an XOR group are unfulfilled, then the requirement of "having that xor group satisfied" exists?
      //    Let's stick to: Group is complete when all non-optional children are fulfilled.
      
      const relevantChildren = req.children.filter(c => !c.isOptional);
      
      if (relevantChildren.length === 0) {
        req.isFulfilled = true; // Empty group or all optional
      } else {
        const allMet = relevantChildren.every(c => c.isFulfilled);
        req.isFulfilled = allMet;
      }
    } else {
      req.isFulfilled = true; // Empty group
    }
  }

  return req;
};

/**
 * Runs the evaluation pass on the entire task.
 * Should be called after ANY state change (tick, toggle, increment).
 */
export const evaluateTaskState = (task: Task): Task => {
  const newTask = cloneTask(task);
  
  // 1. Check Limits (Time)
  if (newTask.timeLimit && newTask.elapsedTime >= newTask.timeLimit) {
    if (newTask.status === TaskStatus.RUNNING) {
      newTask.status = TaskStatus.FAILED;
    }
  }

  // If failed/cancelled/completed, we might stop processing requirements, 
  // but let's allow inspection (read-only) updates if needed, though usually state is frozen.
  if (newTask.status === TaskStatus.IDLE || newTask.status === TaskStatus.LOCKED) {
    return newTask;
  }

  // 2. Evaluate Requirements Tree
  // We need a helper that can handle the recursion and peer-awareness for XOR.
  // We do top-level map, then deep dive.
  newTask.requirements = newTask.requirements.map(req => 
    evaluateRequirement(req, newTask.requirements)
  );
  
  // 3. Check Task Completion
  // Task is complete if all top-level non-optional requirements are fulfilled.
  const relevantRequirements = newTask.requirements.filter(r => !r.isOptional);
  const allFulfilled = relevantRequirements.every(r => r.isFulfilled);

  if (allFulfilled && newTask.status === TaskStatus.RUNNING) {
    newTask.status = TaskStatus.COMPLETED;
  }

  newTask.updatedAt = Date.now();
  return newTask;
};

/**
 * Updates a specific requirement by ID.
 * Handles recursion to find the node.
 */
export const updateRequirementValue = (task: Task, reqId: string, updates: Partial<Requirement>): Task => {
  // Usually only running tasks accept input, but we allow Paused for manual edits if designed so.
  if (task.status !== TaskStatus.RUNNING && task.status !== TaskStatus.PAUSED) {
     return task; 
  }

  const recursiveUpdate = (reqs: Requirement[]): Requirement[] => {
    return reqs.map(req => {
      if (req.id === reqId) {
        // Apply updates
        let updatedReq = { ...req, ...updates };
        
        // Validation: Don't allow updates if disabled
        if (req.isDisabled) {
          return req; 
        }
        
        // Validation: Numeric limits
        if (updatedReq.type === RequirementType.NUMERIC && typeof updatedReq.currentValue === 'number') {
             // Logic handled in evaluate
        }
        
        return updatedReq;
      }
      
      if (req.children) {
        return { ...req, children: recursiveUpdate(req.children) };
      }
      return req;
    });
  };

  const newTask = cloneTask(task);
  newTask.requirements = recursiveUpdate(newTask.requirements);
  return evaluateTaskState(newTask);
};

// --- Task Control Actions ---

export const startTask = (task: Task): Task => {
  if (task.status === TaskStatus.IDLE || task.status === TaskStatus.PAUSED) {
    return evaluateTaskState({ ...task, status: TaskStatus.RUNNING });
  }
  return task;
};

export const pauseTask = (task: Task): Task => {
  if (task.status === TaskStatus.RUNNING) {
    return { ...task, status: TaskStatus.PAUSED };
  }
  return task;
};

export const resetTask = (task: Task): Task => {
  // Resetting involves deep resetting all requirements
  const recursiveReset = (reqs: Requirement[]): Requirement[] => {
    return reqs.map(req => ({
      ...req,
      isFulfilled: false,
      isDisabled: false,
      currentValue: req.type === RequirementType.NUMERIC ? 0 : undefined,
      children: req.children ? recursiveReset(req.children) : undefined
    }));
  };

  return {
    ...task,
    status: TaskStatus.IDLE,
    elapsedTime: 0,
    requirements: recursiveReset(task.requirements),
    updatedAt: Date.now()
  };
};

export const tickTask = (task: Task, deltaSeconds: number = 1): Task => {
  if (task.status !== TaskStatus.RUNNING) return task;
  
  const newTask = { ...task, elapsedTime: task.elapsedTime + deltaSeconds };
  return evaluateTaskState(newTask);
};