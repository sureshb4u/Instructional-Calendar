import { Component, OnInit, Output,EventEmitter } from '@angular/core';
import * as variable from '../interface/calendar-view';
import { AppConstants } from '../config/config';
import {IMyDpOptions, IMyDateModel} from '../../../node_modules/angular4-datepicker/src/my-date-picker';
import { animate, state, trigger, transition, style } from '@angular/animations';
import { NgxUiLoaderService } from 'ngx-ui-loader';



@Component({
  selector: 'app-calendar-filter',
  templateUrl: './calendar-filter.component.html',
  styleUrls: ['./calendar-filter.component.css'],
  animations: [
        trigger('fadeOut',
        [
          state('in', style({opacity: 0})),
          state('out', style({opacity: 1})),
          state('void', style({opacity: 1})),
          transition('void <=> *', animate('0.5s ease'))
        ])
  ]
})
export class CalendarFilterComponent implements OnInit {
  data = new variable.Data();
  appConfig;
  filterObject = {
    selectedCenter:{},
    selectedDate:undefined,
    endDate:""
  };

  @Output() filterData = new EventEmitter<any>();
  constructor(private config: AppConstants,private ngxService: NgxUiLoaderService ) { }

  selectedDate: any = { jsdate: new Date() };
  public myDatePickerOptions: IMyDpOptions ;

  fadeProp = "in";
  

  onDateChanged(event: IMyDateModel) {
    let self = this;
      self.ngxService.start();
      let dateDiv:any = document.getElementsByClassName("selectedDate")[0];
      dateDiv.click();
      setTimeout(function(){    
      if(event.formatted != self.filterObject.selectedDate)  {
        self.filterObject.selectedDate = event.formatted;
        self.config.setSelectedDate(event.formatted) ;
        self.config.setEndDate(event.formatted) ;
        self.config.setStartDate(event.formatted) ;                
        if(self.filterObject.selectedDate){
          self.filterData.emit(self.filterObject);
        }
      }
      self.ngxService.stop();      
    },50);
  }

  ngOnInit() {
    var self = this;
    self.ngxService.start();
    self.appConfig = self.config.getConfig();
    self.myDatePickerOptions = {
      inline:true,
      dateFormat: self.appConfig.dateFormat.toLowerCase(),
      firstDayOfWeek: 'su',
    };
  }

  toggleFadeProp(){
    if(this.fadeProp == "out"){
      this.fadeProp = "in";
    }else{
      this.fadeProp = "out";
    }
  }
  

}
