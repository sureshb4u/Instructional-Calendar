import { Component, ChangeDetectionStrategy,Input,OnChanges, SimpleChanges,DoCheck,ViewChild, OnInit,ElementRef, ChangeDetectorRef,EventEmitter, Output } from '@angular/core';
import { Subject } from 'rxjs';
import { CalendarEvent,  CalendarEventTimesChangedEvent, CalendarDateFormatter } from '../angular-calendar';
import { CustomDateFormatter } from '../date-formatter';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import * as serverData from '../interface/calendar-view';
import { CommunicationService } from '../communication-service.service';
import { studentSession } from '../model/model.studentSession';
import { calendarEvents } from '../model/calendar-event-model';
import { animate, state, trigger, transition, style } from '@angular/animations';
import * as moment from 'moment';
import * as dateFn from 'date-fns';
import { AppConstants } from '../config/config';
import {XrmconverterService} from '../interface/xrmconverter.service';


@Component({
  selector: 'app-custom-calendar',
  templateUrl: './custom-calendar.component.html',
  styleUrls: ['./custom-calendar.component.scss'],
  providers: [
    {
      provide: CalendarDateFormatter,
      useClass: CustomDateFormatter
    }
  ],
  animations: [
    trigger('maxi',
    [
        state('max', style({ marginLeft: '80px',width:'calc(100% - 80px)' })),
        state('min', style({ marginLeft: '275px',width:'calc(100% - 340px)'})),
        state('void', style({ marginLeft: '275px' })),
        transition('min <=> max', animate('0.5s ease')),
        transition('void => *',animate('0.5s ease'))
    ]),
],
})
export class CustomCalendarComponent implements OnInit{
  constructor(private config:AppConstants,private xrmConverter:XrmconverterService,private ngxService: NgxUiLoaderService,private cdr: ChangeDetectorRef){ }
  view: string = 'day';         //calendar view type;
  viewDate: Date = new Date();  // calendar date selected
  delivery:any = {PI:true,GRP:false}; // delivery type Object
  data = new serverData.Data(); //instance of calendar-view.js
  resourceList = [];
  rawEvent ;
  expansionFlag = "max";
  centers:Array<any> = [];
  dropDownConfig:any = {
    displayKey:"hub_centername", //if objects array passed which key to be displayed defaults to description
    search:true, //true/false for the search functionlity defaults to false,
    height: '400px', //height of the list so that if there are more no of items it can show a scroll defaults to auto. With auto height scroll will never appear
    placeholder:'Select a Center', // text to be displayed when no item is selected defaults to Select,
    noResultsFound: 'No results found!',
    searchPlaceholder:'Search', // label thats displayed in search input,
    searchOnKey: 'hub_centername' // key on which search should be performed this will be selective search. if undefined this will be extensive search on all keys
  };
  recentCenter;
  businessClosure = [];
  allresource;
  pageLoader:boolean = true;          //Loader Flag
  events: CalendarEvent[];
  eventDetails:any = {};
  selectedCenter = {};  
  workingDay;
  @ViewChild("sessionDetails") sessionModal: any; //sessionDetail popup 
  @ViewChild("prompt") prompt: any; //Generic prompt popup
  @ViewChild("customDayView") customDayView:any
  filterObject;
  eventDataForView:any = {};
  pinnedStudentList:any = [];  
  staffExceptions = [];
  eventData;
  dialogBodyText;   //Generic variable for prompt message
  weekviewConfig;
  PI_CODE = 1;
  GF_CODE = 2;
  GI_CODE = 3;
  value
  instructionalHours = [];
  
   // Checks for any change in calendar's date or location
   initCalendar(initData){
     var self = this;
     if(initData){
      if(JSON.stringify(self.filterObject) !== JSON.stringify(initData)){
        self.filterObject = Object.assign({},initData);
        if(self.config.getLocation()){
            self.reloadCalendar(); 
        }
      }
     }
   }

   reloadCalendarData = () =>{
     let self = this;
    self.ngxService.start();
    setTimeout(() => {      
       self.reloadCalendar();
       self.ngxService.stop();    
      }, 50);
   }

   emitFilterData(){
    setTimeout(()=>{
      let self=this;
      self.ngxService.start();
        self.config.setLocation(self.selectedCenter);
        let recentRecordId;
        if(self.recentCenter){
          recentRecordId = self.recentCenter[0]["hub_recently_viewed_recordsid"];
        }
        let recordId = self.data.updateRecentlyViewedCenter(self.selectedCenter["hub_centerid"], recentRecordId);
        self.filterObject.selectedCenter = self.selectedCenter;
        if(self.filterObject.selectedDate && self.selectedCenter){
          self.reloadCalendar();
        }
    },100) 
  }

  clearSearch(el){
    el.searchText = "";
  }

  toggleExpansion(){
    if(this.expansionFlag == "min"){
      this.expansionFlag= "max"
    }else{
      this.expansionFlag = "min"
    }
  }


   // loads the resources student,teacher sessions and availability from the serve
   reloadCalendar = ()=>{
    var self = this;
    let center = self.config.getLocation();
    let selectedDate = self.config.getSelectedDate();
    if(this.view == 'week'){
      self.config.setStartDate(moment(dateFn.startOfWeek(selectedDate)).format("YYYY-MM-DD"));
      self.config.setEndDate(moment(dateFn.endOfWeek(selectedDate)).format("YYYY-MM-DD")); 
    }
    let startDate = moment(self.config.getStartDate()).format("YYYY-MM-DD");
    let endDate = moment(self.config.getEndDate()).format("YYYY-MM-DD");    
    if(startDate){
      self.viewDate = self.filterObject.selectedDate;
      let businessClosure = self.data.getBusinessClosure(center.hub_centerid, startDate, endDate, center['_hub_parentcenter_value']);
      if (businessClosure == null) {
          businessClosure = [];
      }
      self.workingDay = true;
      if (businessClosure.length) {
          for (var i = 0; i < businessClosure.length; i++) {
              var businessStartDate:any = moment(businessClosure[i]['hub_startdatetime']).format("MM-DD-YYYY");
              var businessEndDate:any = moment(businessClosure[i]['hub_enddatetime']).format("MM-DD-YYYY");
              businessStartDate = new Date(businessStartDate + ' ' + '00:00').getTime();
              businessEndDate = new Date(businessEndDate + ' ' + '00:00').getTime();
              var calendarStartDate = new Date(startDate + ' ' + '00:00').getTime();
              var calendarEndDate = new Date(endDate + ' ' + '00:00').getTime();
              if (calendarStartDate >= businessStartDate && calendarEndDate <= businessEndDate) {
                  self.workingDay = false;
              }
          }
      }   
      var iDay = moment(self.viewDate).day();
      if(iDay == 0){
          iDay = 7;
      }
      self.instructionalHours = self.data.getInstructionalHours(iDay, moment(selectedDate).format("YYYY-MM-DD"), center.hub_centerid);
      self.eventDataForView.workingDay = self.workingDay;
      self.eventDataForView.calendarView = self.view;
      self.resourceList = [];
      self.eventDataForView.resourceList = [];
      self.eventDataForView.instructionalHours = self.instructionalHours;
      self.refreshData(false);
    }
   }

   refreshData = (loaderSwitch) => {
      let self = this;
      self.ngxService.start();
      setTimeout(()=>{
        self.eventDataForView.calendarView = self.view;
        let startDate = moment(self.config.getStartDate()).format("YYYY-MM-DD");
        let endDate = moment(self.config.getEndDate()).format("YYYY-MM-DD");    
        self.loadResources(self.filterObject.selectedCenter.hub_centerid);
        let center = self.config.getLocation();
        let selectedDate = self.config.getSelectedDate();
        if(self.workingDay || this.view == "week"){
          let rawPinnedList = self.data.getPinnedData(center.hub_centerid, startDate, endDate, center['_hub_parentcenter_value']);
          self.pinnedStudentList = self.xrmConverter.convertPinnedData(rawPinnedList);
          self.eventDataForView.pinnedList = self.pinnedStudentList;
          self.loadSessions (self.filterObject);
          self.loadStaffSchedule (self.filterObject);
          if(this.view == "week"){
            self.loadStaffAvailability (self.filterObject);
          }  
        }else{
          
        }
        self.eventData = self.eventDataForView;
        if(self.customDayView){
          self.customDayView.initDayview(self.eventData);
        }
        if(loaderSwitch || this.view == "week"){
          self.ngxService.stop();
        }
      },50);
   }

   ngOnInit(){
      let self= this;
      self.weekviewConfig = self.config.getConfig();
      self.centers = self.data.getLocation();
      self.config.setLocationList(self.centers);
      self.recentCenter = self.data.getRecentlyViewedCenter();
      if(self.recentCenter){
        self.selectedCenter = self.centers.filter(center => {
            if(center["hub_centerid"] == self.recentCenter[0]["hub_center"]){
              center['ownerObj'] = {
                id: center['_ownerid_value'],
                entityType: center['_ownerid_value@Microsoft.Dynamics.CRM.lookuplogicalname']
            }
              return center;
            }
        });
        self.selectedCenter = self.selectedCenter[0];
      }else{
        self.selectedCenter = self.centers[0];
      }
      self.config.setLocation(self.selectedCenter["hub_centerid"])
   }

  // Fetch session from backend
  loadSessions = function(filterData){
    if(filterData){
      var centerId = this.filterObject.selectedCenter.hub_centerid;
      var parentCenterValue = this.filterObject.selectedCenter["_hub_parentcenter_value"];
      var selectedDate =  filterData.selectedDate;
      var selectedStartDate;
      var selectedEndDate;
      if(this.view == 'day'){
        selectedStartDate = moment(selectedDate).format("YYYY-MM-DD");
        selectedEndDate = moment(selectedDate).format("YYYY-MM-DD");
      }else{
        selectedStartDate = moment(dateFn.startOfWeek(selectedDate)).format("YYYY-MM-DD");
        selectedEndDate = moment(dateFn.endOfWeek(selectedDate)).format("YYYY-MM-DD"); 

      }
      this.eventDataForView.selectedStartDate = selectedStartDate;
      this.eventDataForView.selectedCenter = this.selectedCenter;
      this.eventDataForView.selectedEndDate = selectedEndDate;
      this.eventDataForView.delivery = this.delivery;
      this.rawEvent = this.data.getStudentSession(centerId,selectedStartDate,selectedEndDate,parentCenterValue);
      if(!this.rawEvent){
        this.rawEvent = [];
      }
      this.convertEventList(this.rawEvent);
    }
  }  

  // Fetch Resources from backend  
  loadResources(centerId){
    var self = this;
    var rawObj = this.data.getResources(centerId);
    if(!rawObj){
      rawObj = [];
    }
    self.allresource = self.convertRawResourceObject(rawObj);
    self.filterResourceByDelivery("");
    self.eventDataForView.resourceList = self.resourceList;
    self.eventDataForView.selectedDeliveryType = self.delivery;
  }
  
  // Filter the resource based on the delivery type selected
  filterResourceByDelivery(event){
    var self = this;
    let clickedButton;
    if(event){
      clickedButton = event.target.innerText;
      if(self.customDayView && self.customDayView.eventForDayview){
        self.eventDataForView = Object.assign({},self.customDayView.eventForDayview);
      }
    }
    self.eventDataForView.selectedDeliveryType = self.delivery;
    let pi=[];
    let grp=[];
    if(self.allresource.length){
      self.resourceList = self.allresource.filter(function(resource){
        if(self.delivery.PI && resource.deliveryTypeCode == self.PI_CODE){
            pi.push(resource);
            return resource;
        }
        if(self.delivery.GRP && resource.deliveryTypeCode != self.PI_CODE){
          grp.push(resource);
          return resource;
        }
      });
      self.resourceList = self.resourceList.sort(function(a,b){
        return a.deliveryTypeCode - b.deliveryTypeCode;
      });
      if(!pi.length && self.delivery.PI && clickedButton == "PI"){
        self.dialogBodyText = "The selected center doesn't have the PI Resource. Please change the filter to see the Group Resources.";
        self.prompt.show();
      }else if(!grp.length && self.delivery.GRP && clickedButton == "GRP"){
        self.dialogBodyText = "The selected center doesn't have any GF or GI Resource. Please change the filter to see the Personal Instruction Resources.";
        self.prompt.show();
      }
    }else{
      self.dialogBodyText = "The selected center doesn't have the Resources.";
      self.prompt.show();
    }
    self.eventDataForView.resourceList = self.resourceList;
    self.eventDataForView.delivery = self.delivery;
    if(self.customDayView && self.customDayView.eventForDayview && event){
      self.customDayView.initDayview(self.eventDataForView);    
    }
  }

  // Fetch Staff schedule from backend
  loadStaffSchedule(filterData){
    if(filterData){
      this.filterObject =  Object.assign({}, filterData);
      var centerId = this.filterObject.selectedCenter.hub_centerid;
      var parentCenterValue = this.filterObject.selectedCenter["_hub_parentcenter_value"];
      var selectedDate =  filterData.selectedDate;
      var selectedStartDate = moment(dateFn.startOfWeek(selectedDate)).format("YYYY-MM-DD");
      var selectedEndDate = moment(dateFn.endOfWeek(selectedDate)).format("YYYY-MM-DD");
      var teacherSchedule = this.data.getStaffSchedule(centerId,selectedStartDate,selectedEndDate,parentCenterValue,true);
      if(!teacherSchedule){
        teacherSchedule = [];
      }
      this.convertRawStaffScheduleObject(teacherSchedule);
    }
  }

  // Fetch the staff timings from CRM
  loadStaffAvailability(filterData){
    this.filterObject =  Object.assign({}, filterData);
    var centerId = this.filterObject.selectedCenter.hub_centerid;
    var parentCenterId = this.filterObject.selectedCenter['_hub_parentcenter_value'];
    var selectedDate =  filterData.selectedDate;
    var selectedStartDate = moment(dateFn.startOfWeek(selectedDate)).format("YYYY-MM-DD");
    var selectedEndDate = moment(dateFn.endOfWeek(selectedDate)).format("YYYY-MM-DD");
    var teacherAvailability = this.data.getStaffAvailability(centerId,selectedStartDate,selectedEndDate);
    this.staffExceptions = this.data.getStaffException(centerId,selectedStartDate,selectedEndDate,parentCenterId);
    if(!this.staffExceptions){
      this.staffExceptions = [];
    }
    if(!teacherAvailability){
      teacherAvailability = [];
    }
    this.convertRawStaffAvailabilityObject(teacherAvailability);
  }
  // converts the eventList from CRM to readable Object
  convertEventList(rawEvent){
    var self = this;
    let currentEndDate = self.config.getEndDate();
    let currentSelectedDate = self.config.getSelectedDate();
    var studentSessionList:studentSession[] = [];
        for (let event of rawEvent){
          var sDate = new Date(event['hub_session_date@OData.Community.Display.V1.FormattedValue'] + " " + event['hub_start_time@OData.Community.Display.V1.FormattedValue']);
          var eDate = new Date(event['hub_session_date@OData.Community.Display.V1.FormattedValue'] + " " + event['hub_end_time@OData.Community.Display.V1.FormattedValue']);
          var startHour = new Date(event['hub_session_date@OData.Community.Display.V1.FormattedValue'] + " " + event['hub_start_time@OData.Community.Display.V1.FormattedValue']);          
          let effStartDate:any = sDate;
          effStartDate = new Date(effStartDate).setHours(0);
          effStartDate = new Date(new Date(effStartDate).setMinutes(0));
          let allowStudentFlag = false;
          let effEndDate:any = self.getEffectiveEndDate(event);    
          effEndDate = new Date(effEndDate).setHours(23);
          effEndDate = new Date(new Date(effEndDate).setMinutes(59));
          if (effStartDate.getTime() <= new Date(currentEndDate).getTime() &&
              effEndDate.getTime() >= new Date(currentSelectedDate).getTime()) {
              allowStudentFlag = true;
          }    
          if(allowStudentFlag || event["hub_isattended"]){
            var eventObj:any = {};
            eventObj.etagId= event['@odata.etag'],
            eventObj.id = event["_hub_student_value"];
            eventObj.name = event["_hub_student_value@OData.Community.Display.V1.FormattedValue"];
            eventObj.start = sDate;
            eventObj.end = eDate;
            eventObj.startHour = startHour;
            eventObj.sessionDate= event['hub_session_date'],
            eventObj.gradeId = event['astudent_x002e_hub_grade'];
            eventObj.grade = event['astudent_x002e_hub_grade@OData.Community.Display.V1.FormattedValue'];
            eventObj.subject = event['aprogram_x002e_hub_areaofinterest@OData.Community.Display.V1.FormattedValue'];
            eventObj.subjectId = event['aprogram_x002e_hub_areaofinterest'];
            eventObj.subjectGradient = event['aprogram_x002e_hub_color'];
            eventObj.programId = event['aprogram_x002e_hub_programid'];
            eventObj.serviceId = event['_hub_service_value'];
            eventObj.deliveryTypeId= event['aproductservice_x002e_hub_deliverytype'],            
            eventObj.deliveryType = event['adeliverytype_x002e_hub_name'];
            eventObj.deliveryTypeCode = event['adeliverytype_x002e_hub_code'];
            eventObj.deliveryTypeCodeVal= event['adeliverytype_x002e_hub_code@OData.Community.Display.V1.FormattedValue'],            
            eventObj.is1to1 = event["hub_is_1to1"],
            eventObj.programId = event['aprogram_x002e_hub_programid'],
            eventObj.serviceValue = event['_hub_service_value@OData.Community.Display.V1.FormattedValue'],
            eventObj.sessionId = event['hub_studentsessionid'],
            eventObj.sessiontype = event['hub_sessiontype'],
            eventObj.sessionStatus = event['hub_session_status'],
            eventObj.duration = event['aproductservice_x002e_hub_duration'],
            eventObj.timeSlotType = event['aproductservice_x002e_hub_timeslottype'],
            eventObj.makeupExpiryDate = event['hub_makeup_expiry_date@OData.Community.Display.V1.FormattedValue'],
            eventObj.isAttended = event['hub_isattended'],
            eventObj.enrolStartDate = event['aenrollment_x002e_hub_enrollmentstartdate@OData.Community.Display.V1.FormattedValue'],
            eventObj.enrolEndDate = event['aenrollment_x002e_hub_enrollmentenddate@OData.Community.Display.V1.FormattedValue'],
            eventObj.namedHoursId = event['aproductservice_x002e_hub_namedgfhoursid'];
            eventObj.locationId = event['_hub_center_value'];
            eventObj.locationName = event['_hub_center_value@OData.Community.Display.V1.FormattedValue'];

            if(event['aenrollment_x002e_hub_enrollmentid']){
              eventObj.enrollmentId = event['aenrollment_x002e_hub_enrollmentid'];
              
            }
            if (event['_hub_student_session_value']) {
              eventObj.studentSession = event['_hub_student_session_value'];
            }

            if (event['_hub_master_schedule_value']) {
              eventObj.masterScheduleId = event['_hub_master_schedule_value'];
            }
            if (event['hub_sourceapplicationid']) {
              eventObj.sourceAppId = event['hub_sourceapplicationid'];
            }
            if (event.hasOwnProperty('aenrollment_x002e_hub_nonpreferredteacher')) {
              eventObj['nonPreferredTeacher'] = event['aenrollment_x002e_hub_nonpreferredteacher'];
            }
            if (event['aproductservice_x002e_hub_namedgfhoursid']) {
              eventObj.namedGfid = event['aproductservice_x002e_hub_namedgfhoursid'];
            }
            if (eventObj.subjectGradient && eventObj.subjectGradient.split(",")[1]) {
              eventObj.subjectColorCode = eventObj.subjectGradient.split(",")[1].replace(");", '');
            } else {
              eventObj.subjectColorCode = event['aprogram_x002e_hub_color'];
            }
            eventObj.subjectGradient = eventObj.subjectGradient.replace(';','');
            eventObj.iconStyle = {
              '-webkit-text-fill-color': 'transparent',
              'background':eventObj.subjectGradient,
              'background-clip': 'unset',
              'color': eventObj.subjectColorCode,
              '-webkit-background-clip': 'text'
            };
            if(event["_hub_resourceid_value"]){
              eventObj.resourceId = event["_hub_resourceid_value"];
            }
            // Below Condition to put pinIcon only for PI DT student. 
            if (self.pinnedStudentList.length) {
              var isPinned = self.pinnedStudentList.filter(function (x) {
                  return (x.studentId == eventObj.id &&
                          // x.resourceId == obj.resourceId &&
                          x.dayId == self.config.getDayValue(sDate) &&
                          x.startTime == moment(sDate).format("h:mm A") &&
                          (eventObj.sessionStatus == self.config.SCHEDULE_STATUS))

              });
              if (isPinned[0] != undefined && isPinned[0].resourceId != undefined) {
                  if (isPinned[0].resourceId == eventObj.resourceId) {
                    eventObj.pinId = isPinned[0].id;
                  }
              }
          }
            studentSessionList.push(eventObj);
          };
        }
        self.eventDataForView.sessionList = studentSessionList;
        if(self.view == "week"){
          self.convertstudentSessionToCalendarObject(studentSessionList,true,'student');
        }
  }

  // converts the eventList Objects to calendarEvent Object
  convertstudentSessionToCalendarObject(studentSessionList,isClear,label){
    var eventList:any = {};
    var self = this;
    var resourceCount = 0;
    for(let resource of self.resourceList){
      resourceCount+= resource.capacity;
    }
    for(let element of studentSessionList){
      let weekEvent:any = {};
      weekEvent.id = element.id;
      weekEvent.start = element.start;
      weekEvent.end = element.end;
      weekEvent.draggable = false;
      weekEvent.resizable = {beforeStart : false,afterEnd:false};
      weekEvent.color = self.config.colorObj;
      weekEvent.name = element.name;
      weekEvent.resourceCapacity = resourceCount;
      if(eventList[weekEvent.start] && (weekEvent.end).toString() == eventList[weekEvent.start].end){
        if(label == 'TA'){
          eventList[weekEvent.start].teacherAvailability.push(element)
        }else if(label == 'TS'){
          eventList[weekEvent.start].teacherSchedule.push(element)
        }else if(element.resourceId){
          var existingEvent = false;
          eventList[weekEvent.start].sessionList.forEach(function(val,key){
              if(element.resourceId == val.resourceId && (element.start).toString() == val.start && (val.end).toString() == element.end){
                existingEvent = true;
                eventList[weekEvent.start].sessionList[key].students.push(element);
              }
          });
          if(!existingEvent){
            var sessionObject = Object.assign({},element);
            sessionObject.students = [];
            sessionObject.students.push(element);
            eventList[weekEvent.start].sessionList.push(sessionObject);
          }
          eventList[weekEvent.start].studentSessions.push(element.name);
        }else{
          eventList[weekEvent.start].SOF.push(element);
        }
      }else{
        weekEvent.teacherAvailability = [];
        weekEvent.teacherSchedule = [];
        weekEvent.sessionList = [];
        weekEvent.studentSessions = [];
        weekEvent.SOF = [];
        if(label == 'TA'){
          weekEvent.teacherAvailability.push(element);  
        }else if(label == 'TS'){
          weekEvent.teacherSchedule.push(element);  
          var scheduleObj:any = {};
          scheduleObj.teacher = element;
          weekEvent.sessionList.push(scheduleObj);
        }else if(element.resourceId){
          var sessionObject = Object.assign({},element);
          sessionObject.students = [];
          sessionObject.students.push(element);
          weekEvent.sessionList.push(sessionObject);
          weekEvent.studentSessions.push(element.name);
        }else{
          weekEvent.SOF.push(element);
        }
        eventList[weekEvent.start] = weekEvent;
      }   
    };
    if(isClear){
      self.events = [];
    }    
    var eventArray = Object.assign([],self.events);
      Object.keys(eventList).map(function(key) {
        var eventFlag = false;
        if(label != 'student'){
          eventArray.filter(function(event,index){
            if(key == event.start && eventList[key].end == (event.end).toString()){
              eventFlag = true;
              var eventObj:any = {};
              eventObj = Object.assign({},eventArray[index]);
              if(label == 'TA'){
                eventObj.teacherAvailability = eventList[key].teacherAvailability;
              }else{
                eventObj.teacherSchedule = eventList[key].teacherSchedule;
                eventObj.teacherSchedule.forEach(function(element){
                  var existingEvent = false;
                  eventObj.sessionList.forEach(function(val,key){
                      if(element.resourceId == val.resourceId && (element.start).toString() == val.start && (val.end).toString() == element.end){
                        existingEvent = true;
                        val.teacher = element;
                      }
                  });
                  if(!existingEvent){
                    var scheduleObj = Object.assign({},element);
                    scheduleObj.teacher = element;
                    eventObj.sessionList.push(scheduleObj);
                  }
                });
              }
              self.events[index] = eventObj;
            }
         });
        }
        if(!eventFlag){
          self.events.push(eventList[key]);
        }
    });
  }
  
  // converts the resourceObject to readable Object
  convertRawResourceObject(rawResourceObj){
    var objList:any = [];
    var self = this;
    var selectedDate = self.viewDate;
    selectedDate = new Date(self.viewDate);
    var tempList = rawResourceObj.filter(function (resource) {
      if (resource.hub_deactivating_start_date && resource.hub_deactivating_end_date &&
      !(selectedDate.getTime() >= new Date(moment(resource.hub_deactivating_start_date).format("MM-DD-YYYY")).getTime()
      && selectedDate.getTime() <= new Date(moment(resource.hub_deactivating_end_date).format("MM-DD-YYYY")).getTime())) {
          return resource;
      } else if (!resource.hub_deactivating_end_date && resource.hub_deactivating_start_date
          && !(selectedDate.getTime() >= new Date(moment(resource.hub_deactivating_start_date).format("MM-DD-YYYY")).getTime())) {
          return resource;
      } else if (!resource.hub_deactivating_start_date) {
          return resource;
      }
    });
    rawResourceObj = tempList;
      for(let resource of rawResourceObj){
        var obj:any = {}
        obj.id = resource["hub_center_resourcesid"];
        obj.name = resource["hub_name"]
        obj.capacity = resource["hub_capacity"];
        obj.deliveryTypeId = resource["_hub_deliverytype_value"];
        obj.deliveryTypeCode = resource["adeliverytype_x002e_hub_code"];
        obj.deliveryType = resource["adeliverytype_x002e_hub_code@OData.Community.Display.V1.FormattedValue"];
        obj.deliveryTypeValue = resource["_hub_deliverytype_value@OData.Community.Display.V1.FormattedValue"]
        objList.push(obj);
      }       
      return objList;
  }

  // converts raw Staff Data to readable Object
  convertRawStaffScheduleObject(staffSchedule){
    let self = this;
    var teacherScheduleList = [];
    staffSchedule.forEach(val => {
      var sDate, eDate, startHour, currentCalendarDate;
       currentCalendarDate = self.viewDate;
      if (val['hub_date@OData.Community.Display.V1.FormattedValue'] != undefined &&
        val['hub_start_time@OData.Community.Display.V1.FormattedValue'] != undefined) {
          sDate = new Date(val['hub_date@OData.Community.Display.V1.FormattedValue'] + " " + val['hub_start_time@OData.Community.Display.V1.FormattedValue']);
          eDate = new Date(val['hub_date@OData.Community.Display.V1.FormattedValue'] + " " + val['hub_end_time@OData.Community.Display.V1.FormattedValue']);
          startHour = new Date(val['hub_date@OData.Community.Display.V1.FormattedValue'] + " " + val['hub_start_time@OData.Community.Display.V1.FormattedValue']);
          currentCalendarDate = startHour;
          if (val['_hub_resourceid_value'] == undefined) {
              // Terminate loop if resource is not there for staff
              return true;
          }
      }
      else {
          return true;
      }
      if (val['_hub_resourceid_value']) {
          var resource = self.getResourceObj(val['_hub_resourceid_value']);
          if (!resource) {
              // if Deactivated Resource Found terminate the loop
              return true;
          }
      }
        var teacher:any = {
          etagId: val['@odata.etag'],
          id: val['_hub_staff_value'],
          name: val["_hub_staff_value@OData.Community.Display.V1.FormattedValue"],
          start: currentCalendarDate,
          end: eDate,
          startHour: currentCalendarDate,
          resourceId: val['_hub_resourceid_value'],
          deliveryTypeId: val['aproductservice_x002e_hub_deliverytype'],
          deliveryType: val['aproductservice_x002e_hub_deliverytype@OData.Community.Display.V1.FormattedValue'],
          locationId: val['astaff_x002e_hub_center'],
          locationName: val['astaff_x002e_hub_center@OData.Community.Display.V1.FormattedValue'],
          centerId: val['_hub_centerid_value'],
          centerName: val['_hub_centerid_value@OData.Community.Display.V1.FormattedValue'],
          subjectId: val['subjectId'],
          scheduleId: val['hub_staff_scheduleid'],
          serviceId: val['_hub_product_service_value'],
          scheduleType: val['hub_schedule_type']
      };
      if (self.pinnedStudentList.length && teacher.scheduleType != self.config.FLOAT_TEACHER_TYPE) {
        var isPinned = self.pinnedStudentList.filter(function (obj) {
            return (obj.startTime != undefined && obj.resourceId != undefined &&
                        obj.teacherId == teacher.id &&
                        obj.resourceId == teacher.resourceId &&
                        obj.startTime == moment(teacher.start).format("h:mm A") &&
                        obj.dayId == self.config.getDayValue(self.config.getSelectedDate()))
        });
        if (isPinned[0] != undefined) {
          teacher.pinId = isPinned[0].id;
        }
    }
      if(val.stateCode != self.config.ACTIVE_STATE){
        teacherScheduleList.push(teacher);
      }
    });
    self.eventDataForView.teacherScheduleList = teacherScheduleList;
    if(self.view == "week"){
      self.convertstudentSessionToCalendarObject(teacherScheduleList,false,'TS');
    }
  }

  //converts the Teacher available timings to readable Object
  convertRawStaffAvailabilityObject(staffAvailability){
      let self = this;
      var currentCalendarDate = new Date(this.viewDate);
      var selectedStartDate = new Date(moment(dateFn.startOfWeek(currentCalendarDate)).format("YYYY-MM-DD"));
      selectedStartDate = new Date(selectedStartDate.setHours(0));
      var selectedEndDate = new Date(moment(dateFn.endOfWeek(currentCalendarDate)).format("YYYY-MM-DD")) ;
      selectedEndDate = new Date(selectedEndDate.setHours(23));
      var staffTimingList = [];
      staffAvailability.forEach(args => {
            var obj:any = {
                name: args['astaff_timings_x002e_hub_staffid@OData.Community.Display.V1.FormattedValue'],
                id: args['astaff_timings_x002e_hub_staffid'],
                locationId: args['astaff_timings_x002e_hub_centerid'],
                deliveryTypeId: args['_hub_deliverytype_value'],
            }
            if (args['hub_effectivestartdate@OData.Community.Display.V1.FormattedValue'] != undefined) {
              obj.startDate = new Date(args['hub_effectivestartdate@OData.Community.Display.V1.FormattedValue']);
              obj.startDate = new Date(obj.startDate).setHours(0);
              obj.startDate = new Date(new Date(obj.startDate).setMinutes(0));
              obj.startDate = new Date(new Date(obj.startDate).setSeconds(0));
            }
            if (args['hub_enddate@OData.Community.Display.V1.FormattedValue'] != undefined) {
                obj.endDate = new Date(args['hub_enddate@OData.Community.Display.V1.FormattedValue']);
                obj.endDate = new Date(obj.endDate).setHours(0);
                obj.endDate = new Date(new Date(obj.endDate).setMinutes(0));
                obj.endDate = new Date(new Date(obj.endDate).setSeconds(0));
            } else {
                obj.endDate = new Date(selectedEndDate.getTime());
                obj.endDate = new Date(obj.endDate).setHours(23);
                obj.endDate = new Date(new Date(obj.endDate).setMinutes(59));
                obj.endDate = new Date(new Date(obj.endDate).setSeconds(59));
            }
            for (var j = selectedStartDate.getTime() ; j <= selectedEndDate.getTime() ; j = j + (24 * 60 * 60 * 1000)) {
              if (self.config.getDayValue(new Date(j)) == args.hub_days) {  
                if (j >= obj.startDate.getTime() && j <= obj.endDate.getTime()) {
                    obj.start = new Date(moment(j).format('MM-DD-YYYY') + " " + args['hub_starttime@OData.Community.Display.V1.FormattedValue']);
                    obj.startTime = args['hub_starttime@OData.Community.Display.V1.FormattedValue'];
                    obj.endTime = new Date(moment(j).format('MM-DD-YYYY') + " " + args['hub_endtime@OData.Community.Display.V1.FormattedValue']);
                    if (!obj.endTime) {
                      obj.end = new Date(obj.start.setHours(obj.start.getHours() + 1));
                      obj.startTime = obj.start;
                      obj.start = new Date(obj.startTime.setMinutes(0));
                      staffTimingList.push(obj);
                  }
                  else {
                      var staffStartHour = obj.start;
                      staffStartHour = new Date(staffStartHour.setMinutes(0));
                      do {
                          var newObject = Object.assign({}, obj);
                          var start = new Date(staffStartHour.getTime());
                          newObject.start = start;
                          newObject.end = new Date(staffStartHour.setHours(staffStartHour.getHours() + 1));
                          staffTimingList.push(newObject);
                          
                      }
                      while (staffStartHour.getTime() < obj.endTime.getTime());
                  }
              }
          }
        }
      });
      self.eventDataForView.staffAvailability = [];
      staffTimingList.forEach(staffObj =>{
        if(self.checkForStaffException(staffObj)){
          self.eventDataForView.staffAvailability = staffObj;
        }
      });
      self.convertstudentSessionToCalendarObject(staffTimingList,false,'TA');   
  }

  checkForStaffException = function (teacher) {
    var self = this;
    var teacherIsAvialble = true;
    if (self.staffExceptions.length) {
        for (var i = 0; i < self.staffExceptions.length; i++) {
            var staffDetail = self.staffExceptions[i];
            let startHour1:any = new Date(teacher.startHour);
            startHour1 = self.config.convertToMinutes(moment(startHour1).format("h:mm A"));
            var endHour1 = startHour1 + 60;
            if (staffDetail['astaff_x002e_hub_staffid'] == teacher.id &&
                (
                    (
                        teacher.sta <= staffDetail['hub_starttime'] &&
                        endHour1 >= staffDetail['hub_endtime']
                    ) ||
                    (
                        staffDetail['hub_starttime'] <= startHour1 &&
                        staffDetail['hub_endtime'] >= endHour1
                    ) ||
                    (
                        endHour1 > staffDetail['hub_starttime'] &&
                        staffDetail['hub_endtime'] > startHour1
                    )
                )) {
                teacherIsAvialble = false;
                break;
            }
        }
    }
    return teacherIsAvialble;
  }

  // Triggers when event timings changed in calendar
  refresh: Subject<any> = new Subject();
  eventTimesChanged({
    event,
    newStart,
    newEnd
  }: CalendarEventTimesChangedEvent): void {
    event.start = newStart;
    event.end = newEnd;
    this.refresh.next();
  }

  // Triggers when an event is clicked in the calendar
  eventClicked({ event }: { event: CalendarEvent }): void {
    this.eventDetails = event;
    this.sessionModal.show();
  }

  //Returns the resource Object of the id which is passed
  getResourceObj(resourceId){
    return this.resourceList.filter(function(val){
        if(val.id == resourceId){
          return val;
        }
    })

  }

  findLeaveDays = function () {
    var self = this;
    self.leaveDays = [];
    for (var j = self.selectedStartDate.getTime() ; j < self.selectedEndDate.getTime() ; j = j + (24 * 60 * 60 * 1000)) {
        for (var i = 0; i < self.businessClosure.length; i++) {
            var businessStartDate = self.businessClosure[i]['hub_startdatetime@OData.Community.Display.V1.FormattedValue'];
            var businessEndDate = self.businessClosure[i]['hub_enddatetime@OData.Community.Display.V1.FormattedValue'];
            businessStartDate = new Date(businessStartDate + ' ' + '00:00').getTime();
            businessEndDate = new Date(businessEndDate + ' ' + '00:00').getTime();
            if (j >= businessStartDate && j <= businessEndDate) {
                self.leaveDays.push(new Date(j));
            }
        }
    }
};

  getEffectiveEndDate = val => {
    var self = this;
    var endDateArray = [];
    var deliveryTypeCode = val['adeliverytype_x002e_hub_code'];
    var timeSlotType = val['aproductservice_x002e_hub_timeslottype'];
    var currentCalendarDate = self.config.getSelectedDate();
    var instructionalHourEndDate = [];
    if (val["hub_sessiontype"] == self.config.MAKEUP_TYPE) {
        return new Date(currentCalendarDate);
    } else if (val["hub_sessiontype"] == self.config.FLOAT_TYPE) {
        if (val['aenrollment_x002e_hub_committedsessionenddate@OData.Community.Display.V1.FormattedValue']) {
            return new Date(moment(val['aenrollment_x002e_hub_committedsessionenddate@OData.Community.Display.V1.FormattedValue']).format("MM-DD-YYYY"));
        } else {
            return new Date(currentCalendarDate);
        }
    }
    if (self.instructionalHours) {
            instructionalHourEndDate = self.instructionalHours.filter(function (insHour, key) {
            if (deliveryTypeCode == self.GF_CODE) {
                return (deliveryTypeCode == insHour['adeliverytype_x002e_hub_code'] && val['aproductservice_x002e_hub_namedgfhoursid'] == insHour['_hub_workhours_value'])
            } else {
                return (deliveryTypeCode == insHour['adeliverytype_x002e_hub_code'] && timeSlotType == insHour['hub_timeslottype'])
            }
        });
    }
    instructionalHourEndDate.forEach(val => {
      if (val['hub_effectiveenddate@OData.Community.Display.V1.FormattedValue']) {
          endDateArray.push(moment(val['hub_effectiveenddate@OData.Community.Display.V1.FormattedValue']).format("MM-DD-YYYY"));
      }    
    });

    if (val['hub_effectiveenddate@OData.Community.Display.V1.FormattedValue']) {
        endDateArray.push(moment(val['hub_effectiveenddate@OData.Community.Display.V1.FormattedValue']).format("MM-DD-YYYY"));
    }
    if (val['aenrollment_x002e_hub_enrollmentenddate@OData.Community.Display.V1.FormattedValue']) {
        endDateArray.push(moment(val['aenrollment_x002e_hub_enrollmentenddate@OData.Community.Display.V1.FormattedValue']).format("MM-DD-YYYY"));
    }
    if (val['aenrollment_x002e_hub_committedsessionenddate@OData.Community.Display.V1.FormattedValue']) {
        endDateArray.push(moment(val['aenrollment_x002e_hub_committedsessionenddate@OData.Community.Display.V1.FormattedValue']).format("MM-DD-YYYY"));
    }
    endDateArray.push(currentCalendarDate);
    var leastEndDate = endDateArray.sort(function (a, b) { return new Date(a).getTime() - new Date(b).getTime(); })[0];
    return new Date(leastEndDate);
  }

}
