import { ChangeDetectorRef, Pipe, PipeTransform, OnDestroy } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { format, formatDistanceToNow, differenceInSeconds, differenceInMinutes, differenceInHours, isSameDay, isSameWeek, isSameMonth, isSameYear, subDays, parseISO } from 'date-fns';

@Pipe({
  name: 'timeAgoConv',
  pure: false, // Set to true for better performance
})
export class TimeAgoConvPipe implements PipeTransform, OnDestroy {
  private intervalSubscription: Subscription;

  constructor(private cdr: ChangeDetectorRef) {
    // Update every minute or your preferred time interval
    this.intervalSubscription = interval(60000).subscribe(() => {
      this.cdr.markForCheck();
    });
  }

  transform(value: any): any {
    if (!value) return '';
    const date = typeof value === 'string' ? parseISO(value) : new Date(value);
    const now = new Date();
    const secondsDiff = differenceInSeconds(now, date);
    const minutesDiff = differenceInMinutes(now, date);
    const hoursDiff = differenceInHours(now, date);

    this.cdr.markForCheck();

    if (secondsDiff < 30) {
      return 'Now'; 
    } else if (minutesDiff < 60) {
      return `${minutesDiff}m ago`;
    } else if (hoursDiff < 24) {
      return `${hoursDiff}h ago`;
    } else if (isSameDay(date, now)) {
      return format(date, 'h:mm a');
    } else if (isSameDay(date, subDays(now, 1))) {
      return 'Yesterday';
    } else if (isSameWeek(date, now)) {
      return format(date, 'EEE');
    } else if (isSameMonth(date, now)) {
      return format(date, 'd MMM');
    } else if (isSameYear(date, now)) {
      return format(date, 'd MMM');
    } else {
      return format(date, 'd MMM, yyyy');
    }
  }

  ngOnDestroy() {
    if (this.intervalSubscription) {
      this.intervalSubscription.unsubscribe();
    }
  }
}
