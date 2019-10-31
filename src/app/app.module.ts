import { NgModule }       from '@angular/core';
import { BrowserModule }  from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations'
import { FormsModule, }    from '@angular/forms';
import { HttpClientModule }    from '@angular/common/http';
import { HttpClientInMemoryWebApiModule } from 'angular-in-memory-web-api';
import { AppRoutingModule }     from './app-routing.module';
import { AppComponent }         from './app.component';
import { CalendarModule } from './angular-calendar';
import { ContextMenuModule } from 'ngx-contextmenu';
import { CalendarFilterComponent } from './calendar-filter/calendar-filter.component';
import { MDBBootstrapModule } from 'angular-bootstrap-md';
import { CustomCalendarComponent } from './custom-calendar/custom-calendar.component';
import { MyDatePickerModule } from '../../node_modules/angular4-datepicker/src/my-date-picker';
import { CustomCalendarDayviewComponent } from './custom-calendar-dayview/custom-calendar-dayview.component';
import { AppConstants } from './config/config';
import { ModalModule, TooltipModule, PopoverModule, ButtonsModule } from 'angular-bootstrap-md';
import { FilterPipe } from './filter.pipe'
import { NgxUiLoaderModule,  SPINNER, NgxUiLoaderConfig, POSITION, PB_DIRECTION} from  'ngx-ui-loader';
import { SelectDropDownModule } from 'ngx-select-dropdown'


const ngxUiLoaderConfig: NgxUiLoaderConfig = {
  fgsColor: '#4285f4',
  fgsPosition: POSITION.centerCenter,
  fgsType: SPINNER.threeStrings,
  pbThickness: 5, // progress bar thickness
};

@NgModule({
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    AppRoutingModule,
    HttpClientModule,
    SelectDropDownModule,
    CalendarModule.forRoot(),
    ContextMenuModule.forRoot({useBootstrap4: true}),
    NgxUiLoaderModule.forRoot(ngxUiLoaderConfig),
    MDBBootstrapModule.forRoot(),
    MyDatePickerModule,    
  ],
  declarations: [
    AppComponent,
    CalendarFilterComponent,
    CustomCalendarComponent,
    CustomCalendarDayviewComponent,
    FilterPipe
  ],
  bootstrap: [ AppComponent ],
  providers:[ AppConstants ]
})
export class AppModule { }
