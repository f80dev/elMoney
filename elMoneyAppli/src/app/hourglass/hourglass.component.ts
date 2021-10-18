import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Router} from "@angular/router";

@Component({
  selector: 'app-hourglass',
  templateUrl: './hourglass.component.html',
  styleUrls: ['./hourglass.component.sass']
})
export class HourglassComponent implements OnInit {

  @Input("diameter") diameter=18;
  @Input("message") message="";
  @Input("long_message") long_message="";
  @Input("anim") src="";
  @Input("tips") tips=[];
  @Input("canCancel") canCancel=false;
  @Input("maxwidth") maxwidth="100vw";
  @Input("faq") faq="";
  @Input("duration") duration=0;
  @Input("fontsize") fontsize="medium";
  @Output('cancel') oncancel: EventEmitter<any>=new EventEmitter();
  @Input("marginTop") marginTop="0px";
  pos=0;
  showMessage="";
  showTips="";
  current=0;
  step=0;

  constructor(public router:Router) { }

  ngOnInit() {
    if(this.long_message.length>0){
      this.read_message();
    }

    if(this.tips.length>0){
      this.showTips=this.tips[Math.random()*this.tips.length];
    }

    if(this.duration>0){
      this.current=0;
      this.step=100/this.duration;
      this.decompte(0);
    }
  }

  handle=0;
  decompte(current){
    if(current>=100){
      this.current=0;
      this.duration=0;
      clearTimeout(this.handle);
    } else {
      this.current=current;
      this.handle=setTimeout(()=>{
        this.decompte(current+this.step);
        },1000);
    }

  }

  read_message(){
    if(this.pos<this.long_message.split("/").length){
      this.showMessage=this.long_message[this.pos];
      setTimeout(()=> {
        this.pos=this.pos+1;
        this.read_message();
      },1000);
    } else {
      this.showMessage="";
    }
  }



  openfaq() {
    this.router.navigate(["faq"],{queryParams:{open:this.faq}});
  }

}
