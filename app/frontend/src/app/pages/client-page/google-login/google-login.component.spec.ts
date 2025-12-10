import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientGoogleLoginComponent } from './google-login.component';

describe('GoogleLoginComponent', () => {
  let component: ClientGoogleLoginComponent;
  let fixture: ComponentFixture<ClientGoogleLoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientGoogleLoginComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClientGoogleLoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
