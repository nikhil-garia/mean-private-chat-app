import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MediaGallery } from './media-gallery';

describe('MediaGallery', () => {
  let component: MediaGallery;
  let fixture: ComponentFixture<MediaGallery>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MediaGallery]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MediaGallery);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
