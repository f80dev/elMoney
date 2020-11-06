import { Component } from '@angular/core';
import {ConfigService} from "./config.service";
import {ApiService} from "./api.service";
import {ActivatedRoute, Router} from "@angular/router";
import {environment} from "../environments/environment";
import {$$} from "./tools";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass']
})
export class AppComponent {
  title = 'elMoneyAppli';

  constructor(public config: ConfigService,
              public routes:ActivatedRoute,
              public router:Router,
              public api:ApiService){

    this.config.init(()=>{
      $$("!Recherche du contrat à utiliser pour le device");
      let contract=this.routes.snapshot.queryParamMap.get("contract");
      if(!contract)contract=localStorage.getItem("contract");
      if(!contract)contract=environment.default_contract;
      this.api.set_contract(contract);

      let addr=this.routes.snapshot.queryParamMap.get("addr");
      if(!addr)
        addr=localStorage.getItem("addr")
      else
        localStorage.setItem("addr",addr);

      this.router.navigate(["main"]);

    },()=>{
      this.router.navigate(["support"],{queryParams:{message:"Problème grave de connexion"}});
    });
  }

}
