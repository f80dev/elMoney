import {Component, ViewChild} from '@angular/core';
import {ConfigService} from "./config.service";
import {ApiService} from "./api.service";
import {ActivatedRoute, Router} from "@angular/router";
import {environment} from "../environments/environment";
import {$$} from "./tools";
import {UserService} from "./user.service";
import {MatSidenav} from "@angular/material/sidenav";
import {Location} from "@angular/common";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass']
})
export class AppComponent {
  title = 'CoinMaKer';
  @ViewChild('drawer', {static: false}) drawer: MatSidenav;
  appVersion: any;
  message: string="";

  constructor(public config: ConfigService,
              public routes:ActivatedRoute,
              public router:Router,
              public _location:Location,
              public user:UserService,
              public api:ApiService){

    this.appVersion=environment.appVersion;
    this.config.init(()=>{

      $$("Recherche du contrat à utiliser pour le device");
      this.api.init_contract(this.routes.snapshot.queryParamMap.get("contract"))

      $$("Initialisation de l'utilisateur")
      //TODO: a remettre showMessage(this, "Sauvegarder votre clé privée dans un endroit sûr",5000, () => {this.router.navigate(["settings"]);}, "Enregistrer")
      let addr=this.routes.snapshot.queryParamMap.get("user");
      this.user.init(addr,JSON.parse(localStorage.getItem("pem")),
        (r)=> {this.router.navigate(["main"]);},
        (err)=>{this.router.navigate(["moneys"]);}
        );

    },()=>{
      $$("!Probléme d'initialisation de la configuration");
      this.router.navigate(["support"],{queryParams:{message:"Problème grave de connexion"}});
    });
  }

   closeMenu() {
      this.drawer.close();
    }

    logout() {
      this.api.logout();
      this.user.reset();
      window.location.reload();
    }

}
