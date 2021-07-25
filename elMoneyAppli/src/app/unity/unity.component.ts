import {Component, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {ConfigService} from "../config.service";

@Component({
  selector: 'app-unity',
  templateUrl: './unity.component.html',
  styleUrls: ['./unity.component.sass']
})
export class UnityComponent implements OnChanges {

    @Input("value") value:number;
    @Input("unity") showUnity=true;
    @Input("decimals") decimals=3;
    unity: string = "eGld";
    @Input("fontsize") fontsize="medium";
    @Input("fontsize_unity") fontsize_unity="small";
   showValue: number;

  constructor(public config:ConfigService) {

  }

  refresh(){
      if(localStorage.getItem("unity")=="fiat"){
        this.config.get_price(()=>{
          this.unity=this.config.fiat_unity;
          this.showValue=this.value*this.config.egold_price;
          });
    } else {
      this.showValue=this.value;
      this.unity=this.config.egold_unity;
    }
  }

  switch_fiat() {
    let actual=localStorage.getItem("unity");
    if(!actual || actual=="fiat"){
      localStorage.setItem("unity","crypto");
      this.unity=this.config.egold_unity;
    }
    else{
      localStorage.setItem("unity","fiat");
    }

    this.refresh();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(this.value>10 && this.decimals>2)this.decimals=2;
    if(this.value>200 && this.decimals>1)this.decimals=1;
    this.refresh();
  }
}
