import { Component, ChangeDetectionStrategy, ChangeDetectorRef,ViewChild,ElementRef,OnInit, EventEmitter } from '@angular/core';
import { Subject } from 'rxjs';
import { CalendarEvent, CalendarEventTimesChangedEvent,Resource,CalendarDayViewComponent,CalendarDateFormatter, DateFormatterParams} from '../angular-calendar';
import interact from 'interactjs';
import * as moment from 'moment';
import * as serverData from '../interface/calendar-view';
import { animate, state, trigger, transition, style } from '@angular/animations';
import { AppConstants } from '../config/config';
import * as globals from '../config/config';
import { CustomDateFormatter } from '../date-formatter';
import {XrmconverterService} from '../interface/xrmconverter.service';
import { ModalModule, TooltipModule, PopoverModule, ButtonsModule } from 'angular-bootstrap-md'
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { ContextMenuComponent } from 'ngx-contextmenu';


@Component({
  selector: 'app-custom-calendar-dayview',
  templateUrl: './custom-calendar-dayview.component.html',
  styleUrls: ['./custom-calendar-dayview.component.scss'],
  animations: [
    trigger('visibilityChanged',
        [
            state('visible', style({ right: '0' })),
            state('hidden', style({ right: '-400px'})),
            state('void', style({ right: '-400px' })),
            transition('visible <=> hidden', animate('0.5s ease')),
            transition('void => *',animate('0.5s ease'))
        ])
],
providers: [
    {
      provide: CalendarDateFormatter,
      useClass: CustomDateFormatter
    }
  ],
})

export class CustomCalendarDayviewComponent implements OnInit {
  viewDate: Date = new Date();
  @ViewChild("prompt") prompt: any;
  @ViewChild("studentConfirmation") studentConfirmation:any;
  @ViewChild("refreshConfirmation") refreshConfirmation:any;
  @ViewChild("teacherConfirmation") teacherConfirmation:any;
  @ViewChild("makeupConfirmation") makeupConfirmation:any;
  @ViewChild("teacherFloatConfirmation") teacherFloatConfirmation:any;
  @ViewChild("makeupNfloat") makeupNfloat:any;
  @ViewChild("floatTeacher") floatTeacher:any;
  @ViewChild("reschedulePopup") reschedulePopup:any;
  @ViewChild("rescheduleStartTime") rescheduleStartTime:any;
  @ViewChild("rescheduleEndTime") rescheduleEndTime:any;
  @ViewChild("reschedulePicker") reschedulePicker:any;
  @ViewChild(ContextMenuComponent) public contextMenu: ContextMenuComponent;
  
  
  clientX;
  clientY;
  initFlag = false;
  dayViewConfg:any;
  eventForDayview ;
  mouseMovement:any;
  resources:any[];
  sofCount = 0;
  availableStudentList:any = [];
  availableTeacherList:any = [];
  staffExceptionList:any = [];
  saList:any = [];
  rescheduleDate;
  data = new serverData.Data();
  droppedTime;
  visibility = 'hidden';
  delivery;
  droppedEvent;
  droppedResource;
  dialogBodyText ;
  selectedCenterId;
  startDate;
  loader = false;
  endDate;
  parencenterId;
  accountClosureFlag;
  businessClosureFlag;
  PI_CODE = 1;
  GF_CODE = 2;
  GI_CODE = 3;
  ONETOONE = globals.ONETOONE_CONFLICT;
  ONETOONE_INFO = globals.ONETOONE_INFO;
  NO_TIMING = globals.NO_TIMING;
  programList = [];
  staffProgram = [];
  convertedPinnedList = [];
  instructionalHours = [];
  makeupNfloatList = [];
  floatConvertedTeacherList = [];
  makeupFlag = false;
  dragFlag = false;
  futureDate = false;
  noTimings = false;
  rescheduleOptions = {};
  rescheduleTimeList = [];
  constructor(public config:AppConstants,public xrmConverter:XrmconverterService,private buttons:ButtonsModule,public ngxService: NgxUiLoaderService,public cdr: ChangeDetectorRef) {
   }

  initDayview(initData) {
    var self = this;
    if(JSON.stringify(self.eventForDayview) !== JSON.stringify(initData)){
        self.eventForDayview = Object.assign({},initData);
        self.ngxService.start();       
        setTimeout(function(){
                self.refreshData();                      
        },50);
        setTimeout(function(){
            if(!self.initFlag){
                self.initInteract();            
            } 
            self.ngxService.stop(); 
            self.scrollToEvent();            
            self.focusOncalendar();
        },450);
    }
  }

  refreshData=()=>{
    let self = this;
    self.visibility = 'hidden';
    self.futureDate = false;
    self.viewDate = new Date(self.config.getStartDate());
    if(self.viewDate.getTime() > new Date().getTime()){
        self.futureDate = true;
    }
    self.accountClosureFlag = false;
    self.availableStudentList = [];
    self.delivery = self.eventForDayview.delivery;
    self.businessClosureFlag = self.eventForDayview.workingDay;
    self.selectedCenterId = self.config.getLocation().hub_centerid;
    self.startDate = self.eventForDayview.selectedStartDate;
    self.endDate = self.eventForDayview.selectedStartDate;
    self.parencenterId = self.config.getLocation()['_hub_parentcenter_value'];        
    self.instructionalHours = self.eventForDayview.instructionalHours;
    self.convertedPinnedList = self.eventForDayview.pinnedList;
    let parentCenterId = self.selectedCenterId;
    if(self.config.getLocation()["_hub_parentcenter_value"]){
      parentCenterId = self.eventForDayview.selectedCenter["_hub_parentcenter_value"];
    }
    let accountClosure = self.data.getAccountClosure(parentCenterId,self.viewDate.getMonth()+1,self.viewDate.getFullYear());
    if(accountClosure && accountClosure.length){
        if(accountClosure[0]["hub_status"] == "2"){
            self.accountClosureFlag = true;
        }
    }
    //self.viewDate = new Date(moment(self.eventForDayview.selectedStartDate).format("YYYY-MM-DD"));
    if(self.businessClosureFlag){
        self.staffProgram = self.data.getStaffProgram(self.selectedCenterId);
        if(!self.staffProgram){
            self.staffProgram = [];
        }
        self.programList = self.data.getProgramList(self.selectedCenterId);
        if(!self.programList){
            self.programList = [];
        }
        self.convertRawStaffObject(self.data.getAvailableStaff(self.config.getLocation().hub_centerid,self.startDate,self.endDate));
        self.formEventObjects(self.eventForDayview);
        self.sofCount = 0;
        if(self.availableStudentList.length){
            let piStudentList = self.availableStudentList.filter(student => {
                return student.deliveryTypeCode == self.PI_CODE;
            });
            let grpStudentList = self.availableStudentList.filter(student =>{
                return student.deliveryTypeCode != self.PI_CODE;
            });
            if(self.eventForDayview.delivery.PI){
                self.sofCount = piStudentList.length;
            }
            if(self.eventForDayview.delivery.GRP){
                self.sofCount += grpStudentList.length;
            }
        }
        self.convertExceptionList(self.data.getStaffException(self.config.getLocation().hub_centerid,self.startDate,self.endDate,parentCenterId));
        self.addStaffSchedule();
        self.formatStaffAvailability();
        self.getStudentAvaialbility();
    }else{
        self.formEventObjects(self.eventForDayview);        
    }
    self.refresh.next(); 
  }

  ngOnInit(){
    this.ngxService.start();        
    this.dayViewConfg = this.config.getConfig();    
  }

  formEventObjects = eventForDayView => {
    let self = this;
    self.resources = self.eventForDayview.resourceList;
    let events = [];
    if(self.eventForDayview.sessionList){
        events = self.eventForDayview.sessionList;
    }
    for (let resource of self.resources){
        resource.events = [];
      for(let session of events){
        if(session.resourceId && resource.id == session.resourceId){
          var sessionObj:any = {};
          sessionObj.color = self.config.colorObj[resource.deliveryType];
          sessionObj.start = session.start;
          sessionObj.end = session.end;
          let duration = (session.end.getTime() - session.start.getTime()) / (1000 * 60);
          sessionObj.duration = duration;
          if(!resource.events){
            resource.events = [];
            sessionObj.students = [];
            var studObj:any = {};
            studObj = Object.assign({}, session);
            studObj.duration = duration;
            sessionObj.students.push(studObj);
            resource.events.push(sessionObj); 
            if(!resource.events[0]["is1to1"]){
                resource.events[0]["is1to1"] = studObj["is1to1"];
            }
            resource.events[0]["conflicts"] = false;
          }else{
            var studObj:any = {};
            studObj = Object.assign({}, session);
            studObj.duration = duration;
            var newObj = false;
            for(let event of resource.events){
              if(sessionObj.start.toString() == event.start.toString()){
                newObj = true;
                if(resource.capacity == event.students.length){
                  if( moment(session.start).format("MM/DD/YYYY") == moment(self.viewDate).format("MM/DD/YYYY")){
                      if(session.sessionStatus == self.config.SCHEDULE_STATUS || session.sessionStatus == self.config.RESCHEDULE_STATUS){
                        let duplicateStud = false
                        if (self.availableStudentList.length) {
                            self.availableStudentList.forEach(student => {
                                if(student.start.getTime() == session.start.getTime() && student.id == session.id){
                                    duplicateStud = true;
                                }
                            });
                            if(!duplicateStud){
                                self.availableStudentList.push(session);    
                            }
                        }else{
                            self.availableStudentList.push(session);
                        }
                      }
                  }
                }else{
                  event.students.push(studObj);
                  if(studObj["is1to1"] && event.students.length){
                    event["conflicts"] = true;
                    event.conflictMsg = globals.ONETOONE_CONFLICT;
                    if(!event["is1to1"]){
                        event["is1to1"] = studObj["is1to1"];
                    }
                 }else if (event.is1to1){
                    event["conflicts"] = true;
                    event.conflictMsg = globals.ONETOONE_CONFLICT;
                 }
                 if(resource.capacity <= event.students.length){
                    if(resource.capacity < event.students.length){
                        event["conflicts"] = true;
                        event.conflictMsg += " "+globals.MAX_CAPACITY;
                    }
                    event.maxCapacity = true;
                 }
                }
              }
            }
            if(!newObj){
              sessionObj.students = [];
              sessionObj.students.push(studObj);
              if(!sessionObj["is1to1"]){
                sessionObj["is1to1"] = studObj["is1to1"];
              }
              sessionObj["conflicts"] = false;
              resource.events.push(sessionObj);
            }
          }
        }else if(!session.resourceId){
            if( moment(session.start).format("MM/DD/YYYY") == moment(self.viewDate).format("MM/DD/YYYY")){
                if(session.sessionStatus == self.config.SCHEDULE_STATUS || session.sessionStatus == self.config.RESCHEDULE_STATUS){
                    let duplicateStud = false
                    if (self.availableStudentList.length) {
                        self.availableStudentList.forEach(student => {
                            if(student.start.getTime() == session.start.getTime() && student.id == session.id){
                                duplicateStud = true;
                            }
                        });
                        if(!duplicateStud){
                            self.availableStudentList.push(session);    
                        }
                    }else{
                        self.availableStudentList.push(session);
                    }
                }
            }
        }
      }
    }
  }

  addStaffSchedule = () =>{
    var teacherSchedule = this.eventForDayview.teacherScheduleList;
    for(let resource of this.resources ){
      var teacherObj = {};
      for(let teacher of teacherSchedule){
        if(teacher.resourceId == resource.id){
          var teacherAdded = false;
          var duration = (teacher.end.getTime() - teacher.start.getTime()) / (1000 * 60);          
          if(resource.events){
            for(let event of resource.events){
              if(event.start.toString() == teacher.start.toString()){
                  event.teacher={}
                  event.teacher = teacher;
                  event.duration = duration;
                  event.teacher.deliveryTypeCode = resource.deliveryTypeCode;
                  teacherAdded = true;
              }
          }
          if(!teacherAdded){
            var sessionObj:any = {}
            sessionObj.start = teacher.start;
            sessionObj.end = teacher.end;
            sessionObj.teacher = teacher;
            sessionObj.duration = duration;
            sessionObj.teacher.deliveryTypeCode = resource.deliveryTypeCode;
            sessionObj.color = this.config.colorObj[resource.deliveryType];
            resource.events.push(sessionObj);

          }
          }else{
            resource.events = [];
            var sessionObj:any = {}
            sessionObj.start = teacher.start;
            sessionObj.end = teacher.end;
            sessionObj.color = this.config.colorObj[resource.deliveryType];
            sessionObj.teacher = teacher;
            sessionObj.duration = duration;
            sessionObj.teacher.deliveryTypeCode = resource.deliveryTypeCode;
            resource.events.push(sessionObj);
          }
        }
      }
    }
  }

  formatStaffAvailability = () => {
    var self = this;
    var selectedDate = Object.assign(self.viewDate);
    var eventObjList = [];
    selectedDate = new Date(selectedDate.setHours(0,0,0,0));
    self.availableTeacherList.sort(function (a, b) { return a.startTime - b.startTime });
    self.availableTeacherList = self.availableTeacherList.filter(function(staff,staffKey){
        if (selectedDate >= new Date(staff.startDate) &&
           ((staff.endDate && selectedDate <= new Date(staff.endDate)) || !staff.endDate)) {
            return staff;
        } else {
          self.availableTeacherList.splice(staffKey, 1);
        }
    });
    var staffAvailability = self.availableTeacherList;
    self.availableTeacherList.forEach(function (staffAvailable,staffIndex) {
      var filteredStaff = staffAvailability.filter(function (staff, staffKey) {
          if (self.config.getDayValue(selectedDate) == staff.day && staffAvailable.id == staff.id) {
              if(staffAvailable.day == staff.day && selectedDate >= new Date(staffAvailable.startDate) &&
              ((staffAvailable.endDate && selectedDate <= new Date(staffAvailable.endDate)) || !staffAvailable.endDate)) {
                  return staff;
              }
          }        
      });
      filteredStaff.sort(function (a, b) { return a.startTime - b.startstartTime });
      filteredStaff.forEach(function (teacherTiming, key) {
          if (teacherTiming.hub_timingsid != staffAvailable.hub_timingsid) {
              if ((teacherTiming.startTime <= staffAvailable.startTime && teacherTiming.endTime >= staffAvailable.startTime) ||
                  teacherTiming.startTime >= staffAvailable.startTime && teacherTiming.startTime <= staffAvailable.endTime) {
                  if (teacherTiming.startTime < staffAvailable.startTime) {
                      var indexTobeDeleted = self.availableTeacherList.indexOf(teacherTiming);
                      self.availableTeacherList.splice(indexTobeDeleted, 1);
                      self.availableTeacherList[staffIndex].startTime = teacherTiming.startTime;
                      self.availableTeacherList[staffIndex].start = teacherTiming.start;
                  } else if (teacherTiming.endTime > staffAvailable.endTime) {
                      var indexTobeDeleted = self.availableTeacherList.indexOf(teacherTiming);
                      self.availableTeacherList.splice(indexTobeDeleted, 1);
                      self.availableTeacherList[staffIndex].endTime = teacherTiming.endTime;
                      self.availableTeacherList[staffIndex].end = teacherTiming.end;
                  } else if (teacherTiming.startTime >= staffAvailable.startTime && teacherTiming.endTime <= staffAvailable.endTime) {
                      var indexTobeDeleted = self.availableTeacherList.indexOf(teacherTiming);
                      self.availableTeacherList.splice(indexTobeDeleted, 1);
                  }
              }
          }
      });
    });
    for (let staff of self.availableTeacherList) {
      var exceptionTimeArray = [];
      var index = -1;
      if (self.staffExceptionList.length) {
          for (let exception of self.staffExceptionList) {
              if (staff.id == exception.staffId) {
                  var exceptionStartDate:any = new Date(exception.startDate);
                  // Set time for start date
                  exceptionStartDate = new Date(exceptionStartDate).setHours(0);
                  exceptionStartDate = new Date(new Date(exceptionStartDate).setMinutes(0));

                  var exceptionEndDate = exception.endDate;
                  exceptionEndDate = exceptionEndDate == undefined ? exceptionStartDate : new Date(exceptionEndDate);
                  // Set time for end date
                  exceptionEndDate = new Date(new Date(exceptionEndDate).setHours(23,59,0));
                  if (selectedDate.getTime() >= exceptionStartDate.getTime() && selectedDate.getTime() <= exceptionEndDate.getTime()) {
                      if (exception.entireDay) {
                          index = 1;
                          break;
                      }
                      else {
                          var tempObj:any = {};
                          tempObj.exceptionStartHour = exception.startMin;
                          tempObj.exceptionEndHour = exception.endMin;
                          exceptionTimeArray.push(tempObj);
                      }

                  }
              }
          }
      }
      if (index == -1) {
          if (staff.day == self.config.getDayValue(selectedDate))
          {
              var obj = staff;
              //sorted the exceptions in ascending order of start time
              exceptionTimeArray = exceptionTimeArray.sort(function (a, b) {
                  return a.exceptionStartHour - b.exceptionStartHour;
              });
              if (!obj.end) {
                  obj.end = moment(obj.start, 'h:mm A').hours(22).format("h:mm A");
                  obj.end = moment(obj.end, 'h:mm A').minutes(0).format("h:mm A");
                  obj.end = moment(obj.end, 'h:mm A').seconds(0).format("h:mm A");
              }
              var finalStaffHours = self.removeExceptionalHours(obj, obj.end, exceptionTimeArray)
              if (finalStaffHours.length) {
                  finalStaffHours.forEach(function (staffHours) {
                      eventObjList.push(staffHours);
                  });
              } else {
                  if (!obj.endDate) {
                      obj.endDate = new Date(selectedDate);
                      obj.endDate = moment(obj.endDate).format("MM/DD/YYYY");
                  }
                  obj.startHour = new Date(moment(obj.startDate, "MM/DD/YYYY").format("MM/DD/YYYY") + " " + obj.start).getHours();
                  obj.endHour = new Date(moment(obj.endDate, "MM/DD/YYYY").format("MM/DD/YYYY") + " " + obj.end).getHours();
                  eventObjList.push(obj);
              }
          }
      }
    }
    this.availableTeacherList = eventObjList;
  }

  removeExceptionalHours = (obj, endTime, exceptionTimeArray) => {
    var self = this;
    var eventObjList = [];
    exceptionTimeArray.forEach(function (exception, key) {
        if (key == 0) {
            if (obj.startTime >= exception.exceptionStartHour && obj.startTime < exception.exceptionEndHour && obj.endTime > exception.exceptionStartHour) {
                obj.start = self.config.tConvert(self.config.convertMinsNumToTime(exception.exceptionEndHour));
                obj.startTime = exception.exceptionEndHour;
                eventObjList.push(obj);
            } else if (exception.exceptionStartHour >= obj.startTime && obj.startTime < exception.exceptionEndHour && obj.endTime > exception.exceptionStartHour) {
                obj.end = self.config.tConvert(self.config.convertMinsNumToTime(exception.exceptionStartHour));
                obj.endTime = exception.exceptionStartHour;
                eventObjList.push(obj);
                var splittedObj = Object.assign({},obj);
                splittedObj.start = self.config.tConvert(self.config.convertMinsNumToTime(exception.exceptionEndHour));
                splittedObj.startTime = exception.exceptionEndHour;
                splittedObj.end = endTime;
                splittedObj.endTime = self.config.convertToMinutes(endTime);
                eventObjList.push(splittedObj);
            }
        } else {
            var lastObject = eventObjList[eventObjList.length - 1]
            if ((lastObject.startTime > exception.exceptionStartHour && lastObject.startTime < exception.exceptionEndHour) && lastObject.endTime > exception.exceptionStartHour) {
                lastObject.start = self.config.tConvert(self.config.convertMinsNumToTime(exception.exceptionEndHour));
                lastObject.startTime = exception.exceptionEndHour;
                eventObjList[eventObjList.length - 1] = lastObject;
            } else if (exception.exceptionStartHour >= lastObject.startHour && lastObject.startHour < exception.exceptionEndHour && lastObject.endTime > exception.exceptionStartHour) {
                if (lastObject.startTime == exception.exceptionStartHour) {
                    lastObject.start = self.config.tConvert(self.config.convertMinsNumToTime(exception.exceptionEndHour));
                    lastObject.startTime = exception.exceptionEndHour;
                    eventObjList[eventObjList.length - 1] = lastObject;
                } else {
                    lastObject.endTime = self.config.tConvert(self.config.convertMinsNumToTime(exception.exceptionStartHour));
                    lastObject.endTime = exception.exceptionStartHour;
                    var splittedObj = Object.assign({}, lastObject);
                    splittedObj.start = self.config.tConvert(self.config.convertMinsNumToTime(exception.exceptionEndHour));
                    splittedObj.startTime = exception.exceptionEndHour;
                    splittedObj.end = endTime;
                    splittedObj.endTime = self.config.convertToMinutes(endTime);
                    eventObjList.push(splittedObj);
                }
            }
        }
    });

    eventObjList.forEach(function (eventObj) {
        if (!eventObj.endDate) {
            eventObj.endDate = new Date();
            eventObj.endDate = moment(eventObj.endDate).format("MM/DD/YYYY");
        }
        eventObj.startHour = new Date(moment(eventObj.startDate, "MM/DD/YYYY").format("MM/DD/YYYY") + " " + eventObj.start).getHours();
        eventObj.endHour = new Date(moment(eventObj.endDate, "MM/DD/YYYY").format("MM/DD/YYYY") + " " + eventObj.end).getHours();
    });
    return eventObjList;
}

  convertRawStaffObject = staffAvailableList =>{
    this.availableTeacherList = [];
    if(!staffAvailableList){
        staffAvailableList = [];
    }
    for(let staff of staffAvailableList){
      var staffObj:any = {};
      staffObj.etagId = staff['@odata.etag'];
      staffObj.locationId = staff['astaff_x002e_hub_center'],
      staffObj.name = staff["astaff_timings_x002e_hub_staffid@OData.Community.Display.V1.FormattedValue"];
      staffObj.startDate = staff["hub_effectivestartdate@OData.Community.Display.V1.FormattedValue"];
      staffObj.endDate = staff["hub_effectiveenddate@OData.Community.Display.V1.FormattedValue"];
      staffObj.start = staff["hub_starttime@OData.Community.Display.V1.FormattedValue"];
      staffObj.end = staff["hub_endtime@OData.Community.Display.V1.FormattedValue"];
      staffObj.day = staff["hub_days"];
      staffObj.id = staff["astaff_timings_x002e_hub_staffid"];
      staffObj.timingsId = staff["hub_timingsid"];
      staffObj.startTime = staff["hub_starttime"];
      staffObj.endTime = staff["hub_endtime"];
      this.availableTeacherList.push(staffObj);
    }
  }

  convertExceptionList = staffExceptions =>{
    this.staffExceptionList = [];
    if(!staffExceptions){
        staffExceptions = [];
    }
    for(let staff of staffExceptions){
      var exceptionObj:any = {};
        exceptionObj.exceptionName = staff["hub_name"];
        exceptionObj.startDate = staff["hub_startdate@OData.Community.Display.V1.FormattedValue"];
        exceptionObj.endDate = staff["hub_enddate@OData.Community.Display.V1.FormattedValue"];
        exceptionObj.startTime = staff["hub_starttime@OData.Community.Display.V1.FormattedValue"];
        exceptionObj.endTime = staff["hub_endtime@OData.Community.Display.V1.FormattedValue"];
        exceptionObj.entireDay = staff["hub_entireday"];
        exceptionObj.startMin = staff["hub_starttime"];
        exceptionObj.endMin = staff["hub_endtime"];
        exceptionObj.staffId = staff["astaff_x002e_hub_staffid"];
        this.staffExceptionList.push(exceptionObj);
    }
  }

  toggleRightPane = () =>{
      if(this.visibility == "visible"){
        this.visibility = "hidden";
      }else{
        this.visibility = "visible";
      }
  }

  initInteract = ()=>{
    var self = this;
    var dragText;
    var helperText;
    var resourceWrapper = document.getElementsByClassName("resourceWrapper")[0];
    let htmlElement = document.getElementsByTagName("html")[0];
    let headerElement:any = document.getElementsByClassName("fixedHeader")[0];
    let htmlScrollleft = htmlElement.scrollLeft;
    if(resourceWrapper){
      self.initFlag = true;
      interact(".draggableEl")
      .draggable({
        autoScroll: true,
        inertia:false,
        restrict: {
            restriction: resourceWrapper,
          },
        onstart: e =>{
            dragText = e.target.innerText; 
            helperText = e.target.innerHTML;
            self.dragFlag = true;
        },
        onmove: event =>{
            self.coordinates(event);
        },
        onend: e => { 
            var draggableTitle = e.target
            draggableTitle.style.top= "inherit";
            draggableTitle.style.position= "inherit";
            draggableTitle.style.left= "inherit";
            draggableTitle.style.visibility = "initial";
            
        }
      }); 
      interact('.cal-hour-segment').dropzone({
        overlap:'pointer',
        ondragenter: e =>{
            self.droppedTime = e.target.children[0].innerText;            
            e.relatedTarget.innerText = dragText +" Starting from "+self.droppedTime;
            e.relatedTarget.style.visibility = "visible";
            e.relatedTarget.style.zIndex = "9";
            var sidePane:any = document.getElementsByClassName("rightPane")[0];
            sidePane.style.visibility = "hidden";
        },
        ondrop:e =>{
            self.droppedResource = e.target.parentElement.classList[0];
            self.droppedTime = e.target.children[0].innerText;
            var segmentDate = new Date(moment(self.viewDate).format("MM/DD/YYYY") + " " + moment(self.droppedTime,"h:mm A").format("h:mm A"));
            self.droppedTime = segmentDate;
            e.relatedTarget.style.visibility = "initial";
            e.relatedTarget.style.zIndex = "7";
            e.relatedTarget.innerHTML = helperText;
            var sidePane:any = document.getElementsByClassName("rightPane")[0];
            sidePane.style.visibility = "visible";
        }
      });
    }
  }

  htmlScrollleft;
  htmlScrollTop;
  scrollHeader = () =>{
    let htmlElement = document.getElementsByTagName("html")[0];
    let headerElement:any = document.getElementsByClassName("fixedHeader")[0];
    let timingElement:any = document.getElementsByClassName("fixedTiming")[0];
    if(this.htmlScrollleft != htmlElement.scrollLeft)
    {
        timingElement.style.zIndex = 10;
    }else{
        timingElement.style.zIndex = 8;        
    }
    this.htmlScrollleft = htmlElement.scrollLeft;
    this.htmlScrollTop = htmlElement.scrollTop;
    if(this.htmlScrollleft <= htmlElement.scrollLeft){
        headerElement.style.transform = "translateX(-"+htmlElement.scrollLeft+"px)";
    }else{
        headerElement.style.transform = "translateX(+"+htmlElement.scrollLeft+"px)";
    }
    if(this.htmlScrollTop <= htmlElement.scrollTop){        
        timingElement.style.transform = "translateY(-"+htmlElement.scrollTop+"px)";
    }else{
        timingElement.style.transform = "translateY(+"+htmlElement.scrollTop+"px)";
    }

  }
    // Triggers when event timings changed in calendar
    refresh: Subject<any> = new Subject();
    eventTimesChanged({
      event,
      newStart,
      newEnd,
      draggedObj,
      resourceId
    }: CalendarEventTimesChangedEvent): void { 
        var self = this; 
        if(self.dragFlag){
            self.ngxService.start();
            setTimeout(()=>{
            self.dragFlag = false;
            var oldObject = {};
            if(newEnd.toString() == "Invalid Date"){
                if(draggedObj.student || draggedObj.saStudent || draggedObj.sofStudent){
                    let studentList = "saStudent"
                    if(draggedObj.student){
                        studentList = "student";
                    }else if(draggedObj.sofStudent){
                        studentList = "sofStudent";
                    }
                    var duration = (draggedObj[studentList].end.getTime() - draggedObj[studentList].start.getTime()) / (1000 * 60);
                    var startTimeCopy = new Date(newStart.getTime());
                    newEnd = new Date(startTimeCopy.setMinutes(startTimeCopy.getMinutes() + duration));
                }
            }
          if(self.droppedTime && self.droppedTime.getTime() != newStart.getTime()){
            var duration = (newEnd.getTime() - newStart.getTime()) / (1000 * 60);
            newStart = new Date(self.droppedTime.getTime());
            var startTimeCopy = new Date(newStart.getTime());
            newEnd = new Date(startTimeCopy.setMinutes(startTimeCopy.getMinutes() + duration));
          }
        //   if(resourceId != this.droppedResource){
        //       resourceId = this.droppedResource;
        //   }
          let refreshValidate = true;
            oldObject = Object.assign(draggedObj);
            if(draggedObj.teacherAvailable){
              refreshValidate = self.createTeacherSession(draggedObj,newStart,newEnd,resourceId);  
            }else if(draggedObj.saStudent || draggedObj.sofStudent){
                refreshValidate = self.createStudentFromPane(draggedObj,newStart,newEnd,resourceId);
            }else if(draggedObj.student){
                if(draggedObj.student.start.getTime() != newStart.getTime() || draggedObj.student.resourceId != resourceId){
                  refreshValidate = self.createStudentSession(draggedObj,newStart,newEnd,resourceId);
                }
            }else if(draggedObj.teacher){
              if(draggedObj.teacher.start.getTime() != newStart.getTime()|| draggedObj.teacher.resourceId != resourceId){
                refreshValidate = self.createTeacherEvent(draggedObj,newStart,newEnd,resourceId);
              }
            }
            if(!refreshValidate){
              draggedObj = oldObject;
            }
            self.refresh.next();   
            self.ngxService.stop();        
            self.focusOncalendar();   
        },80);        
        }
        self.focusOncalendar();    
        self.refresh.next();        
    }

    scrollTimings = (event,draggableTitle)=>{
        draggableTitle.style.top = this.clientY+"px";
        draggableTitle.style.position = "fixed";
        draggableTitle.style.left = this.clientX+"px";
    }

    coordinates(event: MouseEvent): void {
        this.clientX = event.clientX;
        this.clientY = event.clientY;
    }

    openEnrollment(id){
        this.data.openEnrollment(id);
    }

    createEventOnDrop = (eventObj,draggedObj,newStart,newEnd,resourceId) =>{
        let resource:any = this.getResourcebyId(resourceId);
        let oldResource = this.getResourcebyId(eventObj.resourceId)[0];        
        let eventAdded = false;
        if(resource.length){
            for(let event of resource[0].events){
                if(event.start.toString() == newStart.toString() && event.end.toString() == newEnd.toString()){
                    if(draggedObj.student){
                        if(!event.students){
                            event.students = [];
                        }
                        event.students.push(draggedObj.student);
                        event.conflictMsg="";
                        if(!event.is1to1){
                            event.is1to1 = draggedObj.student.is1to1;
                        }
                        if(event.is1to1 && event.students.length > 1){
                            event.conflicts = true;
                            event.conflictMsg = globals.ONETOONE_CONFLICT;
                        }
                        if(resource[0].capacity <= event.students.length){
                            if(resource[0].capacity < event.students.length)
                            {
                                event.conflicts = true;
                                event.conflictMsg += " "+globals.MAX_CAPACITY;
                            }
                            event.maxCapacity = true;
                        }
                        if(!this.isEmpty(eventObj)){
                            //this condition prevents removing the added float or makeup student from the event
                            if((draggedObj.event.start.toString() != event.start.toString() && draggedObj.event.end.toString() != event.end.toString()) || 
                                draggedObj.event.resourceId != event.resourceId){ 
                                eventObj.students.splice(eventObj.students.indexOf(draggedObj.student),1);
                                eventObj.maxCapacity = false;
                                eventObj.is1to1 = false;
                                eventObj.conflicts = false;
                                let oneToOneFlag = false;
                                eventObj.students.forEach(student => {
                                    if(student.is1to1){
                                        oneToOneFlag = true;
                                    }
                                });
                                eventObj.is1to1 = oneToOneFlag;
                                if(eventObj.is1to1 && eventObj.students.length > 1){
                                    eventObj.conflicts = true;
                                    eventObj.conflictMsg = globals.ONETOONE_CONFLICT;
                                }
                                if(eventObj.students.length > oldResource.capacity){
                                    eventObj.maxCapacity = true;
                                    eventObj.conflicts = true;
                                    eventObj.conflictMsg += " "+globals.MAX_CAPACITY; 
                                }
                            }
                        }
                    }else if(draggedObj.teacher){
                        if(!event.teacher || this.isEmpty(event.teacher)){
                            event.teacher = {};
                            event.teacher = draggedObj.teacher;
                            event.teacher.deliveryTypeCode = resource[0].deliveryTypeCode;
                            event.teacher.resourceId = resourceId;
                            if(!this.isEmpty(eventObj)){
                                delete eventObj.teacher;
                            }
                        }else{
                            this.dialogBodyText = globals.STAFF_ALREADY_EXIST;
                            this.prompt.show();
                        }
                    }
                    eventAdded = true;
                }
            }
        }
        if(!eventAdded){
            var newEvent:any = {};
            newEvent.start = newStart;
            newEvent.end = newEnd;
            newEvent.resourceId = resourceId;
            newEvent.students = [];
            newEvent.duration;
            newEvent.color = this.config.colorObj[resource[0].deliveryType];
            if(draggedObj.student){
                newEvent.duration = draggedObj.student.duration
                newEvent.is1to1 = draggedObj.student.is1to1;
                newEvent.students.push(draggedObj.student);
                if(!this.isEmpty(eventObj)){
                    eventObj.students.splice(eventObj.students.indexOf(draggedObj.student),1);
                }
                eventObj.maxCapacity = false;
                eventObj.is1to1 = false;
                eventObj.conflicts = false;
                eventObj.conflictMsg = "";
                let oneToOneFlag = false;
                eventObj.students.forEach(student => {
                    if(student.is1to1){
                        oneToOneFlag = true;
                    }
                });
                eventObj.is1to1 = oneToOneFlag;
                if(eventObj.is1to1 && eventObj.students.length > 1){
                    eventObj.conflicts = true;
                    eventObj.conflictMsg = globals.ONETOONE_CONFLICT;
                }
                if(eventObj.students.length > oldResource.capacity){
                    eventObj.maxCapacity = true;
                    eventObj.conflicts = true;
                    eventObj.conflictMsg += " "+globals.MAX_CAPACITY; 
                }
            }else if(draggedObj.teacher){
                newEvent.teacher = {};
                newEvent.teacher = draggedObj.teacher;
                newEvent.duration = draggedObj.teacher.duration
                newEvent.teacher.resourceId = resourceId;
                newEvent.teacher.deliveryTypeCode = resource[0].deliveryTypeCode;
                delete eventObj.teacher;
            }
            if(!resource[0].events){
                resource[0].events = [];
            }
            resource[0].events.push(newEvent);
        }
        if(!this.isEmpty(eventObj)){
        if(((eventObj.students && !eventObj.students.length) || (!eventObj.students)) && (!eventObj.teacher || ( eventObj.teacher && !eventObj.teacher.name))){
            for (let oldEvent of oldResource.events){
                if(oldEvent.start.toString() == eventObj.start.toString() && oldEvent.end.toString() == eventObj.end.toString()){
                    oldResource.events.splice(oldResource.events.indexOf(oldEvent),1);
                }
            }
        }
     }
     return true;
    }

    createEventOnTeacherDrop = (eventObj,newStart,newEnd,resourceId) => {
        var droppedResource:any = this.getResourcebyId(resourceId);
        let teacherAdded = false;
        for(let event of droppedResource[0].events){
            if(event.start.toString() == newStart.toString() && event.end.toString() == newEnd.toString()){
                if(!event.teacher || this.isEmpty(event.teacher)){
                    event.teacher = {};
                    event.teacher = Object.assign({},eventObj.teacherAvailable);
                    event.teacher.resourceId = resourceId;
                    event.teacher.deliveryTypeCode = droppedResource[0].deliveryTypeCode;
                    teacherAdded = true;
                }else{
                    this.dialogBodyText = globals.STAFF_ALREADY_EXIST;
                    this.prompt.show();
                    return false;
                }
            }
        }
        if(!teacherAdded){
            let teacherEvent:any = {};
            teacherEvent.start = newStart;
            teacherEvent.end = newEnd;
            teacherEvent.duration = eventObj.teacherAvailable.duration;
            teacherEvent.teacher = Object.assign({},eventObj.teacherAvailable);
            teacherEvent.teacher.resourceId = droppedResource[0].id;
            teacherEvent.teacher.deliveryTypeCode = droppedResource[0].deliveryTypeCode;
            teacherEvent.color = this.config.colorObj[droppedResource[0].deliveryType];
            if(!droppedResource[0].events){
                droppedResource[0].events = [];
            }
            droppedResource[0].events.push(teacherEvent);
            teacherAdded = true;            
        }
        return teacherAdded;
    }

    staffDuplicateValidation = (staff,newStart,newEnd,resourceId)=>{
        let self = this;
        let allowTeacher = false;
        for(let resource of this.resources){
            for(let event of resource.events){
                if(((staff.resourceId && staff.resourceId != resource.id )|| !staff.resourceId) &&  
                    event.start.getTime() != new Date(staff.startDate+" "+staff.start).getTime() && 
                    ((
                        newStart.getTime() <= event.start.getTime() &&
                        newEnd.getTime() >= event.end.getTime()
                    ) ||
                    (
                        event.start.getTime() <= newStart.getTime() &&
                        event.end.getTime() >= newEnd.getTime()
                    ) ||
                    (
                        newEnd.getTime() > event.start.getTime() &&
                        event.end.getTime() > newStart.getTime()
                    ))){
                        if(event.teacher && event.teacher.id == staff.id){
                            allowTeacher = true;
                        }
                }
            }
        }
        return !allowTeacher;
    }

    removeStaff = (event,resourceId)=>{
        let self = this;
        self.ngxService.start();
        setTimeout(()=>{
            let resourceObj:any = self.resources.filter (resource => {
                return resource.id == resourceId;
            });
            event.teacher.scheduleType = 3;
            let removeTeacherObj = self.xrmConverter.convertTeacherEventObj([event.teacher]);
            let responseObj = self.data.removeTeacher(removeTeacherObj[0]);
            if(typeof (responseObj) == 'object' && responseObj['@odata.etag']){
                delete event.event.teacher;
                if(!event.event.students || (event.event.students && !event.event.students.length)){
                    let eventIndex = resourceObj[0].events.indexOf(event.event);
                    resourceObj[0].events.splice(eventIndex,1);
                    self.refresh.next();
                }   
            } else if (typeof responseObj == 'object' && responseObj.code) {
                self.dialogBodyText = responseObj.message;
                self.refreshConfirmation.show();
            }
            self.ngxService.stop();
            self.focusOncalendar();
        },50);
    }

    moveToSof = (eventObj) =>{
        let self = this;
        self.ngxService.start();
        setTimeout(()=>{
        let resourceId = eventObj.event.resourceId;
        let resourceObj:any = self.getResourcebyId(resourceId);
        let eventIndex = resourceObj[0].events.indexOf(eventObj.event);
        let studentIndex = resourceObj[0].events[eventIndex].students.indexOf(eventObj.student);
        var studentObj = Object.assign({},eventObj.student)
        studentObj.start = resourceObj[0].events[eventIndex].start;
        studentObj.end = resourceObj[0].events[eventIndex].end;
        let convertedStudent = self.xrmConverter.convertToSof([studentObj]);
        let responseObj:any = self.data.moveStudentToSOF(convertedStudent[0]);
        if (typeof (responseObj) == 'object' && responseObj['@odata.etag']) {
            if (responseObj.hasOwnProperty('hub_studentsessionid')) {
                studentObj['sessionId'] = responseObj['hub_studentsessionid'];
                studentObj['resourceId'] = responseObj['hub_resourceid@odata.bind'];
                studentObj['sessiontype'] = responseObj['hub_sessiontype'];
                studentObj['sessionStatus'] = responseObj['hub_session_status'];
                delete studentObj['isFromMasterSchedule'];
            }
            studentObj.etagId = responseObj['@odata.etag'];
            if (responseObj['hub_student_session@odata.bind']) {
                studentObj['studentSession'] = responseObj['hub_student_session@odata.bind'];
            }
            if (responseObj['hub_master_schedule@odata.bind']) {
                studentObj['masterScheduleId'] = responseObj['hub_student_session@odata.bind'];
            }
            if (responseObj['hub_sourceapplicationid']) {
                studentObj['sourceAppId'] = responseObj['hub_sourceapplicationid'];
            }
            studentObj['isAttended'] = responseObj['hub_isattended'];
            self.availableStudentList.push(studentObj);
            self.sofCount += 1;
            resourceObj[0].events[eventIndex].students.splice(studentIndex,1);
            if(!resourceObj[0].events[eventIndex].students.length && (!resourceObj[0].events[eventIndex].teacher || self.isEmpty(resourceObj[0].events[eventIndex].teacher))){
                resourceObj[0].events.splice(eventIndex,1);
            }
            self.refresh.next();
        } else if (typeof responseObj == 'object' && responseObj.code) {
            self.dialogBodyText = responseObj.message;
            self.refreshConfirmation.show();
        }
        self.ngxService.stop();
        self.focusOncalendar();
        },50);  
    }

    getStudentAvaialbility = () => {
        let locationId = this.config.getLocation().hub_centerid;
        this.saList = [];
        let rawSAList =  this.data.getsaList(locationId, this.eventForDayview.selectedStartDate, this.eventForDayview.selectedEndDate);
        this.convertSAList(rawSAList);
    }

    convertSAList = rawSAList => {
        var self = this;
        if(!rawSAList){
            rawSAList = [];
        }
        rawSAList.forEach(val => {
            var sDate = new Date(val['hub_session_date@OData.Community.Display.V1.FormattedValue'] + " " + val['hub_start_time@OData.Community.Display.V1.FormattedValue']);
            var eDate = new Date(val['hub_session_date@OData.Community.Display.V1.FormattedValue'] + " " + val['hub_end_time@OData.Community.Display.V1.FormattedValue']);
            var startHour = new Date(val['hub_session_date@OData.Community.Display.V1.FormattedValue'] + " " + val['hub_start_time@OData.Community.Display.V1.FormattedValue']);
            if (!val['aprogram_x002e_hub_color']) {
                val['aprogram_x002e_hub_color'] = "#000";
            }
            var obj:any = {
                id: val._hub_student_value,
                name: val["_hub_student_value@OData.Community.Display.V1.FormattedValue"],
                start: sDate,
                end: eDate,
                sessionDate: val['hub_session_date'],
                startHour: startHour,
                gradeId: val['astudent_x002e_hub_grade'],
                grade: val['astudent_x002e_hub_grade@OData.Community.Display.V1.FormattedValue'],
                deliveryTypeId: val['aproductservice_x002e_hub_deliverytype'],
                deliveryType: val['aproductservice_x002e_hub_deliverytype@OData.Community.Display.V1.FormattedValue'],
                deliveryTypeCode: val['adeliverytype_x002e_hub_code'],
                deliveryTypeCodeVal: val['adeliverytype_x002e_hub_code@OData.Community.Display.V1.FormattedValue'],
                subject: val['aprogram_x002e_hub_areaofinterest@OData.Community.Display.V1.FormattedValue'],
                subjectId: val['aprogram_x002e_hub_areaofinterest'],
                subjectGradient: val['aprogram_x002e_hub_color'],
                programId: val['aprogram_x002e_hub_programid'],
                serviceId: val['_hub_service_value'],
                serviceValue: val['_hub_service_value@OData.Community.Display.V1.FormattedValue'],
                sessionId: val['hub_studentsessionid'],
                sessiontype: val['hub_sessiontype'],
                sessionStatus: val['hub_session_status'],
                sessionStatusText : val["hub_session_status@OData.Community.Display.V1.FormattedValue"],
                duration: val['aproductservice_x002e_hub_duration'],
                timeSlotType: val['aproductservice_x002e_hub_timeslottype'],
                namedHoursId: val['aproductservice_x002e_hub_namedgfhoursid'],
                isAttended: val['hub_isattended'],
                makeupExpiryDate: val['hub_makeup_expiry_date@OData.Community.Display.V1.FormattedValue'],
            }
            if (val['@odata.etag']) {
                obj.etagId = val['@odata.etag'];
            }
            if(obj.subjectGradient.indexOf("-webkit-") != -1){
                obj.subjectGradient = obj.subjectGradient.replace("-webkit-","");
            }
            if (obj.subjectGradient && obj.subjectGradient.split(",")[1]) {
                obj.subjectColorCode = obj.subjectGradient.split(",")[1].replace(");", '');
            } else {
                obj.subjectColorCode = val['aprogram_x002e_hub_color'];
            }

            obj.iconStyle = {
                'background-color': obj.subjectColorCode,
                'background':obj.subjectGradient
              };
            if (val['hub_name'] != undefined) {
                obj['fullName'] = val['hub_name'];
            } else {
                obj['fullName'] = val["_hub_enrollment_value@OData.Community.Display.V1.FormattedValue"];
            }

            if (val["hub_is_1to1"] == undefined) {
                obj['is1to1'] = false;
            } else {
                obj['is1to1'] = val["hub_is_1to1"];
            }

            if (val['_hub_enrollment_value'] != undefined) {
                obj['enrollmentId'] = val['_hub_enrollment_value'];
            } else if (val['hub_enrollmentid'] != undefined) {
                obj['enrollmentId'] = val['hub_enrollmentid'];
            }

            if (val['_hub_center_value'] != undefined) {
                obj['locationId'] = val['_hub_center_value'];
                obj['locationName'] = val['_hub_center_value@OData.Community.Display.V1.FormattedValue'];
            } else if (val['_hub_location_value'] != undefined) {
                obj['locationId'] = val['_hub_location_value'];
                obj['locationName'] = val['_hub_location_value@OData.Community.Display.V1.FormattedValue'];
            }

            if (val['_hub_student_session_value']) {
                obj['studentSession'] = val['_hub_student_session_value'];
            }
            if (val['_hub_master_schedule_value']) {
                obj.masterScheduleId = val['_hub_master_schedule_value'];
            }
            if (val['hub_sourceapplicationid']) {
                obj.sourceAppId = val['hub_sourceapplicationid'];
            }
            self.saList.push(obj);
        });
    }

    createEventFromSA = (eventObj,newStart,newEnd,resourceId)=>{
        var droppedResource:any = this.getResourcebyId(resourceId);
        let studentAdded = false;
            for(let event of droppedResource[0].events){
                if(event.start.toString() == newStart.toString() && event.end.toString() == newEnd.toString()){
                    if(!event.students){
                        event.students = [];
                    }
                    event.students.push(eventObj.student);
                    event.conflictMsg="";
                    if(eventObj.student["is1to1"] && event.students.length){
                        event["conflicts"] = true;
                        event.conflictMsg = globals.ONETOONE_CONFLICT;
                        if(!event["is1to1"]){
                            event["is1to1"] = eventObj.student["is1to1"];
                            event.conflictMsg = globals.ONETOONE_CONFLICT;
                        }
                    }else if(event["is1to1"]){
                        event["conflicts"] = true;
                        event.conflictMsg = globals.ONETOONE_CONFLICT;
                    }
                    if(droppedResource.capacity <= event.students.length){
                        if(droppedResource.capacity < event.students.length){
                            event.conflicts = true;
                            event.conflictMsg += " "+globals.MAX_CAPACITY;
                        }
                        event.maxCapacity = true;
                    }
                    studentAdded = true;                    
                }
            }
        if(!studentAdded){
            let studentEvent:any = {};
            studentEvent.start = newStart;
            studentEvent.end = newEnd;
            studentEvent.students = [];
            studentEvent.duration = eventObj.student.duration;
            studentEvent.color = this.config.colorObj[droppedResource[0].deliveryType];
            studentEvent.students.push(eventObj.student);
            studentEvent["is1to1"] = eventObj.student["is1to1"];
            studentEvent["conflicts"] = false;
            if(!droppedResource[0].events){
                droppedResource[0].events = [];
            }
            droppedResource[0].events.push(studentEvent);
            studentAdded = true;            
        }
        return studentAdded;
    }

    getResourcebyId = resourceId =>{
        let resourceObj = this.resources.filter (resource => {
            return resource.id == resourceId;
        });
        return resourceObj;
    }

    checkAccountClosure = function () {
        var self = this;
        var closed = false;
        if (self.accountClosure != null && self.accountClosure.length) {
            if (self.accountClosure[0]['hub_status'] == 2) {
                closed = true;
            }
        }
        return closed;
    }

    isEmpty = (obj)=>{
        for(var prop in obj) {
            if(obj.hasOwnProperty(prop))
                return false;
        }
    
        return JSON.stringify(obj) === JSON.stringify({});
    }

    createStudentSession = (eventObj,newStart,newEnd,resourceId) => {
        let self = this;
        let sessionCreated = false;
        let droppedResource:any = self.getResourcebyId(resourceId);
        if(droppedResource[0].deliveryTypeCode != self.GI_CODE){
            let sameRowValidation = self.validateStudentOnSameRow(eventObj,newStart,newEnd,resourceId);
            let instructionalHourValidation;
            if (eventObj.student.sessiontype != self.config.FLOAT_TYPE && eventObj.student.sessiontype != self.config.MAKEUP_TYPE) {
                instructionalHourValidation = self.checkInstructionalHours(eventObj.student, newStart,"STUDENT");
            }else{
                instructionalHourValidation = true
            }
            if(sameRowValidation && instructionalHourValidation){
                let droppedEvent = droppedResource[0].events.filter(droppingEvent =>{
                    if(droppingEvent.start.toString() == newStart.toString()){
                       return droppingEvent; 
                    }
                });
                if((droppedEvent.length && droppedEvent[0].duration == eventObj.event.duration) || !droppedEvent.length){
                    let instructionalCheck = true;
                    if (eventObj.sessiontype == self.config.FLOAT_TYPE && eventObj.sessiontype == self.config.MAKEUP_TYPE) {
                        instructionalCheck = self.checkInstructionalHours(eventObj, newStart,"STUDENT");
                    }
                    if(droppedEvent.length){
                        let validationObj = self.checkEventValidation(droppedResource,droppedEvent,eventObj);
                        if(!validationObj.alert.length){
                            if(validationObj.confirmation.length){
                                self.dialogBodyText = "";
                                validationObj.confirmation.forEach(msg =>{
                                    self.dialogBodyText += " "+msg;
                                })
                                self.dialogBodyText += globals.CONF_MSG;
                                self.studentConfirmation.show();
                                self.xrmConverter.setTempCache("eventObj",eventObj)
                                self.xrmConverter.setTempCache("newStart",newStart)
                                self.xrmConverter.setTempCache("newEnd",newEnd)
                                self.xrmConverter.setTempCache("resourceId",resourceId)
                            }else{
                                sessionCreated = self.saveStudentSession(eventObj,newStart,newEnd,resourceId);
                            }  
                        }else{
                            self.dialogBodyText = validationObj.alert[0];
                            self.prompt.show()
                        }
                    }else if(droppedResource[0].deliveryTypeCode == eventObj.student.deliveryTypeCode){
                        sessionCreated = self.saveStudentSession(eventObj,newStart,newEnd,resourceId);
                    }else{
                        var msg = globals.DIFF_DELIVERY;
                        if (!instructionalCheck) {
                            msg = globals.DIFF_DELIVERY_AND_INS_HOUR
                        }
                        self.dialogBodyText  = msg;
                        self.studentConfirmation.show();
                        self.xrmConverter.setTempCache("eventObj",eventObj)
                        self.xrmConverter.setTempCache("newStart",newStart)
                        self.xrmConverter.setTempCache("newEnd",newEnd)
                        self.xrmConverter.setTempCache("resourceId",resourceId)
                    }
                }else{
                    self.dialogBodyText = globals.DURATION_MISMATCH;
                    self.prompt.show();
                }
            }else {
                let msg = globals.DUPLICATE_STUDENT;
                if (!instructionalHourValidation) {
                    msg = globals.NO_INS_HOUR;
                }
                self.dialogBodyText = msg;
                self.prompt.show();
            }
        }else{
            self.dialogBodyText = globals.GI_SESSION;
            self.prompt.show();
        }
        return sessionCreated;
    }

    saveStudentSession = (eventObj,newStart,newEnd,resourceId) =>{
        let self = this;
        let updatedEventObj = Object.assign({},eventObj.student);
        updatedEventObj.start = newStart;
        updatedEventObj.end = newEnd;
        let responseForCalendar = false;
        updatedEventObj.resourceId = resourceId;
        if(!eventObj.student.sessiontype){
            updatedEventObj.sessionType = self.config.REGULAR_TYPE;
        }
        let rawStudentList = self.xrmConverter.convertStudentForSession([eventObj.student,updatedEventObj]);
        this.ngxService.start();
        let responseObj:any =  self.data.saveStudenttoSession(rawStudentList[0], rawStudentList[1]);
        if (typeof responseObj == 'object' && responseObj['@odata.etag']) {
            responseForCalendar = true;
            if (responseObj['hub_student_session@odata.bind']) {
                updatedEventObj.studentSession = responseObj['hub_student_session@odata.bind'];
            }                
            updatedEventObj.etagId = responseObj['@odata.etag']
            if (responseObj['hub_master_schedule@odata.bind']) {
                updatedEventObj.masterScheduleId = responseObj['hub_master_schedule@odata.bind'];
            }
            if (responseObj['hub_sourceapplicationid']) {
                updatedEventObj.sourceAppId = responseObj['hub_sourceapplicationid'];
            }
            if (responseObj.hasOwnProperty('hub_studentsessionid')) {
                // self.updatePrevStudentEvent(prevEvent, stuId, prevEventId, elm);
                delete updatedEventObj.pinId;
                delete updatedEventObj.isFromMasterSchedule;
                updatedEventObj['sessionId'] = responseObj['hub_studentsessionid'];
                updatedEventObj['sessiontype'] = responseObj['hub_sessiontype'];
                updatedEventObj['isAttended'] = responseObj['hub_isattended'];
                updatedEventObj['sessionStatus'] = responseObj['hub_session_status'];
            }
            let studentIndex = eventObj.event.students.indexOf(eventObj.student);
            eventObj.event.students[studentIndex] = updatedEventObj;
            eventObj.student = updatedEventObj;
            self.createEventOnDrop(eventObj.event,eventObj,newStart,newEnd,resourceId)
        }else if(typeof responseObj == 'string'){
            self.dialogBodyText = responseObj;
            self.prompt.show();
        } else if (typeof responseObj == 'object' && responseObj.code) {
            self.dialogBodyText = responseObj.message;
            self.refreshConfirmation.show();
        }
       return responseForCalendar;
    }

    validateStudentOnSameRow = (eventObj,newStart,newEnd,resourceId) =>{
        let self = this;
        let allowToDropStudent = true;
        let prevReource = eventObj.event.resourceId;
        let droppableEvents:any = [];
        let enrollmentId = eventObj.student.enrollmentId;
        self.resources.forEach(resource => {
            if(prevReource != resource.id && resource.events){
                    resource.events.forEach(event => {
                    if ((
                        newStart.getTime() <= event.start.getTime() &&
                        newEnd.getTime() >= event.end.getTime()
                    ) ||
                    (
                        event.start.getTime() <= newStart.getTime() &&
                        event.end.getTime() >= newEnd.getTime()
                    ) ||
                    (
                        newEnd.getTime() > event.start.getTime() &&
                        event.end.getTime() > newStart.getTime()
                    )){
                        droppableEvents.push(event);
                    }
                });
            }
        });
        if(droppableEvents.length){
            droppableEvents.forEach((droppableEvent,index)=>{
                var val = droppableEvent;
                if (val.hasOwnProperty("students") && val['students'].length) {
                    for (var i = 0; i < val['students'].length; i++) {
                        if(eventObj.student['deliveryTypeCode'] == self.PI_CODE){
                            if (val['students'][i]['deliveryTypeCode'] == self.PI_CODE && 
                                eventObj.student.id == val['students'][i]['id']) {
                                allowToDropStudent = false;
                                break;
                            }
                        }else{
                            if (enrollmentId == val['students'][i]['enrollmentId']) {
                                allowToDropStudent = false;
                                break;
                            }
                        }
                    }
                    if (!allowToDropStudent) {
                        allowToDropStudent = false;
                    }
                }
            });
        }else if(droppableEvents.length == 0){
            droppableEvents = self.availableStudentList.filter(function (el) {
                return el.enrollmentId == enrollmentId &&
                        (
                                (
                                    newStart.getTime() <= el.start.getTime() &&
                                    newEnd.getTime() >= el.end.getTime()
                                ) ||
                                (
                                    el.start.getTime() <= newStart.getTime() &&
                                    el.end.getTime() >= newEnd.getTime()
                                ) ||
                                (
                                    newEnd.getTime() > el.start.getTime() &&
                                    el.end.getTime() > newStart.getTime()
                                )
                        )
            });
            if(droppableEvents.length == 0){
                allowToDropStudent = true;
            }
        }
        return allowToDropStudent;
    }

    checkInstructionalHours = (student, startHour, type) => {
        let self = this;
        var currentCalendarDate = new Date(self.config.getSelectedDate());
        currentCalendarDate = new Date(currentCalendarDate.setHours(0));
        currentCalendarDate = new Date(currentCalendarDate.setMinutes(0));
        currentCalendarDate = new Date(currentCalendarDate.setSeconds(0));
        currentCalendarDate = new Date(moment(currentCalendarDate).format("MM-DD-YYYY"));
        var formattedStartTime = moment(startHour).format("h:mm A");
        startHour = self.config.convertToMinutes(moment(startHour).format("h:mm A"));
        var endHour = startHour + student.duration;
        var result = false;
        if (student.deliveryTypeCode == self.GI_CODE) {
            return true;
        }
        if (self.instructionalHours) {
            var workHours = self.instructionalHours.filter(workHour => {
                if (student['namedGfid'] && type != "teacher") {
                    return workHour ? workHour._hub_workhours_value == student.namedGfid : [];
                } else {
                    if (workHour['adeliverytype_x002e_hub_code'] == student.deliveryTypeCode) {
                        if(type != "teacher"  && student.timeSlotType == workHour.hub_timeslottype){
                            return workHour;
                        }else if(type == "teacher"){
                            return workHour;
                        }
                    }
                }
            });
            if (workHours) {
                workHours = workHours.sort(function (a, b) { return a.hub_timeslottype - b.hub_timeslottype })
                var availableTimings = [];
                workHours.forEach((val, key) => {
                    if (val['hub_effectiveenddate']) {
                        if (currentCalendarDate.getTime() >= new Date(moment(val['hub_effectivestartdate']).format("MM-DD-YYYY")).getTime() &&
                            currentCalendarDate.getTime() <= new Date(moment(val['hub_effectiveenddate']).format("MM-DD-YYYY")).getTime()) {
                            if (startHour >= val['hub_starttime'] && startHour <= val['hub_endtime'] && endHour <= val['hub_endtime'] && endHour >= val['hub_starttime']) {
                                var startTime = val.hub_starttime;
                                availableTimings.push(startTime);
                                while ((startTime + student.duration) < val.hub_endtime) {
                                    startTime += student.duration;
                                    availableTimings.push(startTime);
                                }
                            }
                        }
                    } else {
                        if (currentCalendarDate.getTime() >= new Date(moment(val['hub_effectivestartdate']).format("MM-DD-YYYY")).getTime() &&
                            startHour >= val['hub_starttime'] && startHour <= val['hub_endtime'] && endHour <= val['hub_endtime'] && endHour >= val['hub_starttime']) {
                            var startTime = val.hub_starttime;
                            availableTimings.push(startTime);
                            while ((startTime + student.duration) < val.hub_endtime) {
                                startTime += student.duration;
                                availableTimings.push(startTime);
                            }
                        }
                    }
                });
                if (availableTimings.indexOf(startHour) != -1) {
                    result = true;
                }
            }
        }
        return result;
    }

    reloadCalendar = () =>{
        let self = this;
        self.ngxService.start();
        setTimeout(function(){
            self.refreshConfirmation.hide();
            let reloadButton = document.getElementById("reload");
            reloadButton.click();
        },50);
    }

    checkEventValidation = (droppedResource,droppedEvent,eventObj)=>{
        let self = this;
        let messageObject = {
            alert: [],
            confirmation: [],
        };
        if(droppedResource[0].deliveryTypeCode != eventObj.student.deliveryTypeCode){
            messageObject.confirmation.push(globals.DIFF_DELIVERY);
        }

        if((!self.isEmpty(eventObj.event) && droppedEvent[0].duration != eventObj.event.duration) || (droppedEvent[0].duration != eventObj.student.duration)) {
            messageObject.alert.push(globals.DURATION_MISMATCH);
        }

        if(droppedEvent[0].students && droppedEvent[0].students.length >= droppedResource[0].capacity){
            messageObject.confirmation.push(globals.MAX_CAPACITY);
        }

        if(eventObj.student.deliveryTypeCode == self.PI_CODE && droppedEvent[0].is1to1){
            messageObject.confirmation.push(globals.ONETOONE_CONF);
        }
        return messageObject;
    }

    studentValidConfirmation = ()=>{
        let self = this;
        let eventObj = self.xrmConverter.getTempCache("eventObj");
        let newStart = self.xrmConverter.getTempCache("newStart");
        let newEnd = self.xrmConverter.getTempCache("newEnd");
        let resourceId = self.xrmConverter.getTempCache("resourceId");
        self.studentConfirmation.hide();
        let sessionCreated = self.saveStudentSession(eventObj,newStart,newEnd,resourceId);
        if(sessionCreated){
            self.refresh.next();
        }
        self.ngxService.stop();
        self.focusOncalendar();
    }

    modalClose = () =>{
        this.xrmConverter.clearCache();
    }

    createStudentFromPane = (eventObj,newStart,newEnd,resourceId)=>{
        let self = this;
        let sessionCreated = false;
        let droppedResource:any = self.getResourcebyId(resourceId);
        let studentList = "saStudent"
        if(!eventObj[studentList]){
            studentList = "sofStudent";
        }
        let draggedStudent = eventObj[studentList];
        let giValidation = false;
        var displayStart = Object.assign(draggedStudent.start);
        var displayEnd = Object.assign(draggedStudent.end)
        if(draggedStudent.deliveryTypeCode == self.GI_CODE){
            if(draggedStudent.start.getTime() == newStart.getTime() && draggedStudent.end.getTime() == newEnd.getTime()){
                giValidation = true;
            }else{
                self.dialogBodyText = globals.GI_TIME_VALIDATION_1 + moment(displayStart).format("DD-MM-YYYY hh:mm A")+ globals.GI_TIME_VALIDATION_2 + moment(displayEnd).format("DD-MM-YYYY hh:mm A")+"</div>";
                self.prompt.show()
            }
        }else{
            giValidation = true;
        }
        if(giValidation){
            let ObjforValidation = Object.assign({},eventObj);
            ObjforValidation.student = Object.assign({},eventObj[studentList]);
            let sameRowValidation = self.validateStudentOnSameRow(ObjforValidation,newStart,newEnd,resourceId);
            let instructionalHourValidation;
            if (draggedStudent.sessiontype != self.config.FLOAT_TYPE && draggedStudent.sessiontype != self.config.MAKEUP_TYPE) {
                instructionalHourValidation = self.checkInstructionalHours(draggedStudent, newStart,"STUDENT");
            }else{
                instructionalHourValidation = true
            }
            if(sameRowValidation && instructionalHourValidation){
                let droppedEvent = droppedResource[0].events.filter(droppingEvent =>{
                    if(droppingEvent.start.toString() == newStart.toString()){
                       return droppingEvent; 
                    }
                });
                if((droppedEvent.length && droppedEvent[0].duration == eventObj[studentList].duration) || !droppedEvent.length){
                    let instructionalCheck = true;
                    if (eventObj[studentList].sessiontype == self.config.FLOAT_TYPE && eventObj[studentList].sessiontype == self.config.MAKEUP_TYPE) {
                        instructionalCheck = self.checkInstructionalHours(ObjforValidation.student, newStart,"STUDENT");
                    }
                    if(droppedEvent.length){
                        let validationObj = self.checkEventValidation(droppedResource,droppedEvent,ObjforValidation);
                        if(!validationObj.alert.length){
                            if(validationObj.confirmation.length){
                                self.dialogBodyText = "";
                                validationObj.confirmation.forEach(msg =>{
                                    self.dialogBodyText += " "+msg;
                                })
                                self.dialogBodyText += globals.CONF_MSG;
                                self.studentConfirmation.show();
                                self.xrmConverter.setTempCache("eventObj",eventObj)
                                self.xrmConverter.setTempCache("newStart",newStart)
                                self.xrmConverter.setTempCache("newEnd",newEnd)
                                self.xrmConverter.setTempCache("resourceId",resourceId)
                            }else{
                                sessionCreated = self.saveStudentToSession(ObjforValidation,newStart,newEnd,resourceId,studentList);
                            }  
                        }else{
                            self.dialogBodyText = validationObj.alert[0];
                            self.prompt.show()
                        }
                    }else if(droppedResource[0].deliveryTypeCode == eventObj[studentList].deliveryTypeCode){
                        sessionCreated = self.saveStudentToSession(ObjforValidation,newStart,newEnd,resourceId,studentList);
                    }else{
                        var msg = globals.DIFF_DELIVERY;
                        if (!instructionalCheck) {
                            msg = globals.DIFF_DELIVERY_AND_INS_HOUR
                        }
                        self.dialogBodyText  = msg;
                        self.studentConfirmation.show();
                    }
                }else{
                    self.dialogBodyText = globals.DURATION_MISMATCH;
                    self.prompt.show();
                }
            }else {
                let msg = globals.DUPLICATE_STUDENT;
                if (!instructionalHourValidation) {
                    msg = globals.NO_INS_HOUR;
                }
                self.dialogBodyText = msg;
                self.prompt.show();
            }
        }
        return sessionCreated;
    }

    saveStudentToSession = (eventObj,newStart,newEnd,resourceId,studentList) =>{
        let self = this;
        let updatedEventObj = Object.assign({},eventObj.student);
        updatedEventObj.start = newStart;
        updatedEventObj.end = newEnd;
        let responseForCalendar = false;
        updatedEventObj.resourceId = resourceId;
        if(!eventObj.student.sessiontype){
            updatedEventObj.sessionType = self.config.REGULAR_TYPE;
        }
        eventObj.student.resourceId = resourceId;
        let rawStudentList = self.xrmConverter.convertStudentForSession([eventObj.student,updatedEventObj]);
        let responseObj:any =  self.data.saveSOFtoSession(rawStudentList[0], rawStudentList[1]);
        if (typeof responseObj == 'object' && responseObj['@odata.etag']) {
            responseForCalendar = true;
            if(studentList == "saStudent"){
                self.saList.splice(self.saList.indexOf(eventObj[studentList]),1);
            }else{
                self.availableStudentList.splice(self.availableStudentList.indexOf(eventObj[studentList]),1);
                self.sofCount -= 1;
            }
            if (responseObj['hub_student_session@odata.bind']) {
                updatedEventObj.studentSession = responseObj['hub_student_session@odata.bind'];
            }                
            updatedEventObj.etagId = responseObj['@odata.etag']
            if (responseObj['hub_master_schedule@odata.bind']) {
                updatedEventObj.masterScheduleId = responseObj['hub_master_schedule@odata.bind'];
            }
            if (responseObj['hub_sourceapplicationid']) {
                updatedEventObj.sourceAppId = responseObj['hub_sourceapplicationid'];
            }
            if (responseObj.hasOwnProperty('hub_studentsessionid')) {
                delete updatedEventObj.pinId;
                delete updatedEventObj.isFromMasterSchedule;
                updatedEventObj['sessionId'] = responseObj['hub_studentsessionid'];
                updatedEventObj['sessiontype'] = responseObj['hub_sessiontype'];
                updatedEventObj['isAttended'] = responseObj['hub_isattended'];
                updatedEventObj['sessionStatus'] = responseObj['hub_session_status'];
            }
            if (updatedEventObj.hasOwnProperty('isFromMasterSchedule')) {
                delete updatedEventObj.isFromMasterSchedule;
                updatedEventObj['sessionStatus'] = self.config.SCHEDULE_STATUS;
            }
            if (eventObj.student.start.getTime() != updatedEventObj.start.getTime()) {
                if (updatedEventObj['pinId']) {
                    delete updatedEventObj['pinId'];
                }
            }
            eventObj.student = updatedEventObj;
            self.createEventFromSA(eventObj,newStart,newEnd,resourceId)
        }else if(typeof responseObj == 'string'){
            self.dialogBodyText = responseObj;
            self.prompt.show();
        } else if (typeof responseObj == 'object' && responseObj.code) {
            self.dialogBodyText = responseObj.message;
            self.refreshConfirmation.show();
        }
       return responseForCalendar;
    }

    createTeacherSession = (eventObj,newStart,newEnd,resourceId) =>{
        let self = this;
        let sessionCreated = false;
        let droppedResource:any = self.getResourcebyId(resourceId);
        let duration = globals.DEFAULT_DURATION;

        let teacherPrograms = self.getProgramObj(eventObj.teacherAvailable)
        let droppedEvent = droppedResource[0].events.filter(droppingEvent =>{
            if(droppingEvent.start.toString() == newStart.toString()){
                return droppingEvent; 
            }
        });
        let teacherObj:any = {}
        teacherObj.duration = duration;
        eventObj.teacherAvailable.duration = duration;
        if(droppedEvent.length){
            teacherObj.duration = droppedEvent[0].duration;
            duration = droppedEvent[0].duration;
        }
        teacherObj.deliveryTypeCode = droppedResource[0].deliveryTypeCode;
        let startTimeCopy = new Date(newStart.getTime());
        newEnd = new Date(startTimeCopy.setMinutes(startTimeCopy.getMinutes() + duration));
        let sameRowValidation =  self.staffDuplicateValidation(eventObj.teacherAvailable,newStart,newEnd,resourceId);        
        let instructionalHourValidation = self.checkInstructionalHours(teacherObj, newStart,"teacher");
        if(sameRowValidation && instructionalHourValidation){
            let duplicateScheduleValidation = self.checkTeacherScheduleInCenter(eventObj.teacherAvailable.id, newStart, duration, true);
            if (duplicateScheduleValidation) {
                self.dialogBodyText = globals.STAFF_IN_DIFF_CENTER;
                self.prompt.show();
            }else{
                let staffAvailability = self.checkForStaffAvailability(eventObj.teacherAvailable.id, newStart);
                let isNonPreferred = false;
                if(staffAvailability){
                    if(droppedEvent.length){
                        isNonPreferred = self.checkNonPreferredStudentForTeacher(eventObj.teacherAvailable.id, droppedEvent);
                    }
                    if((droppedEvent.length && !droppedEvent[0].teacher) || !droppedEvent.length){
                        if((droppedEvent.length && !droppedEvent[0].students.length) || !droppedEvent.length){
                            sessionCreated = self.saveTeacherToSession(eventObj,newStart,newEnd,resourceId,!staffAvailability);
                        }else{
                            let showPopup = false;
                            droppedEvent[0].students.forEach(student => {
                                var index = teacherPrograms.map(function (x) {
                                    return x.id;
                                }).indexOf(student.programId);
                                if (index == -1) {
                                    showPopup = true;
                                    return false;
                                }
                            });
                            let msg = "";
                            if(!staffAvailability){
                                msg = globals.STAFF_UNAVAILABLE;
                            }
                            if(isNonPreferred){
                                if(msg.trim()){
                                    msg +=" ,"
                                }
                                msg += globals.NON_PREF_TEACHER;
                            }
                            if(showPopup){
                                if(msg.trim()){
                                    msg +=" ,"
                                }
                                msg += globals.DIFF_PROGRAM;
                            }
                            if(msg.trim()){
                                self.dialogBodyText = msg+globals.CONF_MSG;
                                self.xrmConverter.setTempCache("eventObj",eventObj);
                                self.xrmConverter.setTempCache("newStart",newStart);
                                self.xrmConverter.setTempCache("newEnd",newEnd);
                                self.xrmConverter.setTempCache("resourceId",resourceId);
                                self.xrmConverter.setTempCache("notAvailable",staffAvailability);
                                self.teacherConfirmation.show();
                            }
                        }
                    }
                }else{
                    self.dialogBodyText = globals.STAFF_UNAVAILABLE+globals.CONF_MSG;
                    self.xrmConverter.setTempCache("eventObj",eventObj);
                    self.xrmConverter.setTempCache("newStart",newStart);
                    self.xrmConverter.setTempCache("newEnd",newEnd);
                    self.xrmConverter.setTempCache("resourceId",resourceId);
                    self.xrmConverter.setTempCache("notAvailable",staffAvailability);
                    self.teacherConfirmation.show();
                }
            }
        }else {
            let msg = globals.DUPLICATE_STAFF;
            if (!instructionalHourValidation) {
                msg = globals.NO_INS_HOUR;
            }
            self.dialogBodyText = msg;
            self.prompt.show();
        }
    return sessionCreated;
    }

    checkTeacherScheduleInCenter = (teacherId, startHour, endHour, centerFlag) => {
        let self = this;
        let StaffAvailable = false;
        startHour = new Date(startHour);
        // Set end hour to start hour + 1
        if (!endHour) {
            endHour = new Date(startHour);
            endHour = new Date(endHour.setHours(endHour.getHours() + 1));
        } else {
            endHour = new Date(startHour);
            endHour = new Date(endHour.setHours(endHour / 60));
        }
        self.eventForDayview.teacherScheduleList.forEach(el => {
            var elStart = new Date(el['start']);
            var elEnd = new Date(el['end']);
            if (el['id'] == teacherId &&
                ((centerFlag && el['centerId'] != self.selectedCenterId) || !centerFlag) &&
                (
                    (
                        startHour.getTime() <= elStart.getTime() &&
                        endHour.getTime() >= elEnd.getTime()
                    ) ||
                    (
                        elStart.getTime() <= startHour.getTime() &&
                        elEnd.getTime() >= endHour.getTime()
                    ) ||
                    (
                        endHour.getTime() > elStart.getTime() &&
                        elEnd.getTime() > startHour.getTime()
                    )
                )
            ) {
                 StaffAvailable = true;
            } 
        });
        return StaffAvailable;
    }

    checkForStaffAvailability = (teacherId, startHour) => {
        var self = this;
        var teacherIsAvialble = false;
        var startHour1 = Object.assign(startHour);
        startHour1 = self.config.convertToMinutes(moment(startHour1).format("h:mm A"));
        var endHour1 = startHour1 + 60;
        startHour = new Date(startHour);
        startHour = startHour.getHours();
        var teacher = self.availableTeacherList.filter(function (x) {
            if (x.id == teacherId && x.startHour <= startHour && startHour < x.endHour) {
                return x;
            };
        });
        teacher.forEach((staff, key) =>{
            var staffStartTime = new Date(moment(staff['startDate'], "MM/DD/YYYY").format("MM/DD/YYYY") + " " + teacher[0]['start']);
            var staffEndTime = new Date(moment(staff['endDate'], "MM/DD/YYYY").format("MM/DD/YYYY") + " " + teacher[0]['end']);
            if (self.availableTeacherList.length) {
                self.availableTeacherList.forEach(teacher => {
                    var startDateTime = new Date(moment(teacher['startDate'], "MM/DD/YYYY").format("MM/DD/YYYY") + " " + teacher['start']);
                    var endDateTime = new Date(moment(teacher['endDate'], "MM/DD/YYYY").format("MM/DD/YYYY") + " " + teacher['end']);
                    if (startDateTime.getTime() <= staffStartTime.getTime() && teacher['id'] == teacherId && staffEndTime.getTime() <= endDateTime.getTime()) {
                        teacherIsAvialble = true;
                    }
                });
            }
        });
        if (self.staffExceptionList.length && teacherIsAvialble) {
            self.staffExceptionList.forEach(staffDetail => {
                if (staffDetail['astaff_x002e_hub_staffid'] == teacherId &&
                (
                    (
                        startHour1 <= staffDetail['hub_starttime'] &&
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
                }
            });
        }
        return teacherIsAvialble;
    }

    checkNonPreferredStudentForTeacher = function (teacherId, newEvent) {
        var self = this;
        var nonPreferedTeacher = false;
        if (teacherId != undefined) {
            if (newEvent.hasOwnProperty('students') && newEvent['students'].length > 0) {
                newEvent.students.forEach(student => {
                    if (student['nonPreferredTeacher'] != undefined && student['nonPreferredTeacher'] == teacherId) {
                        nonPreferedTeacher = true;
                    }
                });
            }
        }
        return nonPreferedTeacher;
    }

    getProgramObj = function (teacherId) {
        var self = this;
        var programObj = [];
        self.staffProgram.map(function (x) {
            if (x.astaffprogram_x002e_hub_staffid == teacherId) {
                var PrograExist = programObj.map(function (y) {
                    return y;
                }).indexOf(x['hub_programid']);
                if (PrograExist == -1) {
                    var obj = {
                        id: x['hub_programid'],
                        name: x['hub_name'],
                        color: x['hub_color']
                    }
                    programObj.push(obj);
                }
            }
        }).indexOf(teacherId);
        return programObj;
    }

    saveTeacherToSession = (eventObj,newStart,newEnd,resourceId,notAvailable) =>{
        let self = this;
        let updatedEventObj = Object.assign({},eventObj.teacherAvailable);
        let responseForCalendar = false;
        let droppedResource = self.getResourcebyId(resourceId)[0];
        updatedEventObj = {
            etagId: updatedEventObj.etagId,
            id: updatedEventObj.id,
            name: updatedEventObj.name,
            start: newStart,
            startHour: newStart,
            end: newEnd,
            duration:(newEnd.getTime() - newStart.getTime()) / (1000 * 60),
            resourceId: resourceId,
            deliveryTypeId: droppedResource.deliveryTypeId,
            deliveryType: droppedResource.deliveryType,
            locationId: updatedEventObj.locationId,
            centerId: self.selectedCenterId,
        };
        if (notAvailable) {
            updatedEventObj['scheduleType'] = self.config.FLOAT_TEACHER_TYPE;
        } else {
            updatedEventObj['scheduleType'] = self.config.SCHEDULE_STATUS;
        }
        let rawTeacherList = self.xrmConverter.convertTeacherForSession([eventObj.teacherAvailable,updatedEventObj]);
        this.ngxService.start();
        let responseObj:any =  self.data.saveTAtoSession(rawTeacherList[0], rawTeacherList[1]);
        if (responseObj && responseObj['@odata.etag']) {
            let newTeacherObj:any = {};
            responseForCalendar = true;
            let tempDate = Object.assign({},newStart);
            updatedEventObj.etagId = responseObj['@odata.etag'];
            updatedEventObj.hub_staff_scheduleid = responseObj['hub_staff_scheduleid'];
            if (self.convertedPinnedList.length && updatedEventObj.scheduleType != self.config.FLOAT_TEACHER_TYPE) {
                var isPinned = self.convertedPinnedList.filter(function (obj) {
                    return (obj.startTime != undefined && obj.resourceId != undefined &&
                            obj.teacherId == updatedEventObj.id &&
                            obj.resourceId == updatedEventObj.resourceId &&
                            obj.startTime == moment(tempDate).format("h:mm A") &&
                            obj.dayId == self.config.getDayValue(newStart))
                });
                if (isPinned[0] != undefined) {
                    updatedEventObj['pinId'] = isPinned[0].id;
                }
            }
            eventObj.teacherAvailable = updatedEventObj;
            self.createEventOnTeacherDrop(eventObj,newStart,newEnd,resourceId);
        }else if(typeof responseObj == 'string'){
            self.dialogBodyText = responseObj;
            self.prompt.show();
        } else if (typeof responseObj == 'object' && responseObj.code) {
            self.dialogBodyText = responseObj.message;
            self.refreshConfirmation.show();
        }
       return responseForCalendar;
    }

    teacherValidConfirmation = () =>{
        let self = this;
        let eventObj = self.xrmConverter.getTempCache("eventObj");
        let newStart = self.xrmConverter.getTempCache("newStart");
        let newEnd = self.xrmConverter.getTempCache("newEnd");
        let resourceId = self.xrmConverter.getTempCache("resourceId");
        let notAvailable = self.xrmConverter.getTempCache("notAvailable");
        self.teacherConfirmation.hide();
        let sessionCreated = false;
        if(eventObj.teacher){
            sessionCreated = self.saveTeacherBetweenSession(eventObj,newStart,newEnd,resourceId,!notAvailable);    
        }else{
            sessionCreated = self.saveTeacherToSession(eventObj,newStart,newEnd,resourceId,!notAvailable);
        }
        if(sessionCreated){
            self.refresh.next();
        }
        self.ngxService.stop();
        self.focusOncalendar();
    }

    createTeacherEvent = (eventObj,newStart,newEnd,resourceId)=>{
        let self = this;
        let sessionCreated = false;
        let droppedResource:any = self.getResourcebyId(resourceId);
        let duration = globals.DEFAULT_DURATION;

        let teacherPrograms = self.getProgramObj(eventObj.teacher)
        let droppedEvent = droppedResource[0].events.filter(droppingEvent =>{
            if(droppingEvent.start.toString() == newStart.toString()){
                return droppingEvent; 
            }
        });
        let teacherObj:any = {}
        teacherObj.duration = duration;
        eventObj.teacher.duration = duration;
        if(droppedEvent.length){
            teacherObj.duration = droppedEvent[0].duration;
            duration = droppedEvent[0].duration;
        }
        teacherObj.deliveryTypeCode = droppedResource[0].deliveryTypeCode;
        let startTimeCopy = new Date(newStart.getTime());
        newEnd = new Date(startTimeCopy.setMinutes(startTimeCopy.getMinutes() + duration));
        let sameRowValidation =  self.staffDuplicateValidation(eventObj.teacher,newStart,newEnd,resourceId);        
        let instructionalHourValidation = self.checkInstructionalHours(teacherObj, newStart,"teacher");
        if(sameRowValidation && instructionalHourValidation){
            let duplicateScheduleValidation = self.checkTeacherScheduleInCenter(eventObj.teacher.id, newStart, duration, true);
            if (duplicateScheduleValidation) {
                self.dialogBodyText = globals.STAFF_IN_DIFF_CENTER;
                self.prompt.show();
            }else{
                let staffAvailability = self.checkForStaffAvailability(eventObj.teacher.id, newStart);
                let isNonPreferred = false;
                if(staffAvailability){
                    if(droppedEvent.length){
                        isNonPreferred = self.checkNonPreferredStudentForTeacher(eventObj.teacher.id, droppedEvent);
                    }
                    if((droppedEvent.length && !droppedEvent[0].teacher) || !droppedEvent.length){
                        if((droppedEvent.length && !droppedEvent[0].students.length) || !droppedEvent.length){
                            sessionCreated = self.saveTeacherBetweenSession(eventObj,newStart,newEnd,resourceId,!staffAvailability);
                        }else{
                            let showPopup = false;
                            droppedEvent[0].students.forEach(student => {
                                var index = teacherPrograms.map(function (x) {
                                    return x.id;
                                }).indexOf(student.programId);
                                if (index == -1) {
                                    showPopup = true;
                                    return false;
                                }
                            });
                            let msg = "";
                            if(!staffAvailability){
                                msg = globals.STAFF_UNAVAILABLE;
                            }
                            if(isNonPreferred){
                                if(msg.trim()){
                                    msg +=" ,"
                                }
                                msg += globals.NON_PREF_TEACHER;
                            }
                            if(showPopup){
                                if(msg.trim()){
                                    msg +=" ,"
                                }
                                msg += globals.DIFF_PROGRAM;
                            }
                            if(msg.trim()){
                                self.dialogBodyText = msg+globals.CONF_MSG;
                                self.xrmConverter.setTempCache("eventObj",eventObj);
                                self.xrmConverter.setTempCache("newStart",newStart);
                                self.xrmConverter.setTempCache("newEnd",newEnd);
                                self.xrmConverter.setTempCache("resourceId",resourceId);
                                self.xrmConverter.setTempCache("notAvailable",staffAvailability);
                                self.teacherConfirmation.show();
                            }
                        }
                    }
                }else{
                    self.dialogBodyText = globals.STAFF_UNAVAILABLE+globals.CONF_MSG;
                    self.xrmConverter.setTempCache("eventObj",eventObj);
                    self.xrmConverter.setTempCache("newStart",newStart);
                    self.xrmConverter.setTempCache("newEnd",newEnd);
                    self.xrmConverter.setTempCache("resourceId",resourceId);
                    self.xrmConverter.setTempCache("notAvailable",staffAvailability);
                    self.teacherConfirmation.show();
                }
            }
        }else {
            let msg = globals.DUPLICATE_STAFF;
            if (!instructionalHourValidation) {
                msg = globals.NO_INS_HOUR;
            }
            self.dialogBodyText = msg;
            self.prompt.show();
        }
    return sessionCreated;
    }

    saveTeacherBetweenSession = (eventObj,newStart,newEnd,resourceId,notAvailable) =>{
        let self = this;
        let newTeacherSession = Object.assign({},eventObj.teacher);
        let responseForCalendar = false;
        let droppedResource = self.getResourcebyId(resourceId)[0];
        newTeacherSession.start = newStart;
        newTeacherSession.startHour = newStart;
        newTeacherSession.end = newEnd;
        newTeacherSession.resourceId = resourceId;
        newTeacherSession.deliveryTypeId = droppedResource.deliveryTypeId;
        newTeacherSession.deliveryType = droppedResource.deliveryType;
        newTeacherSession.pinId = undefined;
        let tempDate = Object.assign({},newStart);        
        if (self.convertedPinnedList.length && newTeacherSession.scheduleType != self.config.FLOAT_TEACHER_TYPE) {
            var isPinned = self.convertedPinnedList.filter(function (obj) {
                return (obj.startTime != undefined && obj.resourceId != undefined &&
                        obj.teacherId == newTeacherSession.id &&
                        obj.resourceId == newTeacherSession.resourceId &&
                        obj.startTime == moment(tempDate).format("h:mm A") &&
                        obj.dayId == self.config.getDayValue(newStart))
            });
            if (isPinned[0] != undefined) {
                newTeacherSession.pinId = isPinned[0].id;
            }
        }
        if (notAvailable) {
            newTeacherSession['scheduleType'] = self.config.FLOAT_TEACHER_TYPE;
        } else {
            newTeacherSession['scheduleType'] = self.config.SCHEDULE_STATUS;
        }
        let rawTeacherList = self.xrmConverter.convertTeacherEventObj([eventObj.teacher,newTeacherSession]);
        this.ngxService.start();
        let responseObj:any =  self.data.saveTeachertoSession(rawTeacherList[0], rawTeacherList[1]);
        if (responseObj && responseObj['@odata.etag']) {
            responseForCalendar = true;
            let tempDate = Object.assign({},newStart);
            newTeacherSession.etagId = responseObj['@odata.etag'];
            newTeacherSession.hub_staff_scheduleid = responseObj['hub_staff_scheduleid'];
            if (newTeacherSession.hasOwnProperty('isFromMasterSchedule')) {
                delete newTeacherSession.isFromMasterSchedule;
                delete newTeacherSession.pinId;
            }
            eventObj.teacher = newTeacherSession;
            self.createEventOnDrop(eventObj.event,eventObj,newStart,newEnd,resourceId);
        }else if(typeof responseObj == 'string'){
            self.dialogBodyText = responseObj;
            self.prompt.show();
        } else if (typeof responseObj == 'object' && responseObj.code) {
            self.dialogBodyText = responseObj.message;
            self.refreshConfirmation.show();
        }
       return responseForCalendar;
    }

    makeupAndFloat = (eventObj,makeupFlag) =>{
        let self = this;
        self.makeupFlag = makeupFlag;
        let locationObj = self.config.getLocation();
        let parentCenter;
        var satelliteIds = [];
        let locationList = self.config.getLocationList();
        let startDate = moment(self.config.getSelectedDate()).format("YYYY-MM-DD");
        satelliteIds.push(self.selectedCenterId);
        if (locationObj['_hub_parentcenter_value'] != undefined) {
            parentCenter = locationObj['_hub_parentcenter_value'];
            satelliteIds.push(locationObj['_hub_parentcenter_value']);
            locationList.forEach(function (y) {
                if (locationObj['_hub_parentcenter_value'] == y['_hub_parentcenter_value'] && y['hub_centerid'] != self.selectedCenterId) {
                    satelliteIds.push(y.hub_centerid);
                }
            });
        } else {
            locationList.forEach(function (y) {
                if (self.selectedCenterId == y['_hub_parentcenter_value']) {
                    satelliteIds.push(y.hub_centerid);
                }
            });
        }
        let makeupList = self.data.getMakeupNFloat({ "hub_center@odata.bind": self.selectedCenterId, "isForMakeup": makeupFlag, "hub_date": startDate, "hub_parentcenter": satelliteIds, "parentCenterId": parentCenter });
        let convertedList = this.xrmConverter.convertMakeupNFloatObj(makeupList);
        self.makeupNfloatList = this.getUniqueFromMakeupNFloat(convertedList);
        self.makeupNfloat.show();
        self.xrmConverter.setTempCache("eventObj",eventObj);
        self.xrmConverter.setTempCache("makeupFlag",makeupFlag);
    }

    getUniqueFromMakeupNFloat = makeupList =>{
        let self = this;
        let uniquewList = [];
        makeupList.forEach(val => {
            var index = -1;
            for (var i = 0; i < uniquewList.length; i++) {
                if (uniquewList[i].id == val.id && uniquewList[i].enrollmentId == val.enrollmentId) {
                    index = i;
                    break;
                }
            }
            if (index == -1) {
                uniquewList.push(val);
            } else {
                if ((new Date(uniquewList[index].makeupExpiryDate)).getTime() > (new Date(val.makeupExpiryDate)).getTime()) {
                    uniquewList.splice(index, 1);
                    uniquewList.push(val);
                }
            }
        });
        return uniquewList;
    }

    addMakeupOrFloat = student =>{
        let self = this;
        let eventObj:any = {};
        eventObj.event = self.xrmConverter.getTempCache("eventObj");
        let makeupFlag = self.xrmConverter.getTempCache("makeupFlag");
        let newStart = eventObj.event.start;
        let newEnd = eventObj.event.end;
        let locationObj = self.config.getLocation();
        let resourceId = eventObj.event.resourceId;
        self.makeupNfloat.hide();
        student.start = newStart;
        student.end = newEnd;
        student.resourceId = resourceId;
        student.startHour = newStart;
        student.isForMakeup = makeupFlag;
        let tempDate = Object.assign({},newStart);
        student["_hub_parentcenter_value"] = locationObj['_hub_parentcenter_value'];
        student.sessionDate = moment(tempDate).format("YYYY-MM-DD");
        eventObj.student = student;
        let allowStudent = self.validateStudentOnSameRow(eventObj,newStart,newEnd,resourceId);
        if(allowStudent){
            let instructionalHourValidation = self.checkInstructionalHours(student,newStart,"student");
            if(instructionalHourValidation){
                this.ngxService.start();
                setTimeout(function(){
                    self.saveMakeupNFloat(eventObj,newStart,newEnd,resourceId);
                },50);
            }else{
                self.dialogBodyText = globals.NO_INS_HOUR + " " + globals.CONF_MSG;
                self.xrmConverter.setTempCache("eventObj",eventObj);
                self.xrmConverter.setTempCache("newStart",newStart);
                self.xrmConverter.setTempCache("newEnd",newEnd);
                self.xrmConverter.setTempCache("resourceId",resourceId);
                self.makeupConfirmation.show();
            }
        }else{
            self.dialogBodyText = globals.DUPLICATE_STUDENT;
            self.prompt.show();
        }
        self.ngxService.stop();        
        self.focusOncalendar();
    }

    saveMakeupNFloat = (eventObj,newStart,newEnd,resourceId) =>{
        let self = this;
        eventObj.student.sessionDate = moment(self.config.getSelectedDate()).format("YYYY-MM-DD");
        let rawStudent:any = self.xrmConverter.convertStudentForSession([eventObj.student]);
        rawStudent[0].isForMakeup = eventObj.student.isForMakeup;
        let responseObj = self.data.saveMakeupNFloat(rawStudent[0]);
        if(typeof (responseObj) == 'object' && responseObj['@odata.etag']){
            eventObj.student['sessionId'] = responseObj['hub_studentsessionid'];
            eventObj.student['sessionDate'] = responseObj['hub_session_date'];
            eventObj.student['etagId'] = responseObj['@odata.etag'];
            if (eventObj.student.subjectGradient && eventObj.student.subjectGradient.split(",")[1]) {
                eventObj.student.subjectColorCode = eventObj.student.subjectGradient.split(",")[1].replace(");", '');
              } 
              eventObj.student.subjectGradient = eventObj.student.subjectGradient.replace(';','');
              eventObj.student.iconStyle = {
                'background-color':eventObj.student.subjectGradient,
                'background': eventObj.student.subjectColorCode,
              };
            if (responseObj['hub_sessiontype'] != undefined) {
                eventObj.student['sessiontype'] = responseObj['hub_sessiontype'];
            }
            if (responseObj['hub_session_status'] != undefined) {
                eventObj.student['sessionStatus'] = responseObj['hub_session_status'];
            }
            if (responseObj['hub_student_session@odata.bind']) {
                eventObj.student['studentSession'] = responseObj['hub_student_session@odata.bind'];
            }
            if (responseObj['hub_master_schedule@odata.bind']) {
                eventObj.student['masterScheduleId'] = responseObj['hub_master_schedule@odata.bind'];
            }
            if (responseObj['hub_sourceapplicationid']) {
                eventObj.student['sourceAppId'] = responseObj['hub_sourceapplicationid'];
            }
            self.createEventOnDrop(eventObj.event,eventObj,newStart,newEnd,resourceId);
            self.refresh.next();
        }else if(typeof responseObj == 'string'){
            self.dialogBodyText = responseObj;
            self.prompt.show();
        } else if (typeof responseObj == 'object' && responseObj.code) {
            self.dialogBodyText = responseObj.message;
            self.refreshConfirmation.show();
        }
        self.ngxService.stop();
        self.focusOncalendar();
    }

    makeupValidConfirmation = ()=>{
        let self = this;
        let eventObj = self.xrmConverter.getTempCache("eventObj");
        let newStart = self.xrmConverter.getTempCache("newStart");
        let newEnd = self.xrmConverter.getTempCache("newEnd");
        let resourceId = self.xrmConverter.getTempCache("resourceId");
        self.makeupConfirmation.hide();
        self.ngxService.start();
        setTimeout(()=>{
            self.saveMakeupNFloat(eventObj,newStart,newEnd,resourceId);
        },50);
    }

    omitStudentSession = (eventObj,status) => {
        let self = this;
        self.ngxService.start();
        setTimeout(()=>{
        let resourceId = eventObj.event.resourceId;
        let resourceObj:any = self.getResourcebyId(resourceId);
        let eventIndex = resourceObj[0].events.indexOf(eventObj.event);
        let studentIndex = resourceObj[0].events[eventIndex].students.indexOf(eventObj.student);
        var studentObj = Object.assign({},eventObj.student)
        let convertedStudent = self.xrmConverter.convertStudentForStatusChange([studentObj]);
        let responseObj:any;
        if(status == self.config.OMIT_STATUS){
            responseObj = self.data.omitStudentSession(convertedStudent[0]);
        }else if(status == 'attended'){
            responseObj = self.data.markAsAttended(convertedStudent[0]);
        }else{
            responseObj = self.data.unExcuseSession(convertedStudent[0]);
        }
        if (typeof (responseObj) == 'object' && responseObj['@odata.etag']) {
            studentObj.etagId = responseObj['@odata.etag'];
            if (responseObj['hub_student_session@odata.bind']) {
                studentObj['studentSession'] = responseObj['hub_student_session@odata.bind'];
            }
            if (responseObj['hub_master_schedule@odata.bind']) {
                studentObj['masterScheduleId'] = responseObj['hub_student_session@odata.bind'];
            }
            if (responseObj['hub_sourceapplicationid']) {
                studentObj['sourceAppId'] = responseObj['hub_sourceapplicationid'];
            }
            studentObj['isAttended'] = responseObj['hub_isattended'];
            eventObj.event.students[studentIndex] = studentObj;
            if(status != 'attended'){
                studentObj.sessionStatus = responseObj['hub_session_status'];
                if(responseObj['hub_session_status'] == self.config.OMIT_STATUS){
                    studentObj.sessionStatusText = globals.OMITTED_STUDENT;
                }else if(responseObj['hub_session_status'] == self.config.UNEXCUSED_STATUS){
                    studentObj.sessionStatusText = globals.UNEXCUSED_STUDENT;
                }
                self.saList.push(studentObj);
                resourceObj[0].events[eventIndex].students.splice(studentIndex,1);
                eventObj.event.maxCapacity = false;
                eventObj.event.is1to1 = false;
                eventObj.event.conflicts = false;
                eventObj.event.conflictMsg = "";
                let oneToOneFlag = false;
                eventObj.event.students.forEach(student => {
                    if(student.is1to1){
                        oneToOneFlag = true;
                    }
                });
                eventObj.event.is1to1 = oneToOneFlag;
                if(eventObj.event.is1to1 && eventObj.students.length > 1){
                    eventObj.event.conflicts = true;
                    eventObj.event.conflictMsg = globals.ONETOONE_CONFLICT;
                }
                if(eventObj.students.length > resourceObj[0].capacity){
                    eventObj.event.maxCapacity = true;
                    eventObj.event.conflicts = true;
                    eventObj.event.conflictMsg += " "+globals.MAX_CAPACITY; 
                }
                if(!resourceObj[0].events[eventIndex].students.length && (!resourceObj[0].events[eventIndex].teacher || self.isEmpty(resourceObj[0].events[eventIndex].teacher))){
                    resourceObj[0].events.splice(eventIndex,1);
                }
            }
            self.refresh.next();            
        } else if (typeof responseObj == 'object' && responseObj.code) {
            self.dialogBodyText = responseObj.message;
            self.refreshConfirmation.show();
        }
        self.ngxService.stop();
        self.focusOncalendar();
        },50)
    }

    pinStudent = studentObj =>{
        let self = this;
        self.ngxService.start();
        setTimeout(()=>{
            let locationObj = this.config.getLocation();
            let startTime = Object.assign(studentObj.event.start);
            var pinnedStudent = Object.assign({},studentObj.student)       
            if(!pinnedStudent.sessiontype){
                pinnedStudent.sessiontype = 1;
            }
            let objPinnedStudent:any = self.xrmConverter.convertToPinnedStudent([pinnedStudent]);
            if (self.convertedPinnedList.length) {
                var isPinned = self.convertedPinnedList.filter(function (x) {
                    return ((x.studentId == studentObj.student.id &&
                            x.resourceId == studentObj.event.resourceId &&
                            x.dayId == self.config.getDayValue(studentObj.student.start) &&
                            x.startTime == moment(startTime).format("h:mm A")) ||
                            (x.studentId == studentObj.student.id &&
                            x.affinityResourceId == studentObj.event.resourceId &&
                            x.dayId == self.config.getDayValue(studentObj.student.start) &&
                            x.startTime == moment(startTime).format("h:mm A")))
                });
                if (isPinned[0] != undefined) {
                    objPinnedStudent[0].hub_sch_pinned_students_teachersid = isPinned[0].id;
                }
                
            }
            let parentCenterId;
            if (locationObj['_hub_parentcenter_value'] != undefined) {
                parentCenterId = locationObj['_hub_parentcenter_value'];
            }
            var responseObj = self.data.savePinStudent(objPinnedStudent[0], parentCenterId);
            if (typeof (responseObj) == 'object' && responseObj["@odata.etag"]) {
                if (responseObj != undefined) {
                    var studIndex = studentObj.event.students.indexOf(studentObj.student);
                    pinnedStudent['pinId'] = responseObj['hub_sch_pinned_students_teachersid'];
                    pinnedStudent.etagId = responseObj["staffStudentUpdatedEtag"];
                    studentObj.event.students[studIndex] = pinnedStudent;
                    self.refresh.next();                            
                }
            } else if (typeof responseObj == 'object' && responseObj.code) {
                self.dialogBodyText = responseObj.message;
                self.refreshConfirmation.show();
            }
            self.ngxService.stop();
            self.focusOncalendar();
        },50);
    }

    unpinStudent = eventObj =>{
        let self = this;
        self.ngxService.start();
        setTimeout(()=>{
        let locationObj = this.config.getLocation();
        let startTime = Object.assign(eventObj.event.start);
        var pinnedStudent = Object.assign({},eventObj.student)        
        let objUnpinnedStudent:any = self.xrmConverter.convertToPinnedStudent([pinnedStudent]);
        objUnpinnedStudent[0].hub_sch_pinned_students_teachersid = pinnedStudent.pinId;
        let parentCenterId;
        if (locationObj['_hub_parentcenter_value'] != undefined) {
            parentCenterId = locationObj['_hub_parentcenter_value'];
        }
        var responseObj = self.data.saveUnPinStudent(objUnpinnedStudent[0]);
        if (typeof (responseObj) == 'object' && responseObj["@odata.etag"]) {
            if (responseObj != undefined) {
                var studIndex = eventObj.event.students.indexOf(eventObj.student);
                delete pinnedStudent['pinId'];
                pinnedStudent.etagId = responseObj["staffStudentUpdatedEtag"];
                eventObj.event.students[studIndex] = pinnedStudent;
                self.refresh.next();                            
            }
        } else if (typeof responseObj == 'object' && responseObj.code) {
            self.dialogBodyText = responseObj.message;
            self.refreshConfirmation.show();
        }
        self.ngxService.stop();
        self.focusOncalendar();
    },50);
    }

    excuseStudent = eventObj =>{
        let self = this;
        self.ngxService.start();
        setTimeout(()=>{
        let resourceId = eventObj.event.resourceId;
        let resourceObj:any = self.getResourcebyId(resourceId);
        let eventIndex = resourceObj[0].events.indexOf(eventObj.event);
        let studentIndex = resourceObj[0].events[eventIndex].students.indexOf(eventObj.student);
        var studentObj = Object.assign({},eventObj.student)
        let convertedStudent = self.xrmConverter.convertStudentForExcuse([studentObj]);
        let responseObj:any;
        responseObj = self.data.excuseStudentFromSession(convertedStudent[0]);
        if (typeof (responseObj) == 'object' && responseObj['@odata.etag']) {
            studentObj.etagId = responseObj['@odata.etag'];
            if (responseObj['hub_student_session@odata.bind']) {
                studentObj['studentSession'] = responseObj['hub_student_session@odata.bind'];
            }
            if (responseObj['hub_master_schedule@odata.bind']) {
                studentObj['masterScheduleId'] = responseObj['hub_student_session@odata.bind'];
            }
            if (responseObj['hub_sourceapplicationid']) {
                studentObj['sourceAppId'] = responseObj['hub_sourceapplicationid'];
            }
            studentObj['isAttended'] = responseObj['hub_isattended'];
            eventObj.event.students[studentIndex] = studentObj;
            studentObj.sessionStatus = responseObj['hub_session_status'];
            studentObj.sessionStatusText = globals.EXCUSED_STUDENT;
            self.saList.push(studentObj);
            resourceObj[0].events[eventIndex].students.splice(studentIndex,1);
            if(!resourceObj[0].events[eventIndex].students.length && (!resourceObj[0].events[eventIndex].teacher || self.isEmpty(resourceObj[0].events[eventIndex].teacher))){
                resourceObj[0].events.splice(eventIndex,1);
            }
            self.refresh.next();            
        } else if (typeof responseObj == 'object' && responseObj.code) {
            self.dialogBodyText = responseObj.message;
            self.refreshConfirmation.show();
        }
        self.ngxService.stop();
        self.focusOncalendar();
    },50);
    }

    pinTeacher = eventObj =>{
        let self = this;
        self.ngxService.start();
        setTimeout(()=>{
        let locationObj = this.config.getLocation();
        let startTime = Object.assign(eventObj.event.start);
        var pinnedTeacher = Object.assign({},eventObj.teacher)       
        let objpinnedTeacher:any = self.xrmConverter.convertToPinnedTeacher([pinnedTeacher]);
        let parentCenterId;
        if (locationObj['_hub_parentcenter_value'] != undefined) {
            parentCenterId = locationObj['_hub_parentcenter_value'];
        }
        objpinnedTeacher[0].hub_date = objpinnedTeacher[0].hub_session_date;
        delete objpinnedTeacher[0].hub_session_date;
        var responseObj = self.data.savePinTeacher(objpinnedTeacher[0], parentCenterId);
        if (typeof (responseObj) == 'object' && responseObj["@odata.etag"]) {
            if (responseObj != undefined) {
                var teacherPinRec:any = {
                    id: responseObj['hub_sch_pinned_students_teachersid'],
                    dayId: responseObj['hub_day'],
                    dayValue: objpinnedTeacher[0].hub_day,
                    startTime: moment(startTime).format("h:mm A"),
                    resourceId: responseObj['hub_resourceid@odata.bind'],
                    teacherId: pinnedTeacher.id
                }
                teacherPinRec.etagId = responseObj['@odata.etag'];
                if(responseObj.staffStudentUpdatedEtag){
                    pinnedTeacher.etagId = responseObj.staffStudentUpdatedEtag;
                }
                pinnedTeacher.pinId = responseObj['hub_sch_pinned_students_teachersid'];
                self.convertedPinnedList.push(teacherPinRec);
                eventObj.event.teacher = pinnedTeacher;
                self.refresh.next();                            
            }
        } else if (typeof responseObj == 'object' && responseObj.code) {
            self.dialogBodyText = responseObj.message;
            self.refreshConfirmation.show();
        }
        self.ngxService.stop();
        self.focusOncalendar();
    },50);
    }

    unpinTeacher = eventObj =>{
        let self = this;
        self.ngxService.start();
        setTimeout(()=>{
        let locationObj = this.config.getLocation();
        let startTime = Object.assign(eventObj.event.start);
        var unPinnedTeacher = Object.assign({},eventObj.teacher)       
        let objpinnedTeacher:any = self.xrmConverter.convertToPinnedTeacher([unPinnedTeacher]);
        var responseObj = self.data.saveUnPinTeacher(objpinnedTeacher[0]);
        if (typeof (responseObj) == 'object' && responseObj["@odata.etag"]) {
            if (responseObj != undefined) {
                let pinnedStaff;
                if (self.convertedPinnedList.length) {
                    pinnedStaff = self.convertedPinnedList.filter(function (x) {
                        return (x.startTime != undefined && x.resourceId != undefined &&
                            x.teacherId == unPinnedTeacher.teacherId &&
                            x.startTime == moment(unPinnedTeacher.start).format("h:mm A") &&
                            x.dayId == self.config.getDayValue(self.config.getSelectedDate()))
                    });
                }
                self.convertedPinnedList.splice(self.convertedPinnedList.indexOf(pinnedStaff),1);
                unPinnedTeacher.etagId = responseObj['@odata.etag'];
                unPinnedTeacher.pinId = responseObj['hub_sch_pinned_students_teachersid'];
                delete unPinnedTeacher.pinId;
                eventObj.event.teacher = unPinnedTeacher;
                self.refresh.next();                            
            }
        } else if (typeof responseObj == 'object' && responseObj.code) {
            self.dialogBodyText = responseObj.message;
            self.refreshConfirmation.show();
        }
        self.ngxService.stop();
        self.focusOncalendar();
    },50);
    }

    getFloatTeacher = eventObj =>{
        let self = this;
        let locationObj = self.config.getLocation();
        let startDate = moment(self.config.getSelectedDate()).format("YYYY-MM-DD");
        let floatTeacherList = self.data.getFLoatTeacher(self.selectedCenterId,startDate,startDate,locationObj['_hub_parentcenter_value']);
        self.floatConvertedTeacherList = this.xrmConverter.convertFloatTeacher(floatTeacherList);
        self.xrmConverter.setTempCache("eventObj",eventObj);        
        self.floatTeacher.show();
    }

    addFloatTeacher = teacher =>{
        let self = this;
        self.ngxService.start();
        setTimeout(()=>{
        let eventObj:any = {};
        eventObj.event = self.xrmConverter.getTempCache("eventObj");
        let newStart = eventObj.event.start;
        let newEnd = eventObj.event.end;
        let locationObj = self.config.getLocation();
        let resourceId = eventObj.event.resourceId;
        let resource:any = this.getResourcebyId(resourceId)[0];
        self.floatTeacher.hide();
        teacher.start = newStart;
        teacher.end = newEnd;
        teacher.startHour = newStart;
        teacher.resourceId = resourceId;
        teacher.scheduleType = self.config.FLOAT_TEACHER_TYPE;
        teacher.locationId = self.selectedCenterId;
        teacher.centerId = self.selectedCenterId;
        teacher.deliveryType = resource.deliveryType;
        teacher.deliveryTypeId = resource.deliveryTypeId;
        teacher.duration = (newEnd.getTime() - newStart.getTime()) / (1000 * 60);
        let teacherForSession = Object.assign({},teacher);
        var sameRowValidation = self.staffDuplicateValidation(teacher,newStart,newEnd,resourceId);
        if(sameRowValidation){
            let duplicateScheduleValidation = self.checkTeacherScheduleInCenter(teacher.id, newStart, teacher.duration, true);
            if (duplicateScheduleValidation) {
                self.dialogBodyText = globals.STAFF_IN_DIFF_CENTER;
                self.prompt.show();
            }else{
                let staffAvailability = self.checkForStaffAvailability(teacher.id, newStart);
                let floatTeacherObj = self.xrmConverter.convertTeacherForSession([teacher]);
                if(staffAvailability){
                    self.floatTeacherSave(eventObj,newStart,newEnd,teacherForSession,floatTeacherObj);
                }else{
                    self.dialogBodyText = globals.STAFF_UNAVAILABLE;
                    self.xrmConverter.setTempCache("eventObj",eventObj);
                    self.xrmConverter.setTempCache("newStart",newStart);
                    self.xrmConverter.setTempCache("newEnd",newEnd);
                    self.xrmConverter.setTempCache("resourceId",resourceId);
                    self.xrmConverter.setTempCache("teacherForSession",teacherForSession);
                    self.xrmConverter.setTempCache("floatTeacherObj",floatTeacherObj);
                    self.teacherFloatConfirmation.show();
                }
            }
        }else{
            self.dialogBodyText = globals.STAFF_SCHEDULED;
            self.prompt.show();
        }
        self.ngxService.stop();
        self.focusOncalendar();
    },50);
    }

    floatTeacherSave = (eventObj,newStart,newEnd,teacher,floatTeacherObj) =>{
        let self = this;
        let resourceId = eventObj.event.resourceId;
        let responseObj = self.data.saveTeacherFloat(floatTeacherObj[0]);
        if (typeof (responseObj) == 'object' && responseObj["@odata.etag"]) {
            teacher.etagId = responseObj["@odata.etag"];
            teacher.scheduleId= responseObj["hub_staff_scheduleid"];
            eventObj.teacherAvailable = teacher;
            self.createEventOnTeacherDrop(eventObj,newStart,newEnd,resourceId);
        } else if (typeof responseObj == 'object' && responseObj.code) {
            self.dialogBodyText = responseObj.message;
            self.refreshConfirmation.show();
        }
        self.ngxService.stop();
        self.focusOncalendar();
        self.refresh.next();
    }

    teacherFloatValidConfirmation = ()=>{
        let self = this;
        let eventObj = self.xrmConverter.getTempCache("eventObj");
        let newStart = self.xrmConverter.getTempCache("newStart");
        let newEnd = self.xrmConverter.getTempCache("newEnd");
        let resourceId = self.xrmConverter.getTempCache("resourceId");
        let teacherForSession = self.xrmConverter.getTempCache("teacherForSession");
        let floatTeacherObj = self.xrmConverter.getTempCache("floatTeacherObj");
        self.teacherFloatConfirmation.hide();
        self.ngxService.start();
        setTimeout(()=>{
            self.floatTeacherSave(eventObj,newStart,newEnd,teacherForSession,floatTeacherObj);
        },50);
    }

    openReschedulePopup = eventObj =>{
        let self = this;
        self.rescheduleDate = "";
        self.rescheduleTimeList = [];
        self.ngxService.start();
        self.noTimings = false;
        setTimeout(()=>{
            let appConfig = self.config.getConfig();    
            let selectedStudent = Object.assign({},eventObj.student);
            let rescheduleMaxDate = moment(self.config.getSelectedDate()).add(30, 'days')["_d"];
            let rescheduleMinDate = moment(self.config.getSelectedDate()).subtract(30, 'days')["_d"];
            if (selectedStudent['enrolEndDate']){
                let formattedEndDate = new Date(moment(selectedStudent['enrolEndDate']).format("MM-DD-YYYY"));
                if(formattedEndDate.getTime() < rescheduleMaxDate.getTime()){
                    rescheduleMaxDate = formattedEndDate;
                }
            }       
            if(selectedStudent['enrolStartDate']){
                let formattedStartDate = new Date(moment(selectedStudent['enrolStartDate']).format("MM-DD-YYYY"));
                if(formattedStartDate.getTime() > rescheduleMinDate.getTime()){
                    rescheduleMinDate = formattedStartDate;
                }
            }
            let minDate = {year:rescheduleMinDate.getFullYear(),month:rescheduleMinDate.getMonth()+1,day:rescheduleMinDate.getDate()}
            let maxDate = {year:rescheduleMaxDate.getFullYear(),month:rescheduleMaxDate.getMonth()+1,day:rescheduleMaxDate.getDate()}
            let isClosure = self.checkClosure(rescheduleMinDate);
            if (isClosure) {
                var minDateMonth = moment(minDate).month() + 1;
                minDate =  moment(minDate).set('month', minDateMonth)["_d"];
                minDate =  moment(minDate).set('date', 1)["_d"];
            }
            isClosure = self.checkClosure(rescheduleMaxDate);
            if (isClosure) {
                var maxDateMonth = moment(maxDate).month() - 1;
                let maxClosureDate:any = maxDate;
                maxClosureDate = moment(moment(maxClosureDate).set('month', maxDateMonth)["_d"]).format("MM-DD-YYYY");
                maxDate = moment(maxClosureDate).endOf('month')["_d"];
            }
            let disabledDates = self.getDisableDates(minDate,maxDate);
            self.rescheduleOptions = {
                dateFormat: appConfig.dateFormat.toLowerCase(),
                firstDayOfWeek: 'su',
                disableSince:maxDate,
                disableUntil:minDate,
                disableDays:disabledDates
            };
            self.xrmConverter.setTempCache("rescheduleStudent",selectedStudent.name);
            self.xrmConverter.setTempCache("rescheduleStudentObj",selectedStudent);
            self.xrmConverter.setTempCache("eventObj",eventObj);
            self.reschedulePopup.show();         
            self.ngxService.stop();
            self.focusOncalendar();
        },50);
    }

    checkClosure = date => {
        var self = this;
        date = new Date(date);
        var locationObj = self.config.getLocation();
        var parentCenterId = locationObj['_hub_parentcenter_value'];
        if (parentCenterId == undefined) {
            parentCenterId = locationObj['hub_centerid'];
        }
        var accntClosure:any = self.data.getAccountClosure(parentCenterId, (date.getMonth() + 1), date.getFullYear());
        if (accntClosure && accntClosure.length) {
            if (accntClosure[0]['hub_status'] == 2) {
                return true;
            }
        }
        return false;
    }

    getDisableDates = function (minDate, maxDate) {
        let self = this;
        let locationObj = self.config.getLocation();
        let businessClosures = self.data.getBusinessClosure(locationObj.hub_centerid, moment(minDate).format("YYYY-MM-DD"), moment(maxDate).format("YYYY-MM-DD"), locationObj['_hub_parentcenter_value']);
        let disableddates = [];
        if (businessClosures != null && businessClosures.length) {
            businessClosures.forEach(closureDate => {
                var startDate = closureDate['hub_startdatetime@OData.Community.Display.V1.FormattedValue'];
                var endDate = closureDate['hub_enddatetime@OData.Community.Display.V1.FormattedValue'];
                var businessClosureStartDate = new Date(startDate);
                var businessClosureEndDate = new Date(endDate);
                if (businessClosureStartDate.getTime() == businessClosureEndDate.getTime()) {
                    disableddates.push(
                        {   
                            year:businessClosureStartDate.getFullYear(),
                            month:businessClosureStartDate.getMonth()+1,
                            day:businessClosureStartDate.getDate()
                        }
                    );
                } else {
                    for (var j = businessClosureStartDate.getTime() ; j <= businessClosureEndDate.getTime() ; j += (24 * 60 * 60 * 1000)) {
                        let selectedDate = new Date(j);
                        disableddates.push(
                            {   
                                year:selectedDate.getFullYear(),
                                month:selectedDate.getMonth()+1,
                                day:selectedDate.getDate()
                            }
                        );
                    }
                }
            }); 
        }
        return disableddates;
    }

    populateTimings = date => {
        if(date.jsdate){
            let self = this;
            self.noTimings = false;
            var pickerContainer = document.getElementById("reschedulePicker");
            pickerContainer.classList.remove("invalid");
            let selectedStudent =  self.xrmConverter.getTempCache('rescheduleStudentObj');
            if(selectedStudent){
                let duration = selectedStudent['duration'] == undefined ? 60 : selectedStudent['duration'];
                self.rescheduleTimeList = self.getStudentTimings(self.selectedCenterId, date.jsdate, selectedStudent['namedHoursId'], duration, false);   
                if(!self.rescheduleTimeList.length){
                    self.noTimings = true;
                }else{
                    setTimeout(()=>{
                        self.rescheduleEndTime.nativeElement.innerText = self.config.tConvert(self.config.convertMinsNumToTime(self.config.convertToMinutes(self.rescheduleTimeList[0]) + duration));
                    },20);
                }
            }
        } 
    }

    populateEndTime = startTime =>{
        let self = this;
        let selectedStudent = self.xrmConverter.getTempCache('rescheduleStudentObj');
        let duration = selectedStudent['duration'] == undefined ? 60 : selectedStudent['duration'];
        self.rescheduleStartTime.nativeElement.innerText = startTime;
        self.rescheduleEndTime.nativeElement.innerText = self.config.tConvert(self.config.convertMinsNumToTime(self.config.convertToMinutes(startTime) + duration));
    }

    getStudentTimings = (locationId,date,timeSlotType,studentDuration,istimeSlotType) =>{
        let self = this;
        let day = self.config.getDayValue(new Date(date));
        let timingArry = [];
        let ConvertedTimingArry = [];
        if (day != undefined) {
            let selectedDate = moment(date).format("YYYY-MM-DD");
            var availableTime = [];
            if (!isNaN(timeSlotType)) {
                availableTime = self.data.getPiStudentAvailableTime(locationId, selectedDate, timeSlotType);
            } else {
                availableTime = self.data.getGfStudentAvailableTime(locationId, selectedDate, timeSlotType);
            }
            availableTime = (availableTime == null) ? [] : availableTime;
            availableTime.forEach(timing => {
                if (day == timing['hub_days']) {
                    for (let j = timing['hub_starttime']; j < timing['hub_endtime']; j = j + studentDuration) {
                        timingArry.push(j);
                    }
                }
            });
            if (timingArry.length) {
                timingArry.sort(function (a, b) { return a - b });
                timingArry.forEach(timing => {
                    ConvertedTimingArry.push(self.config.tConvert(self.config.convertMinsNumToTime(timing)));                    
                });
            }
            return ConvertedTimingArry;
        }
    }

    rescheduleStudent = ()=>{
        let self = this;
        let validForm = true;
        if(!self.rescheduleDate){
            self.reschedulePicker.invalidDate = true;
            var pickerContainer = document.getElementById("reschedulePicker");
            pickerContainer.classList.add("invalid");
            validForm = false;
        }
        if(validForm && !self.noTimings){
        self.ngxService.start();
        setTimeout(()=>{
            let selectedStudent = Object.assign({},self.xrmConverter.getTempCache('rescheduleStudentObj'));
            let prevStudentObj = Object.assign({},self.xrmConverter.getTempCache('rescheduleStudentObj'));
            let eventObj = self.xrmConverter.getTempCache('eventObj');
            self.reschedulePopup.hide();
            selectedStudent.sessionDate = moment(self.rescheduleDate.formatted).format("YYYY-MM-DD");
            selectedStudent.start = new Date(self.rescheduleDate.formatted + " " + self.rescheduleStartTime.nativeElement.innerHTML);
            selectedStudent.end = new Date(self.rescheduleDate.formatted + " " + self.rescheduleEndTime.nativeElement.innerHTML);
            delete selectedStudent.resourceId;
            let convertedStudent = self.xrmConverter.convertStudentForSession([selectedStudent,prevStudentObj]);
            let responseObj = self.data.rescheduleStudentSession(convertedStudent[1],convertedStudent[0]);
            if (typeof (responseObj) == 'object' && responseObj['@odata.etag']) {
                let resourceId = prevStudentObj.resourceId;
                let resourceObj = self.getResourcebyId(resourceId)[0];
                let eventIndex = resourceObj.events.indexOf(eventObj.event);
                let studentIndex = resourceObj.events[eventIndex].students.indexOf(eventObj.student);
                resourceObj.events[eventIndex].students.splice(studentIndex,1);
                if(!resourceObj.events[eventIndex].students.length && !resourceObj.events[eventIndex].teacher){
                    resourceObj.events.splice(eventIndex,1);
                }
                self.refresh.next();
            }else if (typeof responseObj == 'object' && responseObj.code) {
                self.dialogBodyText = responseObj.message;
                self.refreshConfirmation.show();
            }else if(typeof responseObj == 'string'){
                self.dialogBodyText = responseObj;
                self.prompt.show();
            }
            self.ngxService.stop();
            self.focusOncalendar();
        },50)
      } 
    }

    focusOncalendar = () =>{
        let calendarDiv = document.getElementById("calendarContainer");
        calendarDiv.click();
    }

    scrollToEvent = () =>{
        let self = this;
        let minStartTime:any;
        let firstEventResourceId;
        self.resources.forEach((resource,index) =>{
            let resourceId = resource.id;
            resource.events.filter(event => {       
                if(moment(event.start).format("MM/DD/YYYY") == self.config.getSelectedDate()){
                    if(!minStartTime){
                        minStartTime = event.start.getTime();
                        firstEventResourceId = resourceId;                                    
                    }
                    if(event.start.getTime() <= minStartTime){
                        minStartTime = event.start.getTime();
                        firstEventResourceId = resourceId;
                   } 
                }        
            });
        });
        if(firstEventResourceId){
            let firstEvent:any = document.querySelector('.resource_'+firstEventResourceId+' .cal-events .cal-event-container');
            if(firstEvent){
                let firstEventMargin = parseInt(firstEvent.style.marginTop);
                document.querySelector("html").scroll(0,firstEventMargin);
            }else{
                document.querySelector("html").scroll(0,0);
            }
        }
    }

}
