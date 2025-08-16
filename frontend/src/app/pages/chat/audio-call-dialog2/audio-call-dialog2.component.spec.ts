import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AudioCallDialog2Component } from './audio-call-dialog2.component';

describe('AudioCallDialog2Component', () => {
  let component: AudioCallDialog2Component;
  let fixture: ComponentFixture<AudioCallDialog2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AudioCallDialog2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AudioCallDialog2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
