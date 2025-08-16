import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContactDialog2Component } from './contact-dialog2.component';

describe('ContactDialog2Component', () => {
  let component: ContactDialog2Component;
  let fixture: ComponentFixture<ContactDialog2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactDialog2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContactDialog2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
