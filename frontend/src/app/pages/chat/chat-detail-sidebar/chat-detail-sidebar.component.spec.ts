import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatDetailSidebarComponent } from './chat-detail-sidebar.component';

describe('ChatDetailSidebarComponent', () => {
  let component: ChatDetailSidebarComponent;
  let fixture: ComponentFixture<ChatDetailSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatDetailSidebarComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ChatDetailSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
