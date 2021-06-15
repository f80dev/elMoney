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
import {MatSnackBar} from "@angular/material/snack-bar";

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
              public toast:MatSnackBar,
              public _location:Location,
              public user:UserService,
              public api:ApiService){

    this.appVersion=environment.appVersion;
    this.message="Connexion";

    this.config.init(()=>{
      this.config.init_tags();
      this.message="";
      $$("Recherche du contrat à utiliser pour le device");
      this.api.init_identifier(this.routes.snapshot.queryParamMap.get("contract"))

      $$("Initialisation de l'utilisateur");
      let addr=this.routes.snapshot.queryParamMap.get("user");
      let miner=this.routes.snapshot.queryParamMap.get("miner");
      let q=this.routes.snapshot.queryParamMap.get("q");
      let store=this.routes.snapshot.queryParamMap.get("store");
      let filter=this.routes.snapshot.queryParamMap.get("filter");
      let profil=this.routes.snapshot.queryParamMap.get("profil");

      let pem_key=localStorage.getItem("pem");
      if(pem_key)pem_key=JSON.parse(pem_key);

      this.user.init(addr,pem_key,
        (r)=> {
          if (profil){this.router.navigate(["private"],{queryParams:{profil:profil}});return;}
          if (filter){this.router.navigate(["store"],{queryParams:{id:filter}});return;}
          if (addr)  {this.router.navigate(["nfts-perso"]);return;};
          if (miner) {this.router.navigate(["miner"],{queryParams:{miner:miner}});return;}
          if (store) {this.router.navigate(["store"],{queryParams:{store:store}});return;}
          if(this._location.path().indexOf("/admin")==-1 && localStorage.getItem("last_screen") && !miner){this.router.navigate([localStorage.getItem("last_screen")]);return;}
          if(this.config.hasESDT() && !q && !filter){this.router.navigate(["main"]);return;}
          //this.router.navigate(["store"],{queryParams:{q:q,filter:filter}});
        },
        (err)=>{
          $$("Evaluation de la balance impossible, on propose un changement de contrat");
          showMessage(this,"Le compte est corrompu, changement de compte proposé");
          this.router.navigate(["settings"]);
        },this
      );
    },()=>{
      this.message="";
      $$("!Probléme d'initialisation de la configuration");
      this.router.navigate(["support"],{queryParams:{message:"Serveur non disponible"}});
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
    if (this.innerWidth < 800 && this.drawer)
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
