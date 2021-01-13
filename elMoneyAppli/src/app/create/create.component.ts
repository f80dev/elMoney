import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {$$, showError, showMessage} from "../tools";
import {Location} from "@angular/common";
import {Router} from "@angular/router";
import {ConfigService} from "../config.service";
import {UserService} from "../user.service";

@Component({
  selector: 'app-create',
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.sass']
})
export class CreateComponent implements OnInit {
  message: string="";
  name: string="";
  amount: number=10000;
  url:string="";
  url_transaction: string="";
  transferable=true;
  _public=true;
  unity:string="";
  email_confirm: string="";

  constructor(public api:ApiService,
              public router:Router,
              public user:UserService,
              public config:ConfigService,
              public _location:Location,
              public toast:MatSnackBar) { }

  ngOnInit(): void {
     if(!this.user.pem){
       $$("Fichier PEM non disponible, il est nécéssaire d'un ajouter un");
       this.router.navigate(["private"]);
     }
     this.user.refresh_balance();
  }

  create() {
    if(this.email_confirm==""){
      showMessage(this,"Vous devez indiquer un email pour recevoir la confirmation");
      return;
    }

    if(this.name.length<10){
      showMessage(this,"Le nom complet de la monnaie doit être plus long");
      return;
    }

    this.message="Déploiement du "+this.name+" en cours ...";
    let obj={
      pem:this.user.pem["pem"],
      owner:this.user.addr,
      public:this._public,
      transferable:this.transferable,
      url:this.url,
      email:this.email_confirm
    };
    $$("Demande de déploiement de la monnaie "+this.name+" d'un montant initial de "+this.amount,obj);

    this.api._post("/deploy/"+this.name+"/"+this.unity+"/18/"+this.amount,"",obj,240).subscribe((r:any)=>{
      this.message="";
      this.api.set_tokenIdentifier(r.id);
      this.user.refresh_balance(()=>{
        showMessage(this,"Votre monnaie est maintenant disponible");
        this.router.navigate(["main"]);
      },()=>{
        showError(this);
      });
    },(err:any)=>{
      this.message="";
      $$("Erreur de fabrication de la monnaie",err);
      showMessage(this,err.error.message);
    });
  }

  upper_unity($event: KeyboardEvent) {
    this.unity=this.unity.toUpperCase();
  }

  format_name() {
    let rc="";
    for(let word of this.name.split(" ")){
      rc=rc+word.substr(0,1).toUpperCase()+word.substr(1,this.name.length);
    }
    this.name=rc;
  }
}
