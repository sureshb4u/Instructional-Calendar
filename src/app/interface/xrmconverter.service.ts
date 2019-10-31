import { Injectable } from '@angular/core';
import * as moment from 'moment';
import { AppConstants } from '../config/config';


@Injectable({
  providedIn: 'root'
})
export class XrmconverterService {

  private tempCacheObj:any = {};  
  constructor(private config:AppConstants) { }

  convertPinnedData = rawPinnedStudents =>{
    let pinnedStudentList = [];
    if(!rawPinnedStudents){
        rawPinnedStudents = [];
    }
    rawPinnedStudents.forEach(rawPinnedStudent => {
      var obj:any = {
        id: rawPinnedStudent['hub_sch_pinned_students_teachersid'],
        enrollmentId: rawPinnedStudent['_hub_enrollment_value'],
        startTime: rawPinnedStudent['hub_start_time@OData.Community.Display.V1.FormattedValue'],
        endTime: rawPinnedStudent['hub_end_time@OData.Community.Display.V1.FormattedValue'],
        studentId: rawPinnedStudent['_hub_student_value'],
        studentName: rawPinnedStudent['_hub_student_value@OData.Community.Display.V1.FormattedValue'],
        teacherId: rawPinnedStudent['_hub_teacher_value'],
        teacherName: rawPinnedStudent['_hub_teacher_value@OData.Community.Display.V1.FormattedValue'],
        dayId: rawPinnedStudent['hub_day'],
        centerId: rawPinnedStudent['_hub_center_value'],
        centerName: rawPinnedStudent['_hub_center_value@OData.Community.Display.V1.FormattedValue'],
        dayValue: rawPinnedStudent['hub_day@OData.Community.Display.V1.FormattedValue']
    };
    if(rawPinnedStudent['@odata.etag']){
      obj.etagId = rawPinnedStudent['@odata.etag'];
    }
    if (rawPinnedStudent['_hub_resource_value'] != undefined) {
        obj.resourceId = rawPinnedStudent['_hub_resource_value'];
        obj.resourceName = rawPinnedStudent['_hub_resource_value@OData.Community.Display.V1.FormattedValue'];
    }
    if (rawPinnedStudent['_hub_affinity_resourceid_value'] != undefined) {
        obj.affinityResourceId = rawPinnedStudent['_hub_affinity_resourceid_value'];
        obj.affinityResourceName = rawPinnedStudent['_hub_affinity_resourceid_value@OData.Community.Display.V1.FormattedValue'];
    }
      pinnedStudentList.push(obj);
    });
    return pinnedStudentList;
  }

  convertStudentForSession = studentList =>{
      let rawStudents = [];
      if(!studentList){
        studentList = [];
      }
      studentList.forEach(student => {
        let studentObj:any = {}
        if (studentObj['isFromMasterSchedule']) {
          studentObj['hub_session_date'] = moment(student.startHour).format('YYYY-MM-DD');
          studentObj.hub_start_time = this.config.convertToMinutes(moment(student.start).format("h:mm A"));
          studentObj.hub_end_time = this.config.convertToMinutes(moment(student.end).format("h:mm A"));
          studentObj['hub_resourceid@odata.bind'] = null
          studentObj.hub_is_1to1 = student['is1to1'];
      } else {
          studentObj['hub_session_date'] = student['sessionDate'];
          studentObj['hub_is_1to1'] = student['is1to1'];
          studentObj['hub_isattended'] = student['isAttended'];
          studentObj['hub_studentsessionid'] = student['sessionId'];
          studentObj['hub_start_time'] = this.config.convertToMinutes(moment(student.start).format("h:mm A"));
          studentObj['hub_end_time'] = this.config.convertToMinutes(moment(student.end).format("h:mm A"));
          studentObj['hub_resourceid@odata.bind'] = student.resourceId;
          studentObj['hub_session_status'] = student['sessionStatus'];
          studentObj['hub_sessiontype'] = student['sessiontype'];
      }
      studentObj['@odata.etag'] = student.etagId;
      if (student['makeupExpiryDate']) {
          studentObj['hub_makeup_expiry_date'] = moment(student['makeupExpiryDate']).format('YYYY-MM-DD');
      }

      studentObj['hub_enrollment@odata.bind'] = student['enrollmentId'];
      studentObj['hub_deliverytype'] = student['deliveryTypeId'];
      studentObj['hub_service@odata.bind'] = student['serviceId'];
      studentObj['hub_student@odata.bind'] = student['id'];
      studentObj['hub_center@odata.bind'] = student["locationId"];
      studentObj['hub_deliverytype@OData.Community.Display.V1.FormattedValue'] = student['deliveryType'];
      studentObj['hub_deliverytype_code'] = student.deliveryTypeCode;
      if (student.studentSession) {
          studentObj['hub_student_session@odata.bind'] = student.studentSession;
      }
      if (student.masterScheduleId) {
          studentObj['hub_master_schedule@odata.bind'] = student.masterScheduleId;
      }
      if (student.sourceAppId) {
          studentObj['hub_sourceapplicationid'] = student.sourceAppId;
      }
      // Get location object
      studentObj['ownerObj'] = this.config.getLocation()['ownerObj'];
      rawStudents.push(studentObj);
      });
      return rawStudents;
  }

  convertTeacherForSession = teacherList =>{
    var self = this;
    let rawTeacherList = [];
    if(!teacherList){
        teacherList = [];
    }
    teacherList.forEach(teacher => {
        var objStaff:any = {};
        objStaff['hub_staff@odata.bind'] = teacher.id;
        objStaff['hub_center@odata.bind'] = teacher.locationId;
        if (teacher.etagId) {
            objStaff['@odata.etag'] = teacher.etagId;
        }
        if(teacher.deliveryTypeId){
            objStaff.hub_deliverytype = teacher.deliveryTypeId;
        }
        if(teacher.resourceId){
            objStaff['hub_resourceid@odata.bind'] = teacher.resourceId;
        }
        if(teacher.start){
            objStaff.hub_date = moment(teacher.start).format("YYYY-MM-DD");
            objStaff.hub_start_time = this.config.convertToMinutes(moment(teacher.start).format("h:mm A"));
            objStaff.hub_end_time = this.config.convertToMinutes(moment(teacher.end).format("h:mm A"));
        }
        if(teacher.scheduleType){
            objStaff.hub_schedule_type = teacher.scheduleType;
        }
        // Get Location Obj 
        objStaff['ownerObj'] = this.config.getLocation()['ownerObj'];
        objStaff['hub_centerid'] = teacher.centerId;
        rawTeacherList.push(objStaff);
    });
        return rawTeacherList;
  }

  convertTeacherEventObj = teacherList =>{
    let rawTeachers = [];
    teacherList.forEach(teacher => {
        let staffObj:any = {}
        if (teacher != undefined) {
            if (teacher['isFromMasterSchedule']) {
            }
            else {
                staffObj['hub_staff_scheduleid'] = teacher['scheduleId'];
                staffObj['hub_product_service@odata.bind'] = teacher['serviceId'];
                staffObj['@odata.etag'] = teacher.etagId;
            }
            staffObj['hub_resourceid@odata.bind'] = teacher['resourceId'];
            staffObj['hub_start_time'] = this.config.convertToMinutes(moment(teacher.start).format("h:mm A"));
            staffObj['hub_end_time'] = this.config.convertToMinutes(moment(teacher.end).format("h:mm A"));
            staffObj['hub_center_value'] = teacher['locationId'];
            staffObj['hub_date'] = moment(teacher.start).format("YYYY-MM-DD");
            staffObj['hub_staff@odata.bind'] = teacher['id'];
            staffObj['hub_schedule_type'] = teacher['scheduleType'];
            // Get location Object
            let locationObj = this.config.getLocation();
            staffObj['ownerObj'] = locationObj['ownerObj'];
            staffObj['hub_centerid'] = locationObj['hub_centerid'];
        }
        rawTeachers.push(staffObj);
    });
    return rawTeachers;
  }

  convertMakeupNFloatObj = makeupList => {
    let self = this;
    let eventObjList = [];
    makeupList.forEach(val => {
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
            duration: val['aproductservice_x002e_hub_duration'],
            timeSlotType: val['aproductservice_x002e_hub_timeslottype'],
            namedHoursId: val['aproductservice_x002e_hub_namedgfhoursid'],
            isAttended: val['hub_isattended'],
            makeupExpiryDate: val['hub_makeup_expiry_date@OData.Community.Display.V1.FormattedValue'],
        }
        if (val['@odata.etag']) {
            obj.etagId = val['@odata.etag'];
        }
        if (obj.subjectGradient && obj.subjectGradient.split(",")[1]) {
            obj.subjectColorCode = obj.subjectGradient.split(",")[1].replace(");", '');
        } else {
            obj.subjectColorCode = val['aprogram_x002e_hub_color'];
        }
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
        eventObjList.push(obj); 
    });
    return eventObjList;
  }

  convertToSof = rawStudent =>{
      let studentList = [];
    let locationObj = this.config.getLocation();
    rawStudent.forEach(student => {
        let objMovetoSOF:any = {};        
        if (student['isFromMasterSchedule']) {
            objMovetoSOF['hub_enrollment@odata.bind'] = student['enrollmentId'];
            objMovetoSOF['hub_service@odata.bind'] = student['serviceId'];
            objMovetoSOF['hub_center@odata.bind'] = locationObj['hub_centerid'];
            objMovetoSOF['hub_student@odata.bind'] = student['id'];
            objMovetoSOF.hub_session_date = moment(student.start).format("YYYY-MM-DD");
            objMovetoSOF.hub_start_time = this.config.convertToMinutes(moment(student.start).format("h:mm A"));
            objMovetoSOF.hub_end_time = this.config.convertToMinutes(moment(student.end).format("h:mm A"));
            objMovetoSOF.hub_is_1to1 = student['is1to1'];
        } else {
            objMovetoSOF['hub_studentsessionid'] = student['sessionId'];
        }
        objMovetoSOF.hub_isattended = student['isAttended'];
        objMovetoSOF['hub_resourceid@odata.bind'] = null;
        if (student.hasOwnProperty('resourceId')) {
            delete student['resourceId'];
        }
        objMovetoSOF['ownerObj'] = locationObj['ownerObj'];
        if (student['studentSession']) {
            objMovetoSOF['hub_student_session@odata.bind'] = student['studentSession'];
        }
        if (student['masterScheduleId']) {
            objMovetoSOF['hub_master_schedule@odata.bind'] = student['masterScheduleId'];
        }
        objMovetoSOF['@odata.etag'] = student['etagId'];
        objMovetoSOF['hub_sessiontype'] = student['sessiontype'] ;
        objMovetoSOF['hub_session_status'] = student['sessionStatus'];
        if (student['sourceAppId']) {
            objMovetoSOF['hub_sourceapplicationid'] = student['sourceAppId'];
        }
        studentList.push(objMovetoSOF);
    });
    return studentList;
  }

  convertStudentForStatusChange = rawStudent =>{
    let studentList = [];
    let locationObj = this.config.getLocation();
    rawStudent.forEach(student => {
        let objCancelSession:any = {};
        if (student['isFromMasterSchedule']) {
            objCancelSession['hub_enrollment@odata.bind'] = student['enrollmentId'];
            objCancelSession['hub_service@odata.bind'] = student['serviceId'];
            objCancelSession['hub_center@odata.bind'] = locationObj['hub_centerid'];
            objCancelSession['hub_student@odata.bind'] = student['id'];
            objCancelSession.hub_session_date = moment(student['start']).format('YYYY-MM-DD');
            objCancelSession.hub_start_time = this.config.convertToMinutes(moment(new Date(student['start'])).format("h:mm A"));
            objCancelSession.hub_end_time = this.config.convertToMinutes(moment(student['end']).format("h:mm A"));
            objCancelSession.hub_resourceid = student['resourceId'];
            objCancelSession.hub_is_1to1 = student['is1to1'];
        }
        else {
            objCancelSession['hub_studentsessionid'] = student['sessionId'];
        }
        objCancelSession['ownerObj'] = locationObj['ownerObj'];
        if (student['studentSession']) {
            objCancelSession['hub_student_session@odata.bind'] = student['studentSession'];
        }
        if (student['masterScheduleId']) {
            objCancelSession['hub_master_schedule@odata.bind'] = student['masterScheduleId'];
        }
        if (student['sourceAppId']) {
            objCancelSession['hub_sourceapplicationid'] = student['sourceAppId'];;
        }
        if (student['etagId']) {
            objCancelSession['@odata.etag'] = student['etagId'];
        }
        studentList.push(objCancelSession);
    });
    return studentList;
  }

  convertStudentForExcuse = rawStudent =>{
    let studentList = [];
    let locationObj = this.config.getLocation();
    rawStudent.forEach(student => {
        let objCancelSession:any = {};
        if (student['isFromMasterSchedule']) {
            objCancelSession.hub_session_date = moment(student.start).format("YYYY-MM-DD");
            objCancelSession.hub_start_time = this.config.convertToMinutes(moment(student.start).format("h:mm A"));
            objCancelSession.hub_end_time = this.config.convertToMinutes(moment(student.end).format("h:mm A"));
        }
        else {
            objCancelSession['hub_studentsessionid'] = student['sessionId'];
            objCancelSession['hub_session_date'] = student['sessionDate'];
            objCancelSession.hub_start_time = this.config.convertToMinutes(moment(student.start).format("h:mm A"));
            objCancelSession.hub_end_time = objCancelSession.hub_start_time + 60;
        }
        if (student.etagId) {
            objCancelSession['@odata.etag'] = student.etagId;
        }
        objCancelSession.hub_is_1to1 = student['is1to1'];
        objCancelSession['hub_enrollment@odata.bind'] = student['enrollmentId'];
        objCancelSession['hub_service@odata.bind'] = student['serviceId'];
        objCancelSession['hub_center@odata.bind'] = locationObj['hub_centerid'];
        if (locationObj['_hub_parentcenter_value'] != undefined) {
            objCancelSession['hub_parentcenter'] = locationObj['_hub_parentcenter_value'];
        }
        objCancelSession['hub_student@odata.bind'] = student['id'];
        objCancelSession['hub_resourceid@odata.bind'] = null;
        objCancelSession['ownerObj'] = locationObj['ownerObj'];
        if (student['studentSession']) {
            objCancelSession['hub_student_session@odata.bind'] = student['studentSession'];
        }
        if (student['masterScheduleId']) {
            objCancelSession['hub_master_schedule@odata.bind'] = student['masterScheduleId'];
        }
        if (student['sourceAppId']) {
            objCancelSession['hub_sourceapplicationid'] = student['sourceAppId'];
        }
        studentList.push(objCancelSession);
    });
    return studentList;
  }

  convertToPinnedStudent = rawStudent =>{
      let self = this;
      let studentList = [];
      let locationObj = this.config.getLocation();
      rawStudent.forEach(student => {
          let objPinnedStudent:any = {};
          objPinnedStudent['hub_center@odata.bind'] = student.locationId;
          objPinnedStudent['hub_enrollment@odata.bind'] = student.enrollmentId;
          objPinnedStudent['hub_service@odata.bind'] = student.serviceId;
          objPinnedStudent['hub_student@odata.bind'] = student.id;
          objPinnedStudent['hub_resourceid@odata.bind'] = student.resourceId;
          objPinnedStudent.hub_start_time = self.config.convertToMinutes(moment(student.start).format("h:mm A"));
          objPinnedStudent.hub_end_time = objPinnedStudent.hub_start_time + 60;
          objPinnedStudent.hub_day = self.config.getDayValue(self.config.getSelectedDate());
          objPinnedStudent.hub_session_date = moment(self.config.getSelectedDate()).format("YYYY-MM-DD");
          objPinnedStudent['hub_deliverytype_code'] = student.deliveryTypeCode;
          objPinnedStudent['hub_sessiontype'] = student['sessiontype'];
          if (student['makeupExpiryDate']) {
              objPinnedStudent['hub_makeup_expiry_date'] = moment(student['makeupExpiryDate']).format('YYYY-MM-DD');
          }
          objPinnedStudent['hub_session_status'] = student['sessionStatus'];
          objPinnedStudent['ownerObj'] = locationObj['ownerObj'];
          if (student['studentSession']) {
            objPinnedStudent['hub_student_session@odata.bind'] = student['studentSession'];
          }
          if (student['masterScheduleId']) {
            objPinnedStudent['hub_master_schedule@odata.bind'] = student['masterScheduleId'];
          }
          if (student['sourceAppId']) {
            objPinnedStudent['hub_sourceapplicationid'] = student['sourceAppId'];
          }
          if (student.etagId) {
            objPinnedStudent['@odata.etag'] = student.etagId;
          }
          objPinnedStudent['hub_isattended'] = student['isAttended'];
          if (student['sessionId']) {
            objPinnedStudent['hub_studentsessionid'] = student['sessionId'];
          }
          studentList.push(objPinnedStudent);
      });
      return studentList;
  }

  convertToPinnedTeacher = rawTeacher =>{
    let self = this;
    let teacherList= [];
    let locationObj = this.config.getLocation();
    rawTeacher.forEach(teacher => {
        let objPinnedStaff:any = {};
        objPinnedStaff['hub_center@odata.bind'] = teacher.locationId;
        objPinnedStaff['hub_teacher@odata.bind'] = teacher.id;        
        objPinnedStaff['hub_resourceid@odata.bind'] = teacher.resourceId;
        objPinnedStaff.hub_start_time = self.config.convertToMinutes(moment(teacher.start).format("h:mm A"));
        objPinnedStaff.hub_end_time = objPinnedStaff.hub_start_time + 60;
        objPinnedStaff.hub_day = self.config.getDayValue(self.config.getSelectedDate());
        objPinnedStaff.hub_sch_pinned_students_teachersid = teacher.pinId;
        objPinnedStaff.hub_session_date = moment(self.config.getSelectedDate()).format("YYYY-MM-DD");
        objPinnedStaff['hub_deliverytype_code'] = teacher.deliveryTypeCode;
        objPinnedStaff['ownerObj'] = locationObj['ownerObj'];
        objPinnedStaff['hub_centerid'] = locationObj['hub_centerid'];        
        if (teacher.etagId) {
          objPinnedStaff['@odata.etag'] = teacher.etagId;
        }
        if (teacher.scheduleId) {
            objPinnedStaff["hub_staff_scheduleid"] = teacher.scheduleId;
        }
        teacherList.push(objPinnedStaff);
    });
    return teacherList;
}

    convertFloatTeacher = rawTeacherList =>{
        let convertedList = [];
        rawTeacherList.forEach(teacher => {
            let teacherObj:any = {}
            teacherObj.id = teacher["hub_staffid"];
            teacherObj.name = teacher["hub_name"];
            teacherObj.startDate = teacher["hub_startdate@OData.Community.Display.V1.FormattedValue"];
            teacherObj.endDate = teacher["hub_enddate@OData.Community.Display.V1.FormattedValue"];
            teacherObj.etagId = teacher['@odata.etag'];
            convertedList.push(teacherObj);
        });
        return convertedList;
    }

  setTempCache = (attr,val) =>{
    this.tempCacheObj[attr] = val;
  }

  getTempCache = attr =>{
     return this.tempCacheObj[attr];
  }

  clearCache = ()=>{
      this.tempCacheObj = {};
  }
}
