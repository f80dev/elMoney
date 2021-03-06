import { Component, OnInit } from '@angular/core';
import {UserService} from "../user.service";
import {ApiService} from "../api.service";
import {$$, group_tokens, showMessage, subscribe_socket} from "../tools";
import {ActivatedRoute, Router} from "@angular/router";
import {FormControl} from "@angular/forms";
import {Socket, SocketIoModule} from "ngx-socket-io";
import {NewContactComponent} from "../new-contact/new-contact.component";
import {ConfigService} from "../config.service";
import {MatDialog} from "@angular/material/dialog";
import {environment} from "../../environments/environment";
import {MatSnackBar} from "@angular/material/snack-bar";

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
    public toast:MatSnackBar,
    public dialog:MatDialog,
    public router:Router,
    public user:UserService,
  ) {
    subscribe_socket(this, "refresh_nft", () => {
      setTimeout(() => {this.refresh();}, 200)
    });

  }

  ngOnInit(): void {
    this.user.check_email(()=>{
      if (this.routes.snapshot.queryParamMap.has("index")) {
        this.selected.value=Number(this.routes.snapshot.queryParamMap.get("index"));
      }

      this.filter = this.filters[0].option;
      this.refresh();
      localStorage.setItem("last_screen","nfts-perso");
    },this.router);
  }

  reroutage(){
    let total=0;
    for(let i of [0,1,2])
      total=total+this.nfts[i].length;

    if(total==0){
      showMessage(this,"Vous n'avez aucun NFT, je vous redirige vers les boutiques")
      this.router.navigate(["store"]);
    }
  }


  refresh() {
    this.user.refresh_balance();
    for(let identifier of [0,1,2]){
      let filters=["0x0","0x0","0x0"];
      filters[identifier]=this.user.addr;
      this.message = "Chargement des tokens ...";
      this.api._get("nfts/"+filters[0]+"/"+filters[1]+"/"+filters[2]).subscribe((r: any) => {
        this.message = "";

        for(let i=0;i<r.length;i++){
          r[i].isDealer=(identifier==0);
          r[i].fullscreen=false;
        }

        this.nfts[identifier]=group_tokens(r,this.config.tags,(i)=>{
          if(!this.filter || identifier!=2 || this.filter.key=="" || i[this.filter.key]==this.filter.value) {
            return true;
          }
          return false;
        });

        if(identifier==2)setTimeout(()=>{this.reroutage();},500);


      });
    }

  }

  transfer(nft:any){
    this.dialog.open(NewContactComponent, {
      position: {left: '10vw', top: '5vh'},
      maxWidth: 450,
      width: '80vw',height: 'fit-content',
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
