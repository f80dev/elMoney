import { Injectable } from '@angular/core';
import {environment} from '../environments/environment';
import {ApiService} from "./api.service";
import {Platform} from "@angular/cdk/platform";
import {HttpClient} from "@angular/common/http";
import { Location } from '@angular/common';
import {$$, initAvailableCameras} from "./tools";

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  visibleTuto: Boolean | boolean=false;
  user: any;
  values: any;
  config:any;
  webcamsAvailable: any;
  width_screen: number;
  ready=false;
  dealers:any[]=[];
  domain_server;

  query_cache: any[]; //Conserve le contenu de la dernière requete
  unity: string ="";
  server: any={bank:""};
  device: { isDesktop: any; isMobile: any };
  tags: any={};
  egold_price:number=160;
  egold_unity:string="€";

  constructor(private location: Location,
              private http: HttpClient,
              public platform:Platform,
              public api:ApiService) {

    this.device={
      isMobile:this.platform.ANDROID || this.platform.IOS,
      isDesktop:this.platform.isBrowser,
    }
    this.domain_server=environment.domain_server;
  }


  init_tags(){
    if(this.tags=={}){
      this.api.getyaml("tokens").subscribe((r:any)=>{
      for(let token of r.content) {
        for (let tag of token.tags.split(" ")) {
          if (!this.config.tags.hasOwnProperty(tag.replace("#", "")))
            this.config.tags[tag.replace("#", "")] = token.nft_icon;
        }
      }
    });
    }
  }

  public async getJson(jsonFile:string): Promise<any> {
    return Promise.resolve((await this.http.get(jsonFile).toPromise()));
  }


  public hasPerm(perms:string,comments=""):boolean {
    if(!this.user)return false;
    if(!this.user.perm)return false;
    for(let p of perms.split(" ")){
      if(!this.user.perm || this.user.perm.indexOf(p)==-1){
        return false;
      }
    }
    return true;
  }


  private async getConfig(): Promise<any> {
    if (!this.config) {
      this.config = (await this.api.getyaml(environment.config_file).toPromise());
    }
    return Promise.resolve(this.config);
  }

  /**
   * Initialisation des principaux paramètres
   * @param func
   */
  init(func=null,func_error=null){
    $$("Initialisation de la configuration");
    this.width_screen=window.innerWidth;

    initAvailableCameras((res)=>{this.webcamsAvailable=res;});
    $$("Chargement des jobs");
    this.getConfig().then(r=>{
      this.values=r;
      this.ready=true;
      $$("Chargement du fichier de configuration ok",r);

      this.api._get("server_config").subscribe((is:any)=>{
        this.server=is;
        $$("Chargement des infos serveur ok",is)

        this.refresh_dealers();
        if(func!=null)func(this.values);
      })
    },()=>{
      $$("Probléme de chargement de la configuration")
      if(func_error!=null)func_error();
    });

  }


  refresh_dealers(){
    $$("Chargement des dealers");
    this.api._get("dealers/","").subscribe((deals:any)=>{
      this.dealers=deals;
    });
  }

  public hasESDT() : boolean {
    return(this.server["default_money"]!=null);
  }

  public isProd() : boolean {
    return environment.production;
  }


  init_user(func_success=null,func_anonyme=null) {
    $$("Initialisation de l'utilisateur");
    let email=localStorage.getItem("email");
    // this.api.getuser(email).subscribe((r:any)=>{
    //     if(r.count>0){
    //       $$("Chargement de l'utilisateur ",r.results[0]);
    //       this.user=r.results[0];
    //       if(func_success)func_success();
    //     } else {
    //       $$("Aucun compte disponible a l'adresse mail"+email+" on réinitialise le compte")
    //       this.raz_user();
    //       this.api.logout();
    //       this.user.perm=this.profils[this.values.anonymousOffer].perm;
    //       if(func_anonyme)func_anonyme();
    //     }
    //  });
  }




}
