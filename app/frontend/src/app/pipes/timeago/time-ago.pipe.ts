import { Pipe, PipeTransform, ChangeDetectorRef } from '@angular/core';
import { format, formatDistanceToNow, differenceInSeconds, parseISO } from 'date-fns';

@Pipe({
  name: 'timeAgo',
  pure: false, // Set to true for better performance
})
export class TimeAgoPipe implements PipeTransform {
  constructor(private changeDetectorRef: ChangeDetectorRef) {}

  transform(value: any): string {
    if (!value) return ''; // Handle null or undefined values
    const date = typeof value === 'string' ? parseISO(value) : new Date(value);
    const now = new Date();
    const secondsDiff = differenceInSeconds(now, date);

    // Trigger change detection manually
    this.changeDetectorRef.markForCheck();

    if (secondsDiff < 30) {
      return 'just now';
    } else if (secondsDiff < 3600) {
      return formatDistanceToNow(date, { addSuffix: true });
    } else {
      return format(date, 'h:mm a');
    }
  }
}
