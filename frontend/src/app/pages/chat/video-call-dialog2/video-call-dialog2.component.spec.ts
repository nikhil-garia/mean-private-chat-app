import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoCallDialog2Component } from './video-call-dialog2.component';

describe('VideoCallDialog2Component', () => {
  let component: VideoCallDialog2Component;
  let fixture: ComponentFixture<VideoCallDialog2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoCallDialog2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VideoCallDialog2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
