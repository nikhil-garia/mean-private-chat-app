import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { NavigationEnd, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { LoaderComponent } from "./pages/loader/loader.component";
// import { ColorSchemeService } from './services/color-scheme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Chat app';
  loading: boolean = false;
  // private colorSchemeService = inject(ColorSchemeService);

  constructor(private router: Router,private cdr: ChangeDetectorRef) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        // Show loader before route loads
        this.loading = true;
        this.cdr.detectChanges();
      } else if (event instanceof NavigationEnd) {
        // Hide loader after route has loaded
          this.loading = false;
          this.cdr.detectChanges();
      }
    });
    // Load Color Scheme base on user login or not
    // if(!sessionStorage.getItem('isLoggedin')){
    //   this.colorSchemeService.load_unauth();
    // }
  }
}
