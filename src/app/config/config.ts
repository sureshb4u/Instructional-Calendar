
import {Injectable} from '@angular/core';
import * as moment from 'moment';


@Injectable({
  providedIn: 'root'
})

export class AppConstants {

  private configData:any;
  private locationObj:any;
  private starDate:any;
  private endDate:any;
  private selectedDate:any;
  private locationList:any = [];
  

  // SESSION TYPES
  public REGULAR_TYPE = 1;
  public FLOAT_TYPE = 2;
  public MAKEUP_TYPE = 3;
  public FLOAT_TEACHER_TYPE = 4;

  // SESSION STATUS
  public SCHEDULE_STATUS = 1;
  public RESCHEDULE_STATUS = 2;
  public EXCUSED_STATUS = 3;
  public UNEXCUSED_STATUS = 4;
  public OMIT_STATUS = 5;
  public MAKEUP_STATUS = 6;
  public INVALID_STATUS = 7;
  public SIMPLICITY_STATUS = 1;

  public ACTIVE_STATE = 0;

  public colorObj:any = {
    GF:{
      "secondary" : "#fff",
      "primary" : "#7bc143",
      "deliveryType" : "Group-Facilitation",
      "deliveryTypeCode": 2
    },
    GI:{
      "secondary" : "#fff",
      "primary" : "#f88e50",
      "deliveryType" : "Group-Instruction",
      "deliveryTypeCode": 3
    },
    PI:{
      "secondary" : "#fff",
      "primary" : "#9acaea",
      "deliveryType" : "Personal-Instruction",
      "deliveryTypeCode": 1
    }
  }


  public ETAG_CODE = "412";

  setConfig(value:any) {
    this.configData = value
  }

  getConfig():any {
    return this.configData;
  }

  setLocation = centerId =>{
      this.locationObj = centerId;
  }

  getLocation (){
    return this.locationObj;
  }

  setStartDate = selectdDate =>{
    this.starDate = selectdDate;
  }

  getStartDate = () => {
    return this.starDate;
  }

  setEndDate = selectedEndDate =>{
    this.endDate = selectedEndDate;
  }

  getEndDate = () => {
    return this.endDate;
  }

  setSelectedDate = selectedDate =>{
    this.selectedDate = selectedDate
  }

  getSelectedDate = ()=>{
    return this.selectedDate;
  }

  setLocationList = centerList =>{
    this.locationList = centerList;
  }

  getLocationList = ()=>{
    return this.locationList;
  }

  getDayValue = date=>{
    if (date != undefined) {
      switch (moment(date).format('dddd').toLowerCase()) {
          case 'monday':
              return 1;
          case 'tuesday':
              return 2;
          case 'wednesday':
              return 3;
          case 'thursday':
              return 4;
          case 'friday':
              return 5;
          case 'saturday':
              return 6;
          case 'sunday':
              return 7;
      }
   }
  }

  convertMinsNumToTime = (minsNum) =>{
    var self = this;
    if (minsNum) {
        // var mins_num = parseFloat(this, 10); // don't forget the second param
        var hours:any = Math.floor(minsNum / 60);
        var minutes:any = Math.floor((minsNum - ((hours * 3600)) / 60));
        var seconds:any = Math.floor((minsNum * 60) - (hours * 3600) - (minutes * 60));

        // Appends 0 when unit is less than 10
        if (hours < 10) { hours = "0" + hours; }
        if (minutes < 10) { minutes = "0" + minutes; }
        if (seconds < 10) { seconds = "0" + seconds; }
        return hours + ':' + minutes;
    }
 }



  tConvert = (time) =>{
      var self = this;
      time = time.toString().match(/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];
      if (time.length > 1) {
          time = time.slice(1);
          time[5] = +time[0] < 12 ? ' AM' : ' PM';
          time[0] = +time[0] % 12 || 12;
      }
      return time.join('');
  }

  convertToMinutes = (timeString) =>{
      var self = this;
      if (timeString != undefined) {
          if (timeString.split(' ')[1] == 'AM') {
              var hours = parseInt(moment(timeString, 'h:mm A').format('h'));
              var minutes = parseInt(moment(timeString, 'h:mm A').format('mm'));
              return (hours * 60) + minutes;
          }
          else {
              var hours = parseInt(moment(timeString, 'h:mm A').format('h'));
              hours = hours != 12 ? hours + 12 : hours;
              var minutes = parseInt(moment(timeString, 'h:mm A').format('mm'));
              return (hours * 60) + minutes;
          }
      }
  }
}

export const DUPLICATE_STAFF = "The selected staff is already scheduled for the respective timeslot.";
export const STAFF_ALREADY_EXIST = "A staff is already assigned for the respective timeslot.";
export const ONETOONE_CONFLICT = "1:1 Session Conflict";
export const ONETOONE_INFO = "1:1 Session";
export const ONETOONE_CONF = " Session is OneToOne";
export const GI_SESSION = "Can not be placed to a GI session.";
export const DUPLICATE_STUDENT = "The selected student with same service is already scheduled for the respective timeslot.";
export const NO_INS_HOUR = "Cannot be placed in middle of a defined Slot Hour.";
export const DURATION_MISMATCH = "Student slot timings are mismatching.Cannot be placed.";
export const DIFF_DELIVERY = "DeliveryType is different. Do you wish to continue?";
export const DIFF_DELIVERY_AND_INS_HOUR = "DeliveryType is different, Instructional Hour is not available. Do you wish to continue?";
export const MAX_CAPACITY = "Capacity has reached the maximum";
export const CONF_MSG = " Do you wish to continue?";
export const GI_TIME_VALIDATION_1 ="<div style='text-align:left !important;'>The selected student is not allowed to be scheduled for the respective timeslot. <br> Student session start time:-";
export const GI_TIME_VALIDATION_2 = "<br> Student session end time:-";
export const DEFAULT_DURATION = 60;
export const STAFF_IN_DIFF_CENTER = "The selected staff is already scheduled for the respective timeslot in different center.";
export const STAFF_SCHEDULED = "The selected staff is already scheduled for the respective timeslot.";
export const DIFF_PROGRAM = "Teacher program is not matching";
export const STAFF_UNAVAILABLE = "Teacher is not available";
export const NON_PREF_TEACHER = "Non preferred teacher";
export const OMITTED_STUDENT = "Omitted";
export const UNEXCUSED_STUDENT = "Unexcused";
export const EXCUSED_STUDENT = "Excused";
export const NO_TIMING = "No Instructional hours found for the given date."; 