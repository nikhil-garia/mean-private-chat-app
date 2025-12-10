import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateConversationDialogComponent } from './create-conversation-dialog.component';

describe('CreateConversationDialogComponent', () => {
  let component: CreateConversationDialogComponent;
  let fixture: ComponentFixture<CreateConversationDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateConversationDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CreateConversationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
