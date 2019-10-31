
var config={
  "views":["DAY","MONTH","WEEk"],
  "dateFormat":"MM/DD/YYYY",
  "resourceView":"true",
  "timeFormat":"h:mm a",
  "segments":"4",
  "startHour":"6",
  "endHour":"22"
};


export function Data() {
  this.getLocation = function () {
      return CalendarInterface.getAvailableCenters();
  },
  this.getStudentSession= function(locationId,startDate,endDate,parentCenterValue){
    return  CalendarInterface.getStudentSessions(locationId, startDate, endDate);
  }
  this.getResources = function(locationId){
    return CalendarInterface.getResources(locationId);
  }
  this.getStaffSchedule = function(locationId,startDate,endDate,parentCenterValue,isActual){
    return CalendarInterface.getStaffSchedules(locationId, startDate, endDate, parentCenterValue, isActual);
  }
  this.getStaffAvailability = function(locationId, startDate, endDate){
    return CalendarInterface.getTeacherAvailability(locationId, startDate, endDate);
  }
  this.getAvailableStaff = function(locationId, startDate, endDate) {
    return CalendarInterface.getTeacherAvailability(locationId, startDate, endDate);
  }
  this.getStaffException = function(locationId, startDate, endDate, parentCenterId){
    return CalendarInterface.getStaffExceptions(locationId, startDate, endDate, parentCenterId);
  }
  this.getCalendarConfig = function(){
    return config;
  }
  this.getRecentlyViewedCenter = function(){
    return CalendarInterface.checkRecentlyViewedCenter();
    //return null;
  }
  this.updateRecentlyViewedCenter = function(locationId,recordId){
    return CalendarInterface.onChangeOfCenter(locationId, recordId);
  }
  this.getsaList = function(locationId,startDate,endDate){
    return CalendarInterface.getSAPaneSessions(locationId, startDate, endDate);
    //done
  }
  this.getPinnedData = function(locationId,startDate,endDate,parentCenterId){
    return CalendarInterface.getPinnedStudentsAndTeachers(locationId, startDate, parentCenterId);
  }

  this.getAccountClosure = function (parentCenterId, month, year) {
    return CalendarInterface.getAccountClosure(parentCenterId, month, year)
  }
  this.getBusinessClosure = function(locationId,startDate,endDate,parentCenterId){
    return CalendarInterface.getBusinessClosure(locationId, startDate, endDate, parentCenterId);
  }
  this.getInstructionalHours = function (day,date,centerId) {
    return CalendarInterface.getCenterInstructionalHours(day, date, centerId);
  }
  this.saveStudenttoSession = function(objPrevSession,objNewSession){
    return CalendarInterface.moveStudentBetweenSession(objPrevSession, objNewSession);
  }

  this.saveSOFtoSession = function (objStudent, objSession) {
      return CalendarInterface.addStudentToSchedule(objStudent, objSession);
  }

  this.saveTAtoSession = function (objTeacher, objSession) {
    return CalendarInterface.moveStaffToSession(objTeacher, objSession);
  }

  this.getStaffProgram = function (locationId) {
    return CalendarInterface.getStaffPrograms(locationId);
  }

  this.getProgramList = function (locationId) {
    return CalendarInterface.getPrograms();
  }

  this.getMakeupNFloat = function (objSession) {
    return CalendarInterface.getStudentsForMakeupFloat(objSession);
  }

  this.saveTeachertoSession = function (objStaff, objSession) {
    return CalendarInterface.rescheduleStaff(objStaff, objSession);
  }
  this.saveMakeupNFloat = function (objNewSession) {
    return CalendarInterface.createMakeupOrFloat(objNewSession);
  }
    this.markAsAttended = function (objSession) {
        return CalendarInterface.markAttended(objSession);
    }

    this.unExcuseSession = function (objSession) {
        return CalendarInterface.markUnexcused(objSession);
    }
    this.moveStudentToSOF = function (objStudentSession) {
      return CalendarInterface.moveToSOF(objStudentSession);
    }
    this.omitStudentSession = function (objStudentSession) {
      return CalendarInterface.omitSession(objStudentSession);
    }
    this.savePinStudent = function (objPinnedStudent, parentCenterId) {
      return CalendarInterface.createPinnedStudentStaff(objPinnedStudent, parentCenterId);
    }

    this.saveUnPinStudent = function (objUnPinnedStudent) {
      return CalendarInterface.unpinStudentStaff(objUnPinnedStudent);
    }
    this.getFLoatTeacher = function (locationId, startDate, endDate, parentCenterId) {
      return CalendarInterface.getAllStaff(locationId, startDate, endDate, parentCenterId);
    }

    this.saveTeacherFloat = function (objStaffSch) {
      return CalendarInterface.createStaffSchedule(objStaffSch, true);
    }
    this.removeTeacher = function (objStaff) {
      return CalendarInterface.removeStaff(objStaff);
    }
    this.savePinTeacher = function (objPinnedTeacher, parentCenterId) {
        return CalendarInterface.createPinnedStudentStaff(objPinnedTeacher, parentCenterId);
    }

    this.saveUnPinTeacher = function (ObjUnPinnedTeacher) {
        return CalendarInterface.unpinStudentStaff(ObjUnPinnedTeacher);
    }

    this.excuseStudentFromSession = function (objStudentSession) {
      return CalendarInterface.excuseSession(objStudentSession);
    }
    this.getPiStudentAvailableTime = function (locationId, selectedDate, timeSlotType) {
      return CalendarInterface.getWorkHourTimings(locationId, selectedDate, timeSlotType);
    }
    this.getGfStudentAvailableTime = function (locationId, selectedDate, namedHoursId) {
        return CalendarInterface.getTimingsForGF(locationId, selectedDate, namedHoursId);
    }
    this.rescheduleStudentSession = function (objPrevSession, objNewSession) {
      return CalendarInterface.rescheduleSession(objPrevSession, objNewSession);
    }
    this.openEnrollment = function (enrollmentID) {
        return CalendarInterface.openEnrollmentForm(enrollmentID);
    }
  
}