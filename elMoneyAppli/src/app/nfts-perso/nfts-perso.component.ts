import { Component, OnInit } from '@angular/core';
import {UserService} from "../user.service";
import {ApiService} from "../api.service";
import {$$, group_tokens, subscribe_socket} from "../tools";
import {ActivatedRoute, Router} from "@angular/router";
import {FormControl} from "@angular/forms";
import {Socket, SocketIoModule} from "ngx-socket-io";
import {NewContactComponent} from "../new-contact/new-contact.component";
import {ConfigService} from "../config.service";
import {MatDialog} from "@angular/material/dialog";
import {environment} from "../../environments/environment";

@Component({
  selector: 'app-nfts-perso',
  templateUrl: './nfts-perso.component.html',
  styleUrls: ['./nfts-perso.component.sass']
})
export class NftsPersoComponent implements OnInit {
  message: string="";
  nfts: any[][]=[[],[]];
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
    public dialog:MatDialog,
    public router:Router,
    public user:UserService,
  ) {
     subscribe_socket(this, "refresh_nft", () => {
      setTimeout(() => {this.refresh();}, 200)
    });

  }

  ngOnInit(): void {
    if (this.routes.snapshot.queryParamMap.has("index")) {
      this.selected.value=Number(this.routes.snapshot.queryParamMap.get("index"));
    }

    this.filter = this.filters[0].option;
    this.refresh();
    localStorage.setItem("last_screen","nfts-perso");
  }


   refresh() {
    this.user.refresh_balance();
    for(let tokenIdentifier of [0,1,2]){
      let filters=["0x0","0x0","0x0"];
      filters[tokenIdentifier]=this.user.addr;
      this.message = "Chargement des tokens ...";
      this.api._get("nfts/"+filters[0]+"/"+filters[1]+"/"+filters[2]).subscribe((r: any) => {
        this.message = "";
        for(let i=0;i<r.length;i++){
          r[i].isDealer=(tokenIdentifier==0);
          r[i].fullscreen=false;
          r[i].open=""; //Utiliser pour stocker le secret si celui ci est révélé
        }


        this.nfts[tokenIdentifier]=group_tokens(r,(i)=>{
          if(!this.filter || tokenIdentifier!=2 || this.filter.key=="" || i[this.filter.key]==this.filter.value) {
            return true;
          }
          return false;
        });
      });
    }
  }

  transfer(nft:any){
      let height='620px';
      if(this.config.webcamsAvailable==0)height="350px";
        this.dialog.open(NewContactComponent, {
          position: {left: '10vw', top: '5vh'},
          maxWidth: 450,
          width: '80vw',height: height,
          data:{}
        }).afterClosed().subscribe((result:any) => {
          if(result){
            nft.message="En cours de transfert";
            let body={pem:this.user.pem,message:"",title:nft.uri,from:this.config.server.explorer+"/account/"+this.user.addr};
            this.api._post("transfer_nft/"+nft.token_id+"/"+result.email+"/","",body).subscribe(()=>{
              nft.message="";
              this.refresh();
            });
          }
        });
  }

  open_store() {
    open("./assets/store.html?seller="+this.user.addr+"&server="+environment.domain_server+"&explorer="+this.config.server.explorer+"&network_name="+this.config.server.network,"store");
  }
}
