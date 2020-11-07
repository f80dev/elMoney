import { Component, OnInit } from '@angular/core';
import {Router} from "@angular/router";
import {ApiService} from "../api.service";
import {ConfigService} from "../config.service";
import {showError, showMessage, subscribe_socket} from "../tools";
import {MatSnackBar} from "@angular/material/snack-bar";
import {Socket} from "ngx-socket-io";
import {UserService} from "../user.service";

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.sass']
})
export class MainComponent implements OnInit {
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
              public user:UserService,
              public api:ApiService,
              public config:ConfigService) {

  }


  refresh(){

    this.friends=[];
    for(let c of this.user.contacts){
      this.friends.push({label:c.pseudo,icon:"person",email:c.email})
    }

    this.friends.push({label:"Nouveau",icon:"person_add",email:"new"})

    if(this.user.addr){
      if(this.api.contract){
        this.api.balance(this.user.addr).subscribe((r:any)=>{
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
        this.user.init(r.addr)
        this.user.pem=btoa(r.pem);
        this.refresh();
      })
    }
  }



  ngOnInit(): void {
    subscribe_socket(this,"refresh_account",()=>{this.refresh();})
    setTimeout(()=>{
      this.refresh();
    },1000);
  }




  informe_clipboard() {
    showMessage(this,"Adresse dans le presse papier")
  }



  addInHand(value: number) {
    this.hand=this.hand+value;
    this.solde=this.solde-value;
  }

  send_to(contact: any) {
    if(contact.email=="new")
      this.router.navigate(["contacts"]);
    else {
      this.api._post("transfer/" + this.api.contract + "/" + contact.email + "/" + this.hand+"/"+this.config.unity+"/", "", this.user.pem).subscribe((r: any) => {
        this.hand=0;
        showMessage(this,"Fonds transférés");
      });
    }

  }
}
