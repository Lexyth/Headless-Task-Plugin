export enum TaskStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  LOCKED = 'LOCKED'
}

export enum RequirementType {
  BOOLEAN = 'BOOLEAN',
  NUMERIC = 'NUMERIC',
  GROUP = 'GROUP'
}

export interface Requirement {
  id: string;
  type: RequirementType;
  title: string;
  description?: string;
  isOptional?: boolean;
  
  // Logic
  xorGroup?: string; // If populated, mutually exclusive with others of same xorGroup
  
  // Numeric specific
  currentValue?: number;
  targetValue?: number;
  
  // Group specific
  children?: Requirement[];
  
  // State
  isFulfilled: boolean;
  isDisabled?: boolean; // Calculated at runtime based on XOR or other logic
  
  // Limits (e.g., if value > limit, fail requirement)
  valueLimit?: number; 
  
  customData?: Record<string, any>;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  requirements: Requirement[];
  
  // Limits
  timeLimit?: number; // In seconds. 0 or undefined means no limit.
  elapsedTime: number; // In seconds.
  
  // State
  createdAt: number;
  updatedAt: number;
  isLocked?: boolean; // Manual lock
  
  customData?: Record<string, any>;
}

export interface TaskTemplate {
  title: string;
  description: string;
  requirements: Requirement[];
  timeLimit?: number;
}