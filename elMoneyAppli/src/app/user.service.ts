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
    if(!this.addr || this.addr.length<10 || this.addr=="null"){
      this.addr=null;
      $$("Pas de compte disponible sur le device");
      return false;
    }
    $$("Chargement de compte ok depuis le device, adresse de l'utilisateur "+this.addr);

    if(localStorage.getItem("contacts"))this.contacts=JSON.parse(localStorage.getItem("contacts"));
    if(localStorage.getItem("email"))this.email=localStorage.getItem("email");
    if(localStorage.getItem("pem"))this.pem=JSON.parse(localStorage.getItem("pem"));

    $$("Chargement du fichier PEM=",this.pem);

    return true;
  }





  refresh_balance(func=null,func_error=null){
    if(!this.addr || this.addr.length<10 || this.addr=="null"){
      $$("Refresh de la balance annulé pour address non conforme");
      return false;
    }

    $$("Balance("+this.addr+")");
    this.api.balance(this.addr).subscribe((r:any)=>{
      $$("Récupération de la balance : ",r);
      if(r.hasOwnProperty("error")){
        func_error(r);
      } else {
        this.balance=r.balance;
          this.gas=Number(r.gas);
          this.unity=r.name;
          if(func)func(r);
      }
        },(err)=>{
          $$("!Erreur de récupération de la balance pour "+this.addr);
          this.balance=0;
          this.unity="";
          if(func_error)func_error(err.error);
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
    if(email.indexOf("@")==-1 && !email.startsWith("erd"))return;
    if((!pseudo || pseudo.length==0) && email.indexOf("@")>-1)pseudo=email.split("@")[0].split(".")[0];
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


  create_new_account(func,func_error){
    $$("Création d'un nouveau compte");
    this.api._get("new_account/").subscribe((r:any)=> {
      if (r.pem.length > 0) {
        $$("Initialisation du userService avec le fichier PEM correct");
        func(r)
      }
    },(err)=>{
      func_error(err);
      $$("!Impossible de créer le compte");
    });
  }


  init(addr: string,pem:any=null,func=null,func_error=null) {
    $$("Initialisation de l'utilisateur avec ",addr);
    if(!addr)addr=localStorage.getItem("addr");
    if(!addr) {
      this.create_new_account((r)=>{
        this.init(r.address, {pem:r.pem},func,func_error);},
        ()=>{$$("Probleme de fabrication du nouveau compte")});
    } else {
      $$("Initialisation de l'utilisateur à l'adresse ",addr);

      this.addr=addr;
      this.pem=pem;
      this.saveOnDevice();
      this.refresh_balance(func,func_error);
    }

  }



  reset() {
    localStorage.removeItem("addr");
    localStorage.removeItem("contacts");
    localStorage.removeItem("email");
    localStorage.removeItem("pem");
    window.location.href=environment.domain_appli;
  }
}
