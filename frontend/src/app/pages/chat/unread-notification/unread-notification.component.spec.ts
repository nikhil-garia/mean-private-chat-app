import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnreadNotificationComponent } from './unread-notification.component';

describe('UnreadNotificationComponent', () => {
  let component: UnreadNotificationComponent;
  let fixture: ComponentFixture<UnreadNotificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnreadNotificationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UnreadNotificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
