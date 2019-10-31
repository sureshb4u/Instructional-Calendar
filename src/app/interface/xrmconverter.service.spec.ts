import { TestBed, inject } from '@angular/core/testing';

import { XrmconverterService } from './xrmconverter.service';

describe('XrmconverterService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [XrmconverterService]
    });
  });

  it('should be created', inject([XrmconverterService], (service: XrmconverterService) => {
    expect(service).toBeTruthy();
  }));
});
