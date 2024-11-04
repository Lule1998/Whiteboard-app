import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WhiteboardComponent } from './whiteboard/whiteboard.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, WhiteboardComponent],
  template: `
    <div class="app-container">
      <app-whiteboard></app-whiteboard>
    </div>
  `,
  styles: [`
    .app-container {
      width: 100%;
      min-height: 100vh;
    }
  `]
})
export class AppComponent {
  title = 'whiteboard-app';
}