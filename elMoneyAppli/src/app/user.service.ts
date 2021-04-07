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
  moneys=[];
  selected_money="";
  gas: number=0;

  pseudo: any="";
  description:any;
  website:any;
  visual:any;
  shop_visual:string="";
  shop_name:string="";
  shop_description: string="";
  shop_website: string="";

  constructor(public api:ApiService,
              public socket:Socket,
              public config:ConfigService) {
    subscribe_socket(this,"refresh_account",()=>{this.refresh_balance();})
    if(localStorage.getItem("contacts"))this.contacts=JSON.parse(localStorage.getItem("contacts"));
  };


  isDealer(){
    for(let d of this.config.dealers){
      if(d.address==this.addr)
        return true;
    }
    return false;
  }





  loadFromDevice(){
    if(!this.addr)this.addr=localStorage.getItem("addr");
    if(!this.addr || this.addr.length<10 || this.addr=="null"){
      this.addr=null;
      $$("Pas de compte disponible sur le device");
      return false;
    }
    $$("Chargement de compte ok depuis le device, adresse de l'utilisateur "+this.addr);
    return true;
  }


  save_user(){
    let body={
      addr:this.addr,
      contacts:this.contacts,
      description:this.description,
      pseudo:this.pseudo,
      visual:this.visual,
      shop_visual:this.shop_visual,
      shop_name:this.shop_name,
      shop_description:this.shop_description,
      shop_website:this.shop_website,
      pem:this.pem
    };

    this.api._post("users/","",body).subscribe((id:any)=>{
      $$("Enregistrement de l'utilisateur");
    })

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
        if(func_error)func_error(r);
      } else {
        this.moneys=r;
        this.gas=r.egld.balance;
        if(func)func(r);
      }
    },(err)=>{
      $$("!Erreur de récupération de la balance pour "+this.addr);
      this.moneys=[];
      if(func_error)
        func_error(err.error);
      else
      if(func)func();
    });
    return true;
  }


  add_contact(email: string,pseudo=null) {
    if(email.indexOf("@")==-1 && (!email.startsWith("erd") || !pseudo))return;

    if((!pseudo || pseudo.length==0) && email.indexOf("@")>-1)pseudo=email.split("@")[0].split(".")[0];
    for(let c of this.contacts){
      if(c.email==email)return false;
    }
    this.contacts.push({pseudo:pseudo,email:email});
    this.save_user();
  }

  del_contact(email: any) {
    for(let c of this.contacts){
      if(c.email==email)
        this.contacts.splice(this.contacts.indexOf(c),1);
    }
    this.save_user();
  }


  create_new_account(func,func_error){
    $$("Création d'un nouveau compte");
    this.api._get("new_account/","",120).subscribe((r:any)=> {
      this.api.set_tokenIdentifier(r["default_money"])
      if (r.pem.length > 0) {
        $$("Initialisation du userService avec le fichier PEM correct");
        func(r)
      }
    },(err)=>{
      func_error(err);
      $$("!Impossible de créer le compte");
    });
  }


  init(addr: string,pem:any=null,func=null,func_error=null,vm=null) {
    $$("Initialisation de l'utilisateur avec ",addr);
    if(!addr)addr=localStorage.getItem("addr");
    if(!addr) {
      if(vm)vm.message="Ouverture d'un nouveau compte sur le "+this.config.server.network+". Cela prendra moins de 1 minute, le temps de créditer quelques eGold pour les transactions et quelques 'TFC', la monnaie par défaut de l'application";
      this.create_new_account((r)=>{
          if(vm)vm.message="";
          this.init(r.address, {pem:r.pem},func,func_error);},
        ()=>{
          $$("Probleme de fabrication du nouveau compte")
          func_error();
        });
    } else {
      $$("Initialisation de l'utilisateur à l'adresse ",addr);

      if(this.config.hasESDT()){
        if(this.selected_money.length==0)this.selected_money=this.api.tokenIdentifier;
        this.refresh_balance(func,func_error);
      }

      this.addr=addr;
      $$("Enregistrement de "+this.addr+" sur le device");
      localStorage.setItem("addr",this.addr);
      this.visual=environment.domain_appli+"/assets/img/anonymous.jpg";
      this.shop_visual=environment.domain_appli+"/assets/img/shop.png";
      this.pem=pem;

      $$("Chargement de l'utilisateur");
      this.api._get("users/"+this.addr).subscribe((body:any)=>{
        this.contacts=body.contacts;
        this.pseudo=body.pseudo
        this.visual=body.visual;
        this.description=body.description;
        this.shop_name=body.shop_name;
        this.shop_visual=body.shop_visual;
        this.pem=body.pem;
        func(body);
      },(err)=>{
        if(err.status==404) {
          $$("Impossible de charger l'user");
          this.save_user();
        }
        if(func_error)func_error();
      });

    }

  }



  reset() {
    localStorage.removeItem("addr");
    localStorage.removeItem("contacts");
    localStorage.removeItem("email");
    localStorage.removeItem("pem");
    localStorage.removeItem("contract")
    localStorage.removeItem("last_to");
    localStorage.removeItem("last_amount");
    localStorage.removeItem("last_screen");
    window.location.href=environment.domain_appli;
    window.location.reload();
  }

  get_gas() {
    this.api._get("gas/"+this.addr).subscribe((r:any)=>{
      this.gas=r;
    })
  }

  new_dealer(func:Function,func_error:Function=null) {
    let body={
      pem:this.pem,
      shop:{
        description:this.shop_description,
        name:this.shop_name,
        website:this.shop_website,
        visual: this.shop_visual,
      },
      pseudo:this.pseudo,
      addr:this.addr
    }
    this.api._post("new_dealer/","",body).subscribe((r:any)=>{
      this.config.refresh_dealers();
      func();
    },()=>{
      $$("Probleme de création du distributeur");
      if(func_error)func_error();
    });
  }
}
