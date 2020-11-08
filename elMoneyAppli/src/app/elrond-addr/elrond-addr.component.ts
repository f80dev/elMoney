import {Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'app-elrond-addr',
  templateUrl: './elrond-addr.component.html',
  styleUrls: ['./elrond-addr.component.sass']
})
export class ElrondAddrComponent implements OnInit {
  @Input("addr") addr: any;
  @Input("label") label="";
  @Input("type") _type="contract";
  url: string="";


  constructor() { }

  ngOnInit(): void {
    this.url="https://testnet-explorer.elrond.com/"+this._type+"/"+this.addr;
  }

}
