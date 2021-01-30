import {Component, Input, OnInit} from '@angular/core';
import {ConfigService} from "../config.service";

@Component({
  selector: 'app-elrond-addr',
  templateUrl: './elrond-addr.component.html',
  styleUrls: ['./elrond-addr.component.sass']
})
export class ElrondAddrComponent implements OnInit {
  @Input("addr") addr: any;
  @Input("label") label="Explorer";
  @Input("type") _type="contract";
  url: string="";


  constructor(public config:ConfigService) { }

  ngOnInit(): void {
    if(this.config.server){
      this.url=this.config.server.explorer+"/"+this._type+"/"+this.addr;
    }
    else{
      this.url=this.addr;
    }

  }

}
