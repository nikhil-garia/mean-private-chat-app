import { AfterViewInit, Component } from '@angular/core';
import { ClientGoogleAuthService } from './google-auth.service';

@Component({
  selector: 'app-client-google-login',
  styleUrl: './google-login.component.scss',
  template: `
  
		<!-- Divider -->
		<div class="divider">
		  <span class="divider-text">or</span>
		</div>
  
    <div class="social-login-options">
        <button type="button" id="client-google-button" class="social-btn google">
        <i class='bx bxl-google'></i>
        </button>
    </div>
  `,
})
export class ClientGoogleLoginComponent implements AfterViewInit {
  constructor(private googleAuth: ClientGoogleAuthService) { }

  ngAfterViewInit(): void {
    this.googleAuth.initialize();
  }
}
