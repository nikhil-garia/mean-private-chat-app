import { Component, Input, HostListener, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { CommonModule } from '@angular/common';

// Interface for the raw attachment data from the API
export interface ApiAttachment {
  originalname: string;
  mimetype: string;
  path: string;
  [key: string]: any; // Allow other properties
}

// The component's internal, simplified attachment structure
export interface ProcessedAttachment {
  url: string;
  type: 'image' | 'video';
  originalName: string;
}

@Component({
  selector: 'app-media-gallery',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './media-gallery.html',
  styleUrls: ['./media-gallery.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaGallery implements OnDestroy {
  serverPath: string;

  constructor(private cdr: ChangeDetectorRef) {
    this.serverPath = environment.apiUrl;
  }

  @Input()
  set attachments(apiAttachments: ApiAttachment[]) {
    if (!apiAttachments || apiAttachments.length === 0) {
      this._processedAttachments = [];
      return;
    }
    this._processedAttachments = apiAttachments
      .map(apiAtt => {
        const type = apiAtt.mimetype.startsWith('image') ? 'image' :
                     apiAtt.mimetype.startsWith('video') ? 'video' :
                     undefined;
        if (!type) {
          return null;
        }
        const url = this.serverPath + '/' + apiAtt.path.replace(/\\/g, '/');
        return {
          url: url,
          type: type,
          originalName: apiAtt.originalname
        };
      })
      .filter((att): att is ProcessedAttachment => att !== null);
    this.setupGrid();
  }

  _processedAttachments: ProcessedAttachment[] = [];
  isViewerOpen = false;
  selectedAttachmentIndex = 0;
  transformStyle = 'scale(1) rotate(0deg)';
  currentScale = 1;
  private currentRotation = 0;
  displayAttachments: ProcessedAttachment[] = [];
  moreCount = 0;
  gridClass = '';

  // --- Panning Properties ---
  private isPanning = false;
  private translateX = 0;
  private translateY = 0;
  private startX = 0;
  private startY = 0;

  // --- Optimized Event Listener Handlers ---
  private onDocumentMouseMove = (event: MouseEvent) => this.handleDocumentMouseMove(event);
  private onDocumentMouseUp = (event: MouseEvent) => this.handleDocumentMouseUp(event);


  private setupGrid(): void {
    const count = this._processedAttachments.length;
    if (count > 4) {
      this.displayAttachments = this._processedAttachments.slice(0, 4);
      this.moreCount = count - 4;
    } else {
      this.displayAttachments = this._processedAttachments;
      this.moreCount = 0;
    }
    this.updateGridClass(count);
  }

  private updateGridClass(count: number): void {
    if (count === 1) { this.gridClass = 'grid-count-1'; }
    else if (count === 2) { this.gridClass = 'grid-count-2'; }
    else if (count === 3) { this.gridClass = 'grid-count-3'; }
    else { this.gridClass = 'grid-count-4'; }
  }

  openViewer(index: number): void {
    this.selectedAttachmentIndex = index;
    this.isViewerOpen = true;
    this.resetTransformations();
  }

  closeViewer(): void {
    this.isViewerOpen = false;
    this.removeDocumentListeners(); // Clean up listeners if viewer is closed while panning
  }

  nextAttachment(): void {
    this.selectedAttachmentIndex = (this.selectedAttachmentIndex + 1) % this._processedAttachments.length;
    this.resetTransformations();
  }

  previousAttachment(): void {
    this.selectedAttachmentIndex = (this.selectedAttachmentIndex - 1 + this._processedAttachments.length) % this._processedAttachments.length;
    this.resetTransformations();
  }

  selectFromThumbnail(index: number): void {
    this.selectedAttachmentIndex = index;
    this.resetTransformations();
  }

  zoomIn(): void {
    this.currentScale += 0.1;
    this.updateTransform();
  }

  zoomOut(): void {
    this.currentScale = Math.max(1, this.currentScale - 0.1);
    if (this.currentScale === 1) {
        this.translateX = 0;
        this.translateY = 0;
    }
    this.updateTransform();
  }

  rotateRight(): void {
    this.currentRotation += 90;
    this.updateTransform();
  }

  downloadAttachment(): void {
    const attachment = this._processedAttachments[this.selectedAttachmentIndex];
    if (!attachment) return;
    fetch(attachment.url)
      .then(response => response.blob())
      .then(blob => {
        const a = document.createElement('a');
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = attachment.originalName;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(objectUrl);
        document.body.removeChild(a);
      })
      .catch(e => console.error("Download failed:", e));
  }

  // --- Optimized Panning Logic ---

  onMouseDown(event: MouseEvent): void {
    event.preventDefault();
    if (this.currentScale <= 1 || (event.target as HTMLElement).tagName !== 'IMG') return;
    
    this.isPanning = true;
    this.startX = event.clientX - this.translateX;
    this.startY = event.clientY - this.translateY;
    (event.currentTarget as HTMLElement).classList.add('is-panning');

    // Attach listeners to the document for robust tracking
    document.addEventListener('mousemove', this.onDocumentMouseMove);
    document.addEventListener('mouseup', this.onDocumentMouseUp);
  }

  private handleDocumentMouseMove(event: MouseEvent): void {
    if (!this.isPanning) return;
    this.translateX = event.clientX - this.startX;
    this.translateY = event.clientY - this.startY;
    this.updateTransform();
  }

  private handleDocumentMouseUp(event: MouseEvent): void {
    this.isPanning = false;
    (event.currentTarget as HTMLElement).querySelector('.media-wrapper')?.classList.remove('is-panning');
    this.removeDocumentListeners();
  }

  private removeDocumentListeners(): void {
    document.removeEventListener('mousemove', this.onDocumentMouseMove);
    document.removeEventListener('mouseup', this.onDocumentMouseUp);
  }

  private updateTransform(): void {
    this.transformStyle = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.currentScale}) rotate(${this.currentRotation}deg)`;
    this.cdr.markForCheck(); // Notify Angular to check for changes
  }

  private resetTransformations(): void {
    this.currentScale = 1;
    this.currentRotation = 0;
    this.translateX = 0;
    this.translateY = 0;
    this.updateTransform();
  }

  handleContentClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvents(event: KeyboardEvent): void {
    if (!this.isViewerOpen) return;
    switch (event.key) {
      case 'Escape': this.closeViewer(); break;
      case 'ArrowRight': this.nextAttachment(); break;
      case 'ArrowLeft': this.previousAttachment(); break;
    }
  }

  ngOnDestroy(): void {
    // Ensure listeners are removed if the component is destroyed.
    this.removeDocumentListeners();
  }
}
