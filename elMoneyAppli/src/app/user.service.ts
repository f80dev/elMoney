import { Injectable } from '@angular/core';
import {ApiService} from "./api.service";
import {environment} from "../environments/environment";
import {$$, showError, showMessage, subscribe_socket} from "./tools";
import {ConfigService} from "./config.service";
import {Socket} from "ngx-socket-io";
import {MatDialog} from "@angular/material/dialog";
import {PromptComponent} from "./prompt/prompt.component";
import {PrivateComponent} from "./private/private.component";
import {AuthentComponent} from "./authent/authent.component";
import {Location} from "@angular/common";

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
  dealer: any=null;
  identity: string="";

  constructor(public api:ApiService,
              public socket:Socket,
              public dialog:MatDialog,
              public _location:Location,
              public config:ConfigService) {
    subscribe_socket(this,"refresh_account",()=>{this.refresh_balance();})
  };


  isDealer(){
    for(let d of this.config.dealers){
      if(d.address==this.addr){
        this.dealer=d;
        return true;
      }
    }
    this.dealer=null;
    return false;
  }




  // loadFromDevice(){
  //   if(!this.addr)this.addr=localStorage.getItem("addr");
  //   if(!this.addr || this.addr.length<10 || this.addr=="null"){
  //     this.addr=null;
  //     $$("Pas de compte disponible sur le device");
  //     return false;
  //   }
  //   $$("Chargement de compte ok depuis le device, adresse de l'utilisateur "+this.addr);
  //   return true;
  // }




  save_user(func=null){
    if(this.pem){
      let body={
        addr:this.addr,
        contacts:this.contacts,
        description:this.description,
        pseudo:this.pseudo,
        visual:this.visual,
        website:this.website,
        identity:this.identity,
        shop_visual:this.shop_visual,
        shop_name:this.shop_name,
        shop_description:this.shop_description,
        email:this.email,
        shop_website:this.shop_website,
        pem:this.pem
      };

      this.api._post("users/","",body).subscribe((id:any)=>{
        $$("Enregistrement de l'utilisateur");
        if(func)func();
      });
    }else {
      $$("Impossible d'enregistrer");
    }


  }



  refresh_balance(func=null,func_error=null){
    if(!this.addr || this.addr.length<10 || this.addr=="null"){
      $$("Refresh de la balance annulé pour address non conforme");
      if(func_error)func_error();
      return;
    }

    $$("Balance("+this.addr+")");
    this.api.balance(this.addr).subscribe((r:any)=>{
      $$("Récupération de la balance : ",r);
      if(r.hasOwnProperty("error")){
        if(func_error)func_error(r);
      } else {
        this.moneys=r;
        this.gas=r['EGLD'].balance;
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


  add_contact(email: string) {
    this.api._post("contacts","",{email:email}).subscribe((r:any)=>{

    })
  }



  del_contact(email: any) {
    for(let c of this.contacts){
      if(c.email==email)
        this.contacts.splice(this.contacts.indexOf(c),1);
    }
    this.save_user();
  }



  init(addr:string=null,func=null,func_error=null) {
    addr=addr || this.addr;
    this.addr=addr;
    if(addr && addr!="null"){
      localStorage.setItem("addr",addr);
    }

    if(this.config.hasESDT()){
      if(this.selected_money.length==0)this.selected_money=this.api.identifier;
      this.refresh_balance(func,func_error);
    }

    $$("Chargement de l'utilisateur "+this.addr);
    this.api._get("users/"+this.addr).subscribe((body:any)=>{
      $$("Récupération de ",body);
      body=body[0];
      this.contacts=body.contacts || [];
      this.pseudo=body.pseudo || "";
      this.visual=body.visual || "/assets/img/anonymous.jpg";
      this.identity=body.identity || "";
      this.description=body.description || "";
      this.shop_name=body.shop_name || "";
      this.shop_description=body.shop_description || "";
      this.shop_website=body.shop_website || "";
      this.email=body.email || "";
      this.website=body.website || "";
      this.shop_visual=body.shop_visual || "/assets/img/shop.png";
      if(func)func(body);
    },(err)=>{
      if(err.status==404) {
        $$("Impossible de charger l'user");
        this.save_user();
        func();
      } else
      if(func_error)func_error();
    });


  }



  reset(reload=true) {
    this.addr=null;
    this.email=null;
    localStorage.removeItem("addr");
    localStorage.removeItem("contacts");
    localStorage.removeItem("email");
    localStorage.removeItem("pem");
    localStorage.removeItem("contract")
    localStorage.removeItem("last_to");
    localStorage.removeItem("last_amount");
    localStorage.removeItem("last_screen");
    if(reload){
      this._location.go("/");
      window.location.reload();
    }
  }

  get_gas() {
    this.api._get("gas/"+this.addr).subscribe((r:any)=>{
      this.gas=r;
    })
  }

  new_dealer(func:Function,func_error:Function=null) {
    this.api._post("new_dealer/","",{pem:this.pem}).subscribe((r:any)=>{
      setTimeout(()=>{
        this.config.refresh_dealers();
        func();
      },1000);
    },()=>{
      $$("Probleme de création du distributeur");
      if(func_error)func_error();
    });
  }


  check_email(func,func_abort=null,title=null,redirect=null){
    title=title || "Authentification requise";
    if(!this.addr || this.addr=="null")this.addr=localStorage.getItem("addr");
    if(this.addr && this.addr.length>20){
      if(func)func();
    }else{
      this.dialog.open(AuthentComponent,{width: '350px',height:"500px",data:
          {
            title: title,
            redirect:redirect
          }
      }).afterClosed().subscribe((result:any) => {
        if(result){
          this.email=result.email;
          this.init(result.addr,()=>{
            // $$("Enregistrement de "+this.email+" sur le device");
            // localStorage.setItem("email",this.email);
            this.refresh_balance(func);
          });
        } else {
          if(func_abort){
            if(typeof(func_abort)=="object") {
              func_abort.navigate(["store"]);
            }else{
              func_abort();
            }
          }
        }

      });
    }
  }



  check_pem(func,vm=null,title=null,func_abort=null) {
    this.check_email(()=>{
      title=title || "Cette opération doit être signée";
      if(!this.pem)this.pem=localStorage.getItem("pem");
      if(this.pem && this.pem.length>0){
        if(func)func();
      } else {
        this.dialog.open(PrivateComponent,{width: '300px',height:"fit-content",data:
            {
              canChange:false,
              title: title,
            }
        }).afterClosed().subscribe((result:any) => {
          if(result){
            if(this.addr && this.addr!=result.addr){
              localStorage.removeItem("pem");
              showMessage(vm,"cette clé ne correspond pas au compte, si vous souhaitez vraiment l'utiliser vous devez préalablement vous déconnecter");
              if(func_abort)func_abort();
            } else {
              if(!this.addr)this.init(result.addr);
              this.pem=result.pem;
              if(func)func();
            }
          } else {
            if(func_abort)func_abort("annulation");
          }
        });
      }
    },func_abort);
  }

  logout(title="Veuillez indiquer votre clé",func_deconnect=null,func_cancel=null,height="fit-contain",reload=true) {
    this.dialog.open(PromptComponent,{width: '350px',height:height,data:
        {
          title: "Confirmez la deconnexion ?",
          onlyConfirm:true,
          lbl_ok:"Ok",
          lbl_cancel:"Annuler"
        }
    }).afterClosed().subscribe((result:any) => {
      if(result){
        this.reset(reload);
        if(func_deconnect)func_deconnect();
      } else {
        if(func_cancel)func_cancel();
      }
    });
  }

  remove_account() {
    return this.api._delete("users/"+this.addr+"/");
  }

  isCreator() {
    return (this.pseudo.length>0 && this.email.length>0);
  }
}
