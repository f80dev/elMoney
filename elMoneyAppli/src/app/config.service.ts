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
  config: any;
  tags:any={};
  webcamsAvailable: any;
  width_screen: number;
  ready=false;
  dealers:any[]=[];
  domain_server;
  profils: any=[
    {label:"Alice",value:"alice.pem"},
    {label:"Eve",value:"eve.pem"},
    {label:"Dan",value:"dan.pem"},
    {label:"Grace",value:"grace.pem"},
    {label:"Franck",value:"franck.pem"},
    {label:"Ivan",value:"ivan.pem"},
    {label:"Mallory",value:"mallory.pem"},
    {label:"Judy",value:"judy.pem"},
    {label:"Thomas",value:"thomas.pem"},
    {label:"Herve",value:"herve.pem"},
    {label:"Test1",value:"test1.pem"},
    {label:"Test2",value:"test2.pem"},
    {label:"Test3",value:"test3.pem"},
    {label:"Test4",value:"test4.pem"}
  ]

  query_cache: any[]; //Conserve le contenu de la dernière requete
  unity: string ="";
  server: any={bank:""};
  device: { isDesktop: boolean; isMobile: boolean,isFirefox:boolean };
  egold_price:number=60;
  egold_unity:string="eGld";
  fiat_unity: string="$";
  unity_conversion: any={};

  constructor(private location: Location,
              private http: HttpClient,
              public platform:Platform,
              public api:ApiService) {

    this.device={
      isMobile:this.platform.ANDROID || this.platform.IOS,
      isDesktop:this.platform.isBrowser,
      isFirefox:this.platform.FIREFOX
    }
    this.domain_server=environment.domain_server;
  }


  init_tags(){
    this.api.getyaml("tokens").subscribe((r:any)=>{
      for(let token of r.content) {
        for (let tag of token.tags.split(" ")) {
          if (!this.tags.hasOwnProperty(tag.replace("#", "")))
            this.tags[tag.replace("#", "")] = token.nft_icon;
        }
      }
    });

  }

  public async getJson(jsonFile:string): Promise<any> {
    return Promise.resolve((await this.http.get(jsonFile).toPromise()));
  }



  get_price(unity="egld",func=null){
    let now=new Date().getTime();
    if(this.unity_conversion && this.unity_conversion.hasOwnProperty(unity) && now-this.unity_conversion[unity].lastdate<100000){
      if(func)func(this.unity_conversion[unity].value);
      return;
    }
    if(unity.toLowerCase()=="egld"){
      this.api._get("https://data.elrond.com/market/quotes/egld/price","",10,"").subscribe((result:any)=>{
        if(result.length>0){
          this.unity_conversion[unity]={value:result[result.length-1].value,lastdate:new Date().getTime()};
          if(func)func(result[result.length-1].value);
        }
      },(err)=>{
        if(func)func(80);
      });
    } else {
      this.unity_conversion[unity]={value:1,lastdate:new Date().getTime()};
      //TODO a adapter sur la base d'un tableau de correspondance entre la monnaie
      func(1);
    }

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

    initAvailableCameras((res)=>{
      $$(res+" webcam disponibles");
      this.webcamsAvailable=res;
    });
    $$("Chargement des jobs");
    this.getConfig().then(r=>{
      this.values=r;
      this.ready=true;
      $$("Chargement du fichier de configuration ok",r);

      this.api._get("server_config").subscribe((is:any)=>{
        this.server=is;
        $$("Chargement des infos serveur ok",is)

        this.refresh_dealers();
        this.get_price();
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
    if(this.server.domain_server.indexOf("localhost")>-1)return false;
    return true;
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


  isMobile() {
    return this.device.isMobile;
  }
}
