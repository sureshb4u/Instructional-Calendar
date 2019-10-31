import { Injectable } from '@angular/core';
import{BehaviorSubject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CommunicationService {

  private getData = new BehaviorSubject('');
  currentMessage = this.getData.asObservable();

  constructor() { }

  setData(data) {
    this.getData.next(data)
  }

}
