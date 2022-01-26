import { Component, OnInit } from '@angular/core';
import {UserService} from "../user.service";
import {ApiService} from "../api.service";
import {$$, group_tokens, now, set_icon, showError, showMessage, subscribe_socket} from "../tools";
import {ActivatedRoute, Router} from "@angular/router";
import {FormControl} from "@angular/forms";
import {Socket, SocketIoModule} from "ngx-socket-io";
import {NewContactComponent} from "../new-contact/new-contact.component";
import {ConfigService} from "../config.service";
import {MatDialog} from "@angular/material/dialog";
import {environment} from "../../environments/environment";
import {MatSnackBar} from "@angular/material/snack-bar";
import {Location} from "@angular/common";
import {animate, state, style, transition, trigger} from "@angular/animations";

@Component({
  selector: 'app-nfts-perso',
  templateUrl: './nfts-perso.component.html',
  styleUrls: ['./nfts-perso.component.sass']
})
export class NftsPersoComponent implements OnInit {
  message: string="";
  nfts: any[][]=[[],[]];
  group_token=false;
  selected:any = new FormControl(0);
  filters: any[]=[
    {label:"Aucun filtre",filter:{key:"",value:""}},
    {label:"Supprimer les vendus",filter:{key:"state",value:0}},
  ];
  filter:any=this.filters[0].filter;

  constructor(
    public routes:ActivatedRoute,
    public api:ApiService,
    public config:ConfigService,
    public socket:Socket,
    public toast:MatSnackBar,
    public dialog:MatDialog,
    public _location:Location,
    public router:Router,
    public user:UserService,
  ) {
    subscribe_socket(this, "refresh_nft", () => {
      setTimeout(() => {this.refresh([0,1,2],"force");}, 200)
    });

  }

  ngOnInit(): void {
    this.user.check_email(()=>{
      if (this.routes.snapshot.queryParamMap.has("index")) {
        this.selected.value=Number(this.routes.snapshot.queryParamMap.get("index"));
      }

      this.filter = this.filters[0].value;
      localStorage.setItem("last_screen","nfts-perso");

      this.refresh();
      setTimeout(()=>{this.reroutage();},2500);

    },this.router,null,"nfts-perso");
  }

  reroutage(){
    let total=0;
    for(let i of [0,1,2]){
      if(this.nfts[i])
        total=total+this.nfts[i].length;
    }

    if(total==0){
      showMessage(this,"Vous n'avez aucun NFT, je vous redirige vers les boutiques")
      //this.router.navigate(["store"]);
    }
  }


  //Récupération de la liste des NFTs possédés
  //0=mes créations
  //1=ceux que je posséde
  //2=ceux que je distribue


  refresh(identifiers=[0,1,2],evt:any=null) {
    let param="limit=2000&offset=0";
    if(evt=="open")return;

    if(evt=="burn" || evt=="transfer" || evt=="force" || evt=="update" || evt=="mint" || evt=="clone"){
      $$("On force le rafraichissement (pas d'usage du cache)");
      param=param+"&time="+now();
    }

    if(evt=="burn"){
      debugger
    }

    $$("Refresh de la liste des NFTs pour les onglets "+identifiers);
    for(let identifier of identifiers){
      let filters=["0x0","0x0","0x0"];
      filters[identifier]=this.user.addr;
      this.message = "Chargement des tokens ...";
      this.api._get("nfts/"+filters[0]+"/"+filters[1]+"/"+filters[2],param).subscribe((r: any) => {
        this.message = "";

        for(let i=0;i<r.length;i++){
          r[i].isDealer=(identifier==0);
          r[i].fullscreen=false;
        }

        r=set_icon(r,this.config.tags);
        if(identifier!=1 || this.group_token){
          this.nfts[identifier]=group_tokens(r,(i)=>{
            if(!this.filter || identifier!=2 || this.filter.key=="" || i[this.filter.key]==this.filter.value) {
              return true;
            }
            return false;
          });
        } else this.nfts[identifier]=r;

      },(err)=>{showError(this,err)});
    }
    this.user.refresh_balance();
  }

  transfer(nft:any){
    this.user.check_pem(()=>{
      this.dialog.open(NewContactComponent, {
        backdropClass:"removeBackground",
        position: {left: '5vw', top: '5vh'},
        maxWidth: 350, width: '90vw', height: 'auto',minWidth:250,
        data:{}
      }).afterClosed().subscribe((result:any) => {
        if(result){
          nft.message="En cours de transfert";
          let body={pem:this.user.pem,message:"",title:nft.uri,from:this.config.server.explorer+"/account/"+this.user.addr};
          this.api._post("transfer_nft/"+nft.token_id+"/"+result.email+"/","",body).subscribe(()=>{
            nft.message="";
            this.refresh([0,1,2],"transfer");
          },(err)=>{showError(this,err)});
        }
      });
    })
  }

  open_store() {
    open("./assets/store.html?seller="+this.user.addr+"&server="+environment.domain_server+"&explorer="+this.config.server.explorer+"&network_name="+this.config.server.network,"store");
  }

  onburn($event: any) {
    debugger
    $$("Effacement manuel des tokens");
    for(let i of [0,1,2])
      for(let t of this.nfts[i]){
        if(t.token_id==$event){
          let idx=this.nfts[i].indexOf(t);
          this.nfts[i].splice(idx,1);
        }
      }
  }

  tab_changed($event: any) {
    this._location.replaceState("nft-perso","index="+$event);
  }
}
