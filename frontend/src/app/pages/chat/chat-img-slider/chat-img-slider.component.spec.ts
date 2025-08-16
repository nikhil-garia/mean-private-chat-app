import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatImgSliderComponent } from './chat-img-slider.component';

describe('ChatImgSliderComponent', () => {
  let component: ChatImgSliderComponent;
  let fixture: ComponentFixture<ChatImgSliderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatImgSliderComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ChatImgSliderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
