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

  refresh(){
    this.addr=localStorage.getItem("addr");
    if(this.addr){
      this.url_explorer="https://testnet-explorer.elrond.com/address/"+this.addr;
      if(this.api.contract){
        this.api.balance(this.addr).subscribe((r:any)=>{
          this.solde=r;
        });
      }
    } else {
      this.api._get("new_account/").subscribe((r:any)=>{
        localStorage.setItem("addr",r.addr);
        this.addr=r.addr;
        this.config.pem=btoa(r.pem);
        this.refresh();
      })
    }
  }

  ngOnInit(): void {
    this.refresh();
  }

}
