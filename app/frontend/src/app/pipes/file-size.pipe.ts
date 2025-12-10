import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fileSize',
  standalone: true
})
export class FileSizePipe implements PipeTransform {
  transform(value: number): string {
    if (value === 0) {
      return '0 Bytes';
    }
  
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(value) / Math.log(1024));
    const formattedSize = (value / Math.pow(1024, i)).toFixed(2);
  
    return `${formattedSize} ${sizes[i]}`;
  }
  
  // transform(value: unknown, ...args: unknown[]): unknown {
  //   return null;
  // }

}
