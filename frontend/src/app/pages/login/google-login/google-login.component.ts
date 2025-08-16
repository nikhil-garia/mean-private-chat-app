// google-login.component.ts
import { AfterViewInit, Component } from '@angular/core';
import { GoogleAuthService } from './google-auth.service';
@Component({
  selector: 'app-google-login',

  styleUrl:'google-login.component.scss',
  // template: `<div id="google-button" class="d-flex justify-content-center"></div>`,
  template: `
  
		<!-- Divider -->
		<div class="divider">
		  <span class="divider-text">or continue with</span>
		</div>
  
    <div class="social-login-options">
        <button type="button" id="google-button" class="social-btn google">
        <i class='bx bxl-google'></i>
        </button>
    </div>
    <!-- <div id="google-button" class="d-flex justify-content-center"></div> -->
  `,
})
export class GoogleLoginComponent implements AfterViewInit {
  constructor(private googleAuth: GoogleAuthService) { }

  ngAfterViewInit(): void {
    this.googleAuth.initialize();
  }
}
