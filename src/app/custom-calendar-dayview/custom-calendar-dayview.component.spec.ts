import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomCalendarDayviewComponent } from './custom-calendar-dayview.component';

describe('CustomCalendarDayviewComponent', () => {
  let component: CustomCalendarDayviewComponent;
  let fixture: ComponentFixture<CustomCalendarDayviewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CustomCalendarDayviewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CustomCalendarDayviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
