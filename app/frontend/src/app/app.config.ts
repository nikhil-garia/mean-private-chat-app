import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
// interceptor
import { authInterceptor } from './services/auth.interceptor';
// animation
import { provideAnimations } from '@angular/platform-browser/animations';
// for color log
import {providePlog} from '@gpeel/plog';
import { plogConfig } from './plog-config';

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes),provideHttpClient(withInterceptors([authInterceptor])), provideAnimationsAsync(),provideAnimations(),provideZonelessChangeDetection(),
  providePlog(plogConfig)]
};
