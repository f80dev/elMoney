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
  @Input("fontsize") fontsize="medium";
  @Output('cancel') oncancel: EventEmitter<any>=new EventEmitter();
  @Input("marginTop") marginTop="0px";
  pos=0;
  showMessage="";
  showTips="";

  constructor(public router:Router) { }

  ngOnInit() {
    if(this.long_message.length>0){
      this.read_message();
    }

    if(this.tips.length>0){
      this.showTips=this.tips[Math.random()*this.tips.length];
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
