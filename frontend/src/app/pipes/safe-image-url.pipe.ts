import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../environments/environment';

@Pipe({
  name: 'safeImageUrl',
  standalone: true,
  pure: true // Pure pipe for performance optimization
})
export class SafeImageUrlPipe implements PipeTransform {

  serverPath=environment.apiUrl;
  transform(url: string): string {
    if (!url) return '';

    // Fast regex check for http or https
    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    return this.serverPath+'/'+'uploads/profile/'+ url;
  }
}
