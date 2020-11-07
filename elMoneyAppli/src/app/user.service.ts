import { Injectable } from '@angular/core';
import {ApiService} from "./api.service";

@Injectable({
  providedIn: 'root'
})
export class UserService {
  contacts:any[]=[];
  email:string="";
  addr:string="";
  pem:string="";

  constructor(public api:ApiService) { };

  loadFromDevice(){
    if(localStorage.getItem("addr"))this.addr=localStorage.getItem("addr");
    if(localStorage.getItem("contacts"))this.contacts=JSON.parse(localStorage.getItem("contacts"));
    if(localStorage.getItem("email"))this.email=localStorage.getItem("email");
    if(localStorage.getItem("pem"))this.pem=localStorage.getItem("pem");
    return(this.addr.length>0);
  }

  saveOnDevice(){
    localStorage.setItem("contacts",JSON.stringify(this.contacts));
    localStorage.setItem("email",this.email);
    localStorage.setItem("addr",this.addr);
    localStorage.setItem("pem",this.pem);
  }

  add_contact(email: string) {
    let pseudo=email.split("@")[0].split(".")[0];
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

  init(addr: string) {
    this.addr=addr;
    this.saveOnDevice();
  }

  reset() {
    debugger
    localStorage.removeItem("addr");
    localStorage.removeItem("contacts");
    localStorage.removeItem("email");
    localStorage.removeItem("pem");
    window.location.reload();
  }
}
