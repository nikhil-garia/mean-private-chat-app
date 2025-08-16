import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'conversationFilter',
  pure: false, // Set pure to false for dynamic reordering
})
export class ConversationFilterPipe implements PipeTransform {

  transform(
    value: any[],
    getLikeData: boolean | null,
    is_archive_open?: boolean // Additional parameter
  ): any[] {
    // console.log('value:', value); // Debug or use it in your filtering logic
    // console.log('getLikeData:', getLikeData); // Debug or use it in your filtering logic
    // console.log('is_archive_open:', is_archive_open); // Debug or use it in your filtering logic
    if(!is_archive_open){
      // Filter value based on `is_liked` value
      if(getLikeData)
        return value.filter(con => con.is_liked);
      else
        return value.filter(con => !con.is_liked);
    }else{
      return value;
    }
  }

}
