import {CalendarDateFormatter, DateFormatterParams} from './angular-calendar';
import { Injectable } from '@angular/core';

import { DatePipe } from '@angular/common';
import { AppConstants } from './config/config';

@Injectable()

export class CustomDateFormatter extends CalendarDateFormatter{
    constructor(private config: AppConstants) { super() }

    appconfig:any = this.config.getConfig();

    public dayViewHour({ date, locale }: DateFormatterParams): string {
      return new DatePipe(locale).transform(date, this.appconfig.timeFormat, locale);
    }
    
  }