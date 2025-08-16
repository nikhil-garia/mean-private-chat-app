import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'sortByDate',
  pure: false, // Set pure to false for dynamic reordering
})
export class SortByDatePipe implements PipeTransform {
  transform(value: any[], key: string, order: string = 'asc'): any[] {
    return value.sort((a, b) => {
      const dateA = new Date(a[key]).getTime();
      const dateB = new Date(b[key]).getTime();
      return order === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }

}
