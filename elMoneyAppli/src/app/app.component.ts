import { Component } from '@angular/core';
import {ConfigService} from "./config.service";
import {ApiService} from "./api.service";
import {ActivatedRoute, Router} from "@angular/router";
import {environment} from "../environments/environment";
import {$$} from "./tools";
import {UserService} from "./user.service";

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
              public user:UserService,
              public api:ApiService){

    this.config.init(()=>{
      $$("Recherche du contrat à utiliser pour le device");

      let contract=this.routes.snapshot.queryParamMap.get("contract");
      if(!contract)contract=localStorage.getItem("contract");
      this.api.set_contract(contract);

      if(!user.loadFromDevice()){
        let addr=this.routes.snapshot.queryParamMap.get("addr");
        this.user.init(addr);
      }


      this.router.navigate(["main"]);

    },()=>{
      this.router.navigate(["support"],{queryParams:{message:"Problème grave de connexion"}});
    });
  }

}
