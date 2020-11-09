import {Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {Observable, Subject} from "rxjs";
import jsQR from "jsqr";
import {$$} from '../tools';

@Component({
  selector: 'app-scanner',
  templateUrl: './scanner.component.html',
  styleUrls: ['./scanner.component.sass']
})
export class ScannerComponent implements OnInit,OnDestroy {

  @Input("size") size=300;
  @Input("filter") filter="";
  @Output('flash') onflash: EventEmitter<any>=new EventEmitter();

  private trigger: Subject<void> = new Subject<void>();
  private nextWebcam: Subject<boolean|string> = new Subject<boolean|string>();
  handle:any;

  constructor() { }

  ngOnInit() {
    this.handle=setInterval(()=>{
      this.trigger.next();
    },250);
  }

  public get triggerObservable(): Observable<void> {
    return this.trigger.asObservable();
  }

  public get nextWebcamObservable(): Observable<boolean|string> {
    return this.nextWebcam.asObservable();
  }

  stopScanner(){
    clearInterval(this.handle);
  }

  handleImage(event: any) {
    var rc=event.imageData;
    var decoded =jsQR(rc.data,rc.width,rc.height);
    if(decoded!=null && decoded.data!=null && (this.filter.length==0 || decoded.data.indexOf(this.filter)>-1)){
      this.onflash.emit({data:decoded.data});
    }
  }

  ngOnDestroy(): void {
    this.stopScanner();
  }

}
