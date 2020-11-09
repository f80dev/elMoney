import { Injectable } from '@angular/core';
import {ApiService} from "./api.service";
import {environment} from "../environments/environment";
import {$$} from "./tools";

@Injectable({
  providedIn: 'root'
})
export class UserService {
  contacts:any[]=[];
  email:string="";
  addr:string="";
  pem:string="";
  last_contact="";
  gas: number=0;

  constructor(public api:ApiService) { };

  loadFromDevice(){
    if(localStorage.getItem("addr"))this.addr=localStorage.getItem("addr");
    if(this.addr.length==0)return false;

    if(localStorage.getItem("contacts"))this.contacts=JSON.parse(localStorage.getItem("contacts"));
    if(localStorage.getItem("email"))this.email=localStorage.getItem("email");
    if(localStorage.getItem("pem"))this.pem=JSON.parse(localStorage.getItem("pem"));
    return true;
  }

  saveOnDevice(){
    $$("Enregistrement de "+this.addr+" sur le device");
    localStorage.setItem("contacts",JSON.stringify(this.contacts));
    localStorage.setItem("email",this.email);
    localStorage.setItem("addr",this.addr);
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
  }



  reset() {
    localStorage.removeItem("addr");
    localStorage.removeItem("contacts");
    localStorage.removeItem("email");
    localStorage.removeItem("pem");
    window.location.href=environment.domain_appli;
  }
}
