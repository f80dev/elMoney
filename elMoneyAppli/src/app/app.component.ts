import {Component, HostListener, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ConfigService} from "./config.service";
import {ApiService} from "./api.service";
import {ActivatedRoute, Router} from "@angular/router";
import {environment} from "../environments/environment";
import {$$, showMessage} from "./tools";
import {UserService} from "./user.service";
import {MatSidenav} from "@angular/material/sidenav";
import {Location} from "@angular/common";
import {fromEvent, Observable,Subscription} from "rxjs";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass']
})
export class AppComponent implements OnInit,OnDestroy {
  title = 'CoinMaKer';
  @ViewChild('drawer', {static: false}) drawer: MatSidenav;
  appVersion: any;
  message: string="";

  onlineEvent: Observable<Event> = fromEvent(window, 'online');
  offlineEvent: Observable<Event> = fromEvent(window, 'offline');
  subscriptions: Subscription[] = [];

  innerWidth: number=400;
  sidemenu_mode="over";

  constructor(public config: ConfigService,
              public routes:ActivatedRoute,
              public router:Router,
              public _location:Location,
              public user:UserService,
              public api:ApiService){

    this.appVersion=environment.appVersion;
    this.message="Connexion";
    this.config.init(()=>{
      this.message="";
      $$("Recherche du contrat à utiliser pour le device");
      this.api.init_contract(this.routes.snapshot.queryParamMap.get("contract"))

      $$("Initialisation de l'utilisateur")
      //TODO: a remettre showMessage(this, "Sauvegarder votre clé privée dans un endroit sûr",5000, () => {this.router.navigate(["settings"]);}, "Enregistrer")
      let addr=this.routes.snapshot.queryParamMap.get("user");
      this.user.init(addr,JSON.parse(localStorage.getItem("pem")),
        (r)=> {
        if(localStorage.getItem("last_screen"))
          this.router.navigate([localStorage.getItem("last_screen")]);
        else
          this.router.navigate(["main"]);
        },
        (err)=>{this.router.navigate(["moneys"]);},
        this
      );
    },()=>{
      this.message="";
      $$("!Probléme d'initialisation de la configuration");
      this.router.navigate(["support"],{queryParams:{message:"Problème grave de connexion"}});
    });
  }

  init_event_for_network_status() {
    this.subscriptions.push(this.onlineEvent.subscribe(e => {
      this.api.connectionStatus = true;
      showMessage(this, "Connexion retrouvée")
    }));

    this.subscriptions.push(this.offlineEvent.subscribe(e => {
      this.api.connectionStatus = false;
      showMessage(this, "Connexion perdue");
    }));
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  @HostListener('window:resize', ['$event'])
  onResize($event: any) {
    this.innerWidth = $event.currentTarget.innerWidth;
    if (this.innerWidth >= 800 && this.drawer){
      this.sidemenu_mode="side";
      this.drawer.open();
    }
    else{
      this.closeMenu();
      this.sidemenu_mode="over";
    }

  }

  closeMenu() {
    if (this.innerWidth < 800)
      this.drawer.close();
  }

  logout() {
    this.api.logout();
    this.user.reset();
    window.location.reload();
  }

  ngOnInit(): void {
    setTimeout(()=>{
      this.onResize({currentTarget:{innerWidth:window.innerWidth}});
    },5000);

  }

}
