import { Injectable } from '@angular/core';
import {ApiService} from "./api.service";
import {environment} from "../environments/environment";
import {$$, showError, showMessage, subscribe_socket} from "./tools";
import {ConfigService} from "./config.service";
import {Socket} from "ngx-socket-io";

@Injectable({
  providedIn: 'root'
})
export class UserService {
  contacts:any[]=[];
  email:string="";
  addr:string="";
  pem:string="";
  last_contact="";
  balance:number=0;
  gas: number=0;
  unity: string="";

  constructor(public api:ApiService,
              public socket:Socket,
              public config:ConfigService) {
    subscribe_socket(this,"refresh_account",()=>{this.refresh_balance();})
  };

  loadFromDevice(){
    if(localStorage.getItem("addr"))this.addr=localStorage.getItem("addr");
    if(!this.addr || this.addr.length==0 || this.addr=="null")return false;

    if(localStorage.getItem("contacts"))this.contacts=JSON.parse(localStorage.getItem("contacts"));
    if(localStorage.getItem("email"))this.email=localStorage.getItem("email");
    if(localStorage.getItem("pem"))this.pem=JSON.parse(localStorage.getItem("pem"));
    return true;
  }


  refresh_balance(func=null,func_error=null){
    $$("Refresh de la balance")
    if(!this.addr || this.addr.length==0)return false;
    this.api.balance(this.addr).subscribe((r:any)=>{
          this.balance=r.balance;
          this.gas=r.gas;
          this.unity=r.name;
          if(func)func();
        },(err)=>{
          showError(this,"problème technique");
          //showMessage(this,this.config.values?.messages.nomoney);
          if(func_error)func_error();
        });
    return true;
  }

  saveOnDevice(){
    $$("Enregistrement de "+this.addr+" sur le device");
    localStorage.setItem("contacts",JSON.stringify(this.contacts));
    localStorage.setItem("email",this.email);
    if(this.addr)localStorage.setItem("addr",this.addr);
    localStorage.setItem("pem",JSON.stringify(this.pem));
  }

  add_contact(email: string,pseudo=null) {
    if(email.indexOf("@")==-1)return;
    if(!pseudo)pseudo=email.split("@")[0].split(".")[0];
    for(let c of this.contacts){
      if(c.email==email)return false;
    }
    this.contacts.push({pseudo:pseudo,email:email});
    this.saveOnDevice();
  }

  del_contact(email: any) {
    for(let c of this.contacts){
      if(c.email==email)
        this.contacts.splice(this.contacts.indexOf(c),1);
    }
  }

  init(addr: string,pem:any=null) {
    $$("Initialisation de l'utilisateur "+addr);
    this.addr=addr;
    this.pem=pem;
    this.saveOnDevice();
    this.refresh_balance();
  }



  reset() {
    localStorage.removeItem("addr");
    localStorage.removeItem("contacts");
    localStorage.removeItem("email");
    localStorage.removeItem("pem");
    window.location.href=environment.domain_appli;
  }
}
