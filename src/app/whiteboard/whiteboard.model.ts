export interface Point {
    x: number;
    y: number;
  }
  
  export type ToolType = 'pencil' | 'rectangle' | 'circle' | 'eraser';
  
  export interface DrawOperation {
    tool: ToolType;
    color: string;
    lineWidth: number;
    points: Point[];
    timestamp: number;
  }