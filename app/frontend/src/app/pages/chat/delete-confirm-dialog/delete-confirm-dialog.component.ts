import { ChangeDetectionStrategy, Component, EventEmitter, Inject, inject, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle, MatDialogModule, 
  MAT_DIALOG_DATA} from '@angular/material/dialog';

@Component({
  selector: 'app-delete-confirm-dialog',
  imports: [MatButtonModule, MatDialogActions, MatDialogClose, MatDialogTitle, MatDialogContent],
  templateUrl: './delete-confirm-dialog.component.html',
  styleUrl: './delete-confirm-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteConfirmDialogComponent {
  readonly dialogRef = inject(MatDialogRef<DeleteConfirmDialogComponent>);
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
  };
  delete_this(){
    this.data.parentDeleteConv(this.data.conv_id)
  }
}
