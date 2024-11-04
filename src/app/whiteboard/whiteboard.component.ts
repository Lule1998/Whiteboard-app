import { Component, ElementRef, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-whiteboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="whiteboard-container">
      <div class="toolbar">
        <div class="tool-group">
          <button (click)="setTool('pencil')" [class.active]="currentTool === 'pencil'" title="Pencil">
            <i class="fas fa-pencil-alt"></i>
          </button>
          <button (click)="setTool('eraser')" [class.active]="currentTool === 'eraser'" title="Eraser">
            <i class="fas fa-eraser"></i>
          </button>
          <button (click)="setTool('rectangle')" [class.active]="currentTool === 'rectangle'" title="Rectangle">
            <i class="far fa-square"></i>
          </button>
          <button (click)="setTool('circle')" [class.active]="currentTool === 'circle'" title="Circle">
            <i class="far fa-circle"></i>
          </button>
        </div>

        <div class="tool-group">
          <input type="color" [(ngModel)]="currentColor" title="Color picker">
          <input 
            type="range" 
            [(ngModel)]="lineWidth" 
            min="1" 
            max="20"
            title="Line width"
          >
        </div>

        <div class="tool-group">
          <button (click)="undo()" [disabled]="!canUndo" title="Undo">
            <i class="fas fa-undo"></i>
          </button>
          <button (click)="redo()" [disabled]="!canRedo" title="Redo">
            <i class="fas fa-redo"></i>
          </button>
          <button (click)="clearCanvas()" title="Clear canvas">
            <i class="fas fa-trash"></i>
          </button>
          <button (click)="saveDrawing()" title="Save drawing">
            <i class="fas fa-save"></i>
          </button>
          <button (click)="toggleGrid()" [class.active]="showGrid" title="Toggle grid">
            <i class="fas fa-th"></i>
          </button>
        </div>
      </div>

      <div class="canvas-container">
        <canvas #canvas
          (mousedown)="startDrawing($event)"
          (mousemove)="draw($event)"
          (mouseup)="stopDrawing()"
          (mouseleave)="stopDrawing()">
        </canvas>
        <canvas #gridCanvas class="grid-canvas"></canvas>
      </div>
    </div>
  `,
  styles: [`
    .whiteboard-container {
      display: flex;
      flex-direction: column;
      padding: 10px;
      background-color: #f8f9fa;
      min-height: 100vh;
      width: 100%;
    }

    .toolbar {
      margin-bottom: 10px;
      display: flex;
      gap: 20px;
      padding: 15px;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .tool-group {
      display: flex;
      gap: 10px;
      padding: 0 10px;
      border-right: 1px solid #e9ecef;
      flex-wrap: wrap;
    }

    .tool-group:last-child {
      border-right: none;
    }

    button {
      padding: 10px;
      border: none;
      border-radius: 4px;
      background-color: #fff;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
    }

    button:hover:not(:disabled) {
      background-color: #e9ecef;
    }

    button.active {
      background-color: #007bff;
      color: white;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .canvas-container {
      position: relative;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      padding: 10px;
      width: 100%;
      height: calc(100vh - 100px);
      overflow: hidden;
    }

    canvas {
      position: absolute;
      top: 10px;
      left: 10px;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      width: calc(100% - 20px);
      height: calc(100% - 20px);
    }

    .grid-canvas {
      pointer-events: none;
      z-index: 1;
    }

    input[type="color"] {
      width: 40px;
      height: 40px;
      padding: 0;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    input[type="range"] {
      width: 100px;
    }

    @media (max-width: 768px) {
      .toolbar {
        flex-wrap: wrap;
        justify-content: center;
      }
      
      .tool-group {
        border-right: none;
        border-bottom: 1px solid #e9ecef;
        padding: 10px 0;
        width: 100%;
        justify-content: center;
      }
      
      .tool-group:last-child {
        border-bottom: none;
      }
    }
  `]
})
export class WhiteboardComponent implements AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('gridCanvas') gridCanvasRef!: ElementRef<HTMLCanvasElement>;
  
  private ctx!: CanvasRenderingContext2D;
  private gridCtx!: CanvasRenderingContext2D;
  private isDrawing = false;
  private startX = 0;
  private startY = 0;

  // UI state
  currentTool = 'pencil';
  currentColor = '#000000';
  lineWidth = 2;
  showGrid = false;

  // Undo/Redo stacks
  private undoStack: ImageData[] = [];
  private redoStack: ImageData[] = [];

  get canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  ngAfterViewInit() {
    this.initializeCanvases();
    this.saveState();
  }

  private initializeCanvases() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.clientWidth - 20;
      canvas.height = container.clientHeight - 20;
    } else {
      canvas.width = 800;
      canvas.height = 600;
    }
    
    const gridCanvas = this.gridCanvasRef.nativeElement;
    this.gridCtx = gridCanvas.getContext('2d')!;
    gridCanvas.width = canvas.width;
    gridCanvas.height = canvas.height;
    
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    window.addEventListener('resize', () => {
      this.resizeCanvas();
    });
  }

  @HostListener('window:resize')
  private resizeCanvas() {
    const canvas = this.canvasRef.nativeElement;
    const container = canvas.parentElement;
    
    if (!container) return;
    
    const currentState = this.ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    canvas.width = container.clientWidth - 20;
    canvas.height = container.clientHeight - 20;
    
    const gridCanvas = this.gridCanvasRef.nativeElement;
    gridCanvas.width = canvas.width;
    gridCanvas.height = canvas.height;
    
    this.ctx.putImageData(currentState, 0, 0);
    
    if (this.showGrid) {
      this.drawGrid();
    }
  }

  setTool(tool: string) {
    this.currentTool = tool;
  }

  startDrawing(event: MouseEvent) {
    this.isDrawing = true;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.startX = event.clientX - rect.left;
    this.startY = event.clientY - rect.top;
    
    this.ctx.beginPath();
    this.ctx.moveTo(this.startX, this.startY);
    this.ctx.strokeStyle = this.currentTool === 'eraser' ? '#ffffff' : this.currentColor;
    this.ctx.lineWidth = this.lineWidth;
  }

  draw(event: MouseEvent) {
    if (!this.isDrawing) return;

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;

    switch (this.currentTool) {
      case 'pencil':
      case 'eraser':
        this.ctx.lineTo(currentX, currentY);
        this.ctx.stroke();
        break;
      
      case 'rectangle':
        this.ctx.putImageData(this.undoStack[this.undoStack.length - 1], 0, 0);
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.strokeRect(
          this.startX,
          this.startY,
          currentX - this.startX,
          currentY - this.startY
        );
        break;
      
      case 'circle':
        this.ctx.putImageData(this.undoStack[this.undoStack.length - 1], 0, 0);
        const radius = Math.sqrt(
          Math.pow(currentX - this.startX, 2) + 
          Math.pow(currentY - this.startY, 2)
        );
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.arc(this.startX, this.startY, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        break;
    }
  }

  stopDrawing() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.saveState();
  }

  undo() {
    if (!this.canUndo) return;
    
    const currentState = this.undoStack.pop()!;
    this.redoStack.push(currentState);
    
    const previousState = this.undoStack[this.undoStack.length - 1];
    this.ctx.putImageData(previousState, 0, 0);
  }

  redo() {
    if (!this.canRedo) return;
    
    const nextState = this.redoStack.pop()!;
    this.undoStack.push(nextState);
    this.ctx.putImageData(nextState, 0, 0);
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.saveState();
  }

  saveDrawing() {
    const link = document.createElement('a');
    link.download = 'drawing.png';
    link.href = this.canvasRef.nativeElement.toDataURL();
    link.click();
  }

  toggleGrid() {
    this.showGrid = !this.showGrid;
    this.drawGrid();
  }

  private drawGrid() {
    if (!this.showGrid) {
      this.gridCtx.clearRect(0, 0, this.gridCtx.canvas.width, this.gridCtx.canvas.height);
      return;
    }

    this.gridCtx.clearRect(0, 0, this.gridCtx.canvas.width, this.gridCtx.canvas.height);
    this.gridCtx.beginPath();
    this.gridCtx.strokeStyle = '#e9ecef';
    this.gridCtx.lineWidth = 1;

    for (let x = 0; x <= this.gridCtx.canvas.width; x += 20) {
      this.gridCtx.moveTo(x, 0);
      this.gridCtx.lineTo(x, this.gridCtx.canvas.height);
    }

    for (let y = 0; y <= this.gridCtx.canvas.height; y += 20) {
      this.gridCtx.moveTo(0, y);
      this.gridCtx.lineTo(this.gridCtx.canvas.width, y);
    }

    this.gridCtx.stroke();
  }

  private saveState() {
    const imageData = this.ctx.getImageData(
      0, 
      0, 
      this.ctx.canvas.width, 
      this.ctx.canvas.height
    );
    this.undoStack.push(imageData);
    this.redoStack = [];
  }
}