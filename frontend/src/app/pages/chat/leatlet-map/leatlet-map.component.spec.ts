import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeatletMapComponent } from './leatlet-map.component';

describe('LeatletMapComponent', () => {
  let component: LeatletMapComponent;
  let fixture: ComponentFixture<LeatletMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeatletMapComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LeatletMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
