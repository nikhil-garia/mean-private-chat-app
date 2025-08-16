import { Pipe, PipeTransform } from '@angular/core';
import { faker } from '@faker-js/faker';
@Pipe({
  name: 'fakerImage',
  standalone: true
})
export class FakerImagePipe implements PipeTransform {

  transform(value: any, ...args: any[]): any {
    return faker.color.rgb();
    // console.log(col);
    
    // return col;
    // return faker.image.imageUrl();
  }

}
