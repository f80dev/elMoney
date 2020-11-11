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
  name: string="RV";
  amount: number=10000;
  url:string="";
  url_transaction: string="";
  transferable=true;
  _public=true;

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
  }

  create() {
    this.message="Déploiement de "+this.name+" en cours ...";
    let obj={
      pem:this.user.pem["pem"],
      owner:this.user.addr,
      public:this._public,
      transferable:this.transferable,
      url:this.url
    };
    $$("Demande de déploiement de la monnaie "+this.name+" d'un montant initial de "+this.amount,obj);

    this.api._post("/deploy/"+this.name+"/"+this.amount,"",obj,240).subscribe((r:any)=>{
      this.message="";
      this.api.set_contract(r.contract);
      this.user.refresh_balance(()=>{
        showMessage(this,"Votre monnaie est maintenant disponible");
        this._location.back();
      });
    },(err:any)=>{
      this.message="";
      $$("Erreur de fabrication de la monnaie",err);
      showMessage(this,err.error.message);
    });
  }
}
