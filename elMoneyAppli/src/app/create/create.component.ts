import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {showError, showMessage} from "../tools";
import {Location} from "@angular/common";

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

  constructor(public api:ApiService,
              public _location:Location,
              public toast:MatSnackBar) { }

  ngOnInit(): void {

  }

  create() {
    let body=atob(localStorage.getItem("pem_file"));
    this.message="Déploiement en cours ...";
    this.api._post("/deploy/"+this.name+"/"+this.amount,"",body,240).subscribe((r:any)=>{
      this.message="";
      showMessage(this,"Contrat en cours de déploiement. Voir la transaction ?",0,()=>{open(r.link,"_blank");},"Ouvrir");
    },(err:any)=>{
      this.message="";
      showMessage(this,err.error.message,0,()=>{
        open(err.error.link);
      },"En savoir plus");
    });
  }
}
