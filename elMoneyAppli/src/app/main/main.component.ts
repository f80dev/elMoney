import { Component, OnInit } from '@angular/core';
import {Router} from "@angular/router";
import {ApiService} from "../api.service";
import {ConfigService} from "../config.service";

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.sass']
})
export class MainComponent implements OnInit {
  addr: any;
  solde:any;
  name:string;
  url_explorer: string="";

  constructor(public router:Router,public api:ApiService,public config:ConfigService) { }

  ngOnInit(): void {
    this.addr=localStorage.getItem("addr");
    if(this.addr){
      this.url_explorer="https://testnet-explorer.elrond.com/address/"+this.addr;
      if(this.api.contract){
        this.api.balance(this.addr).subscribe((r:any)=>{
          this.solde=r;
        });
      }
    }
  }

}
