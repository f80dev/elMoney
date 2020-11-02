import { Component } from '@angular/core';
import {ConfigService} from "./config.service";
import {ApiService} from "./api.service";
import {ActivatedRoute} from "@angular/router";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass']
})
export class AppComponent {
  title = 'elMoneyAppli';

  constructor(public config: ConfigService,
              public routes:ActivatedRoute,
              public api:ApiService){
    let contract=this.routes.snapshot.queryParamMap.get("contract");

    let addr=this.routes.snapshot.queryParamMap.get("addr");
    if(contract)this.api.contract=contract;
    if(addr)localStorage.setItem("addr",addr);
    this.api._get("/name/"+this.api.contract).subscribe((r:any)=>{
      this.config.unity=r.name;
    })
  }

}
