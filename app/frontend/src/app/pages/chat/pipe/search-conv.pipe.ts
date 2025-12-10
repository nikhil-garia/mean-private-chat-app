import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'searchConv',
  pure: false
})
export class SearchConvPipe implements PipeTransform {
  transform(items: any[], searchTerm: string): any {
    if (!items || !searchTerm) {
      return items;
    }
    // filter items array, items which match and return true will be kept, false will be filtered out
    return items.filter((e) => {
      if (e.is_group) {
        return e.conv_name ? e.conv_name.toLowerCase().includes(searchTerm.toLowerCase()):''
      } else {
         let par=e.participants.filter((e1: { isme: string; })=> e1.isme=='no');
         return (par.length>0 && par[0].name.toLowerCase().includes(searchTerm.toLowerCase())) ? e:'';
      }
    });
  }
}