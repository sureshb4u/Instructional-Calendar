import { Component, ChangeDetectionStrategy,Input,OnChanges, SimpleChanges,DoCheck,ViewChild, OnInit,ElementRef, ChangeDetectorRef,EventEmitter, Output } from '@angular/core';
import { Subject } from 'rxjs';
import { AppConstants } from './config/config';
import { animate, state, trigger, transition, style, group, query, animateChild  } from '@angular/animations';
import { NgxUiLoaderService, SPINNER, NgxUiLoaderConfig } from 'ngx-ui-loader';

import * as data from './interface/calendar-view';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  animations: [
    trigger('expandables',
        [
            state('max', style({ width: '275px' })),
            state('min', style({ width: '70px'})),
            state('void', style({ width: '275px' })),
            transition('min <=> max', [
              group([
                query('@rotation', animateChild()),
                animate('0.5s ease'),
              ]),
            ]),
        ]),
    trigger('rotation',[
      state('default', style({ transform: 'rotate(0)' })),
      state('rotated', style({ transform: 'rotate(-180deg)' })),
      transition('rotated => default', animate('400ms ease-out')),
      transition('default => rotated', animate('400ms ease-in'))
    ])
  ]
})

export class AppComponent implements OnInit {
  events;
  CRMData = new data.Data();
  config:any = {};
  @ViewChild("calendarContainer") calendarContainerDiv:any;
  @ViewChild("filterContainer") filterContainerDiv:any;
  expandFlag = "max";  
  rotationFlag = "default";
  constructor(private appConfig:AppConstants,private ngxService: NgxUiLoaderService,private cdr:ChangeDetectorRef){

  }

  ngOnInit(){
    this.ngxService.start();
    this.config = this.CRMData.getCalendarConfig();
    this.appConfig.setConfig(this.config);
  }

  loadSessions(filterData){
    this.calendarContainerDiv.initCalendar(filterData);
  }

  toggleExpansion(){
    this.expandFlag = (this.expandFlag === 'max' ? 'min' : 'max');
    this.rotationFlag = (this.rotationFlag === 'default' ? 'rotated' : 'default');
    this.filterContainerDiv.toggleFadeProp();    
    this.calendarContainerDiv.toggleExpansion();
  }

}
