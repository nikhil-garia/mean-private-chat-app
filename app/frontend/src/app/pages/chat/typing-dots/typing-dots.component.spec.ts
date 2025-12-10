import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TypingDotsComponent } from './typing-dots.component';

describe('TypingDotsComponent', () => {
  let component: TypingDotsComponent;
  let fixture: ComponentFixture<TypingDotsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TypingDotsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TypingDotsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
