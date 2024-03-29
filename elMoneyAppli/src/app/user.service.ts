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
import {stringify} from "@angular/compiler/src/util";

@Injectable({
  providedIn: 'root'
})
export class UserService {
  public contacts:any[]=[];

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
  accept_all_dealers: boolean=true;
  public_email: string="";
  transaction_delay=0;
  shard: any=0;
  authent=0;


  constructor(public api:ApiService,
              public socket:Socket,
              public dialog:MatDialog,
              public _location:Location,
              public config:ConfigService) {

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



  save_user(func=null,func_error=null){
    let contacts_addr=[];
    for(let c of this.contacts)
      contacts_addr.push(c["addr"])

    if(this.pem){
      let body={
        addr:this.addr,
        contacts:contacts_addr,
        description:this.description,
        pseudo:this.pseudo,
        visual:this.visual,
        website:this.website,
        identity:this.identity,
        accept_all_dealers:this.accept_all_dealers,
        shop_visual:this.shop_visual,
        shop_name:this.shop_name,
        shop_description:this.shop_description,
        email:this.email,
        public_email:this.public_email,
        shop_website:this.shop_website,
        pem:this.pem,
        authent:this.authent.toString(),
      };

      this.api._post("users/","",body).subscribe((id:any)=>{
        $$("Enregistrement de l'utilisateur ",body);
        if(func)func();
      },()=>{
        if(func_error)func_error();
      });
    }else {
      $$("Impossible d'enregistrer");
    }


  }



  refresh_balance(func=null,func_error=null,force=false){
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


  add_contact(email:string,func:Function=null,func_error) {
    this.api._post("contacts/","",{email:email,pem:this.pem,addr:this.addr}).subscribe((r:any)=>{
      if(func)func(r);
    },func_error);
  }



  del_contact(email: any,func=null) {
    this.contacts.splice(this.contacts.indexOf(email),1);
    this.save_user();
  }



  init(addr:string=null,func=null,func_error=null) {
    addr=addr || this.addr;
    this.addr=addr;
    if(addr && addr!="null")localStorage.setItem("addr",addr);

    $$("Chargement de l'utilisateur "+this.addr);
    this.api._get("users/"+this.addr).subscribe((body:any)=>{
      $$("Récupération de ",body);
      body=body[0];
      //this.contacts_addr=body.contacts || [];
      this.pseudo=body.pseudo || "";
      this.visual=body.visual || "";
      this.transaction_delay=body.transaction_delay || 35;
      this.shard=body.shard;
      this.identity=body.identity || "";
      this.description=body.description || "";
      this.accept_all_dealers=(body.accept_all_dealers==1)
      this.shop_name=body.shop_name || "";
      this.shop_description=body.shop_description || "";
      this.shop_website=body.shop_website || "";
      this.public_email=body.public_email || "";
      this.email=body.email || "";
      this.website=body.website || "";
      this.shop_visual=body.shop_visual || "";
      this.authent=body.authent || 0;

      if(this.selected_money.length==0)this.selected_money=this.api.identifier;
      //this.refresh_balance(func,func_error);

      if(func)func(body);
    },(err)=>{
      if(err.status==404) {
        this.save_user();
        func();
      } else {
        showError(this,err);
        if(func_error)func_error();
      }

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

  isAdmin(){
    return (this.email=="hhoareau@gmail.com");
  }

  //Vérification que l'utilisateur est authentifié
  check_email(func,func_abort=null,title=null,redirect=null,force_init=false){
    title=title || "Authentification requise";
    if(!this.addr || this.addr=="null")this.addr=localStorage.getItem("addr");
    if(this.addr && this.addr.length>20){
      if(force_init){
        this.init(this.addr,()=>{
          this.refresh_balance(func);
          return;
        });
      } else {
        this.refresh_balance(func);
        return;
      }
    }

    else{
      this.dialog.open(AuthentComponent,{
        backdropClass:'removeBackground',
        width: '95%',height:"auto",maxWidth:'400px',data:
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
            this.refresh_balance(func);return;
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
        if(func){func();return;}
      } else {
        this.dialog.open(PrivateComponent,{
          backdropClass:'removeBackground',
          width: '330px',height:"fit-content",data:
            {
              canChange:false,
              title: title,
            }
        }).afterClosed().subscribe((result:any) => {
          if(result){
            if(this.addr && this.addr!=result.addr){
              localStorage.removeItem("pem");
              showMessage(vm,"cette signature ne correspond pas au compte, si vous souhaitez vraiment l'utiliser vous devez préalablement vous déconnecter");
              if(func_abort)func_abort();
            } else {
              if(!this.addr)this.init(result.addr);
              this.pem=result.pem;

              if(vm && vm.user && vm.user.gas==0){
                showMessage(vm,"Vous devez acheter quelques eGolds pour effectuer des transactions sur le réseau");
                func();
                return;
              }

              if(func)func();
            }
          } else {
            if(func_abort)
              func_abort("annulation");
            else{
              if(vm.router)vm.router.navigate(["store"]);
            }
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
    return (this.pseudo.length>0 && this.public_email.length>0);
  }

  load_contacts(func=null,func_error=null) {
      this.api._get("contacts/"+this.addr+"/","").subscribe((r:any)=>{
        this.contacts=[];
        for(let c of r){
          this.contacts.push({
            pseudo:c.pseudo,
            addr:c.addr,
            selected:false,
            icon:"person",
            color:"white"
          })
        }
        if(func)func(this.contacts);
      },(err)=>{
        if(func_error)func_error(err);
      });
  }

  ckeck_account(f_err:Function) {
    this.api._get("check_account/"+this.addr).subscribe(()=>{
      $$("Le compte "+this.addr+" est valide")
    },(err)=>{
      f_err();
    })
  }
}
