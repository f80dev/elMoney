import { Component, OnInit } from '@angular/core';
import {Router} from "@angular/router";
import {ApiService} from "../api.service";
import {ConfigService} from "../config.service";
import {showMessage, subscribe_socket} from "../tools";
import {MatSnackBar} from "@angular/material/snack-bar";
import {Socket} from "ngx-socket-io";

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.sass']
})
export class MainComponent implements OnInit {
  addr: any;
  solde:any;
  url_explorer: string="";
  showQRCode: boolean=false;
  friends=[];
  buttons=[
    {value:10},{value:5},{value:2},{value:1}
  ]
  hand:number=0;

  constructor(public router:Router,
              public toast:MatSnackBar,
              public socket:Socket,
              public api:ApiService,
              public config:ConfigService) { }

  refresh(){
    this.addr=localStorage.getItem("addr");
    if(this.addr){
      if(this.api.contract){
        this.api.balance(this.addr).subscribe((r:any)=>{
          this.solde=r.balance;
          this.config.unity=r.name;
        },(err)=>{
          showMessage(this,this.config.values?.messages.nomoney);
          localStorage.removeItem("contract");
          this.router.navigate(["moneys"]);
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
    subscribe_socket(this,"refresh_account",()=>{this.refresh();})
    setTimeout(()=>{
      this.refresh();
      this.api._get("friends/"+this.addr+"/").subscribe((r:any)=>{
        this.friends=r;
      })
    },1000);

  }

  informe_clipboard() {
    showMessage(this,"Adresse dans le presse papier")
  }

  addInHand(value: number) {
    this.hand=this.hand+value;
    this.solde=this.solde-value;
  }
}
