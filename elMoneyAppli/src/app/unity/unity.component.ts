import {Component, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {ConfigService} from "../config.service";
import {$$} from "../tools";

@Component({
  selector: 'app-unity',
  templateUrl: './unity.component.html',
  styleUrls: ['./unity.component.sass']
})
export class UnityComponent implements OnChanges {

  @Input("value") value:number;
  @Input("showUnity") showUnity=true;
  @Input("noswap") noswap=false;
  @Input("unity") base: string = "eGld";
  @Input("decimals") decimals=3;

  @Input("fontsize") fontsize="medium";
  @Input("fontsize_unity") fontsize_unity="small";
  showValue: number;
  unity:string="egld";
  message: string="";

  constructor(public config:ConfigService) {

  }

  refresh(){
    if(localStorage.getItem("unity")=="fiat" && this.base.toLowerCase()=="egld"){
      this.message=">$";
      this.config.get_price(this.unity,(convert)=>{
        this.unity=this.config.fiat_unity;
        this.showValue=this.value*convert;
        this.message="";
      });
    } else {
      this.showValue=this.value;
      this.unity=this.base;
    }
  }

  switch_fiat() {
    if(this.base.toLowerCase()!="egld" || this.noswap)return;
    $$("Changement d'unité");
    let actual=localStorage.getItem("unity");
    if(!actual || actual=="fiat"){
      localStorage.setItem("unity",this.base);
    }
    else{
      localStorage.setItem("unity","fiat");
    }
    this.refresh();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(this.value>10 && this.decimals>2)this.decimals=2;
    if(this.value>100 && this.decimals>1)this.decimals=1;
    if(this.value>10000 && this.decimals>1)this.decimals=0;
    this.unity=this.base;
    this.refresh();
  }
}
