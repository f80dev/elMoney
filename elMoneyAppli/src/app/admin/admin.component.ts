import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {ActivatedRoute, Router} from "@angular/router";
import {showError, showMessage} from "../tools";
import {MatSnackBar} from "@angular/material/snack-bar";
import {UserService} from "../user.service";
import {ConfigService} from "../config.service";
import {environment} from "../../environments/environment";

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.sass']
})
export class AdminComponent implements OnInit {
  password: any="";
  message="";

   constructor(public api:ApiService,
               public toast:MatSnackBar,
               public config:ConfigService,
               public routes:ActivatedRoute,
               public user:UserService,
               public router:Router) {
   }


  ngOnInit(): void {
     this.password=this.routes.snapshot.queryParamMap.get("password");
     if(!environment.production){
      this.password="hh4271";
   }
  }


  raz() {
    this.api._get("raz/"+this.password+"/").subscribe(()=>{
      showMessage(this,"Base effacée");
      this.user.reset();
    });
  }

  reload_test_accounts() {
     this.message="Chargement des comptes";
    let body={amount:10,accounts:[]};
    for(let p of this.config.profils){
      body.accounts.push(p.value);
    }
    this.api._post("reload_accounts","",body).subscribe(()=>{
      showMessage(this,'Comptes rechargés');
      this.message="";
    });
  }
}
