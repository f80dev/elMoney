import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {ActivatedRoute, Router} from "@angular/router";
import {$$, api, eval_properties, now, showError, showMessage} from "../tools";
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
    if(!this.password){
      this.user.check_pem(()=>{
        if(!this.user.isAdmin() && this.config.isProd()){
          this.router.navigate(["store"]);
        }
      })
    }
  }


  raz() {
    this.api._get("raz/"+this.password+"/").subscribe(()=>{
      showMessage(this,"Base effacée");
      this.reload_test_accounts(()=>{
        this.user.reset();
      });

    });
  }

  reload_test_accounts(func) {
    this.message="Chargement des comptes";
    let body={amount:10,egld:0.1,accounts:[]};
    for(let p of this.config.profils){
      body.accounts.push(p.value);
    }
    this.api._post("reload_accounts","",body).subscribe(()=>{
      showMessage(this,'Comptes rechargés');
      this.message="";
      func();
    },(err)=>{showError(this,err);});
  }

  account_list() {
    open(api("account_list",""),"_blank");
  }


  create_sample(samples,index){
    if(samples.length>index){
      let sample=samples[index];
      this.message="Création de "+sample.title+" ("+index+"/"+samples.length+")"
      sample.properties=eval_properties(sample);
      if(!sample.pem || sample.pem.length==0)sample.pem=this.user.pem;
      if(!sample.owner || sample.owner.length==0)sample.owner=this.user.addr;
      if(!sample.count)sample.count=1;

      $$("Création du NFT ", sample);
      this.api._post("mint/"+sample.count, "",sample).subscribe((r: any) => {
        if (r) {
          this.message = "";
          showMessage(this, "Fichier 'tokenisé' pour " + r.cost + " xEgld");
          this.create_sample(samples,index+1);
        }
      }, (err) => {
        $$("!Erreur de création");
        this.message = "";
        showError(this, err);
      });
    } else this.message="";
  }


  create_samples() {
    this.user.check_pem(()=>{
      this.message="Création des exemples";
      this.api.getyaml("tokens").subscribe((tokens:any)=>{
        let rc=[];
        for(let token of tokens.content){
          if(token.hasOwnProperty("samples")){
            for(let sample of token.samples){
              if(sample.online==1)rc.push(sample);
            }
          }
        }
        this.create_sample(rc,0);
        this.user.refresh_balance();
      },(err)=>{showError(this,err)});
    },this);
  }

  ref_addresses() {
    open(api("ref_list",""),"_blank");
  }
}
