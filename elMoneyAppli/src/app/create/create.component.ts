import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {showError, showMessage} from "../tools";
import {Location} from "@angular/common";
import {Router} from "@angular/router";
import {ConfigService} from "../config.service";

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

  constructor(public api:ApiService,
              public router:Router,
              public config:ConfigService,
              public _location:Location,
              public toast:MatSnackBar) { }

  ngOnInit(): void {
     if(!this.config.pem)this.router.navigate(["private"]);
  }

  create() {
    this.message="Déploiement en cours ...";
    this.api._post("/deploy/"+this.name+"/"+this.amount,"",this.config.pem,240).subscribe((r:any)=>{
      this.message="";
      localStorage.setItem("contract",r.contract);
      showMessage(this,"Votre monnaie est maintenant disponible");
      this._location.back();
    },(err:any)=>{
      this.message="";
      showMessage(this,err.error.message,0,()=>{
        open(err.error.link);
      },"En savoir plus");
    });
  }
}
