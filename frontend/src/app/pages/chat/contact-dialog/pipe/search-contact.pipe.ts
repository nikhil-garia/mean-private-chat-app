import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'searchContact',
  standalone: true
})
export class SearchContactPipe implements PipeTransform {
  transform(items: any[], property: string, searchText: string): any[] {
    if (!items || !property || !searchText || searchText=='') return items;
    searchText = searchText.toLowerCase();
    return items.filter(it => {
      return it[property].toLowerCase().includes(searchText);
    });
  }
}
