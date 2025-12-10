import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'firstChars',
  standalone: true
})
export class FirstCharsPipe implements PipeTransform {

  transform(value: any): any {
    if (!value) return ''; // Handle null or undefined values
    var v1;
    if(typeof value =="string"){
      v1=value;
    }else if (typeof value=="object") {
      // console.log(value);
      v1=value==null ? '':value.name;
    }else{
      for (let i = 0; i < value.length; i++) {
        v1 = value[i];break;
      }
    }
    let words = v1.split(' ');
    if(words.length >= 2) {
      return words[0].substring(0, 1) + words[1].substring(0, 1);
    }else{
      return words[0].substring(0, 1);
    }
    return value;
  }

}
