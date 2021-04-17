import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {showMessage, subscribe_socket} from "../tools";
import {UserService} from "../user.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {ActivatedRoute, Router} from "@angular/router";
import {Socket} from "ngx-socket-io";
import {environment} from "../../environments/environment";

@Component({
  selector: 'app-nft-store',
  templateUrl: './nft-store.component.html',
  styleUrls: ['./nft-store.component.sass']
})
export class NftStoreComponent implements OnInit {
  nfts: any[] = [];
  message = "";
  transac_cost=environment.transac_cost;
  filter: string="";
  filter_id: number=null;
  filter_ids: any[]=[];
  dealers:any[]=[{name:'tous',address:'0x0'}];

  constructor(public api: ApiService,
              public routes: ActivatedRoute,
              public toast: MatSnackBar,
              public socket: Socket,
              public router: Router,
              public user: UserService
  ) {
    subscribe_socket(this, "refresh_nft", () => {
      setTimeout(() => {
        this.refresh(false);
      }, 200)
    });
  }



  ngOnInit(): void {
    if (this.routes.snapshot.queryParamMap.has("filter")) {
      this.filter_id = Number(this.routes.snapshot.queryParamMap.get("filter"));
    }

    if (this.routes.snapshot.queryParamMap.has("q")) {
      this.filter = this.routes.snapshot.queryParamMap.get("q");
    }

    if (this.routes.snapshot.queryParamMap.has("id")) {
      this.filter_id = Number(this.routes.snapshot.queryParamMap.get("id"));
    }

    if (this.routes.snapshot.queryParamMap.has("ids")) {
      this.filter_ids = this.routes.snapshot.queryParamMap.get("ids").split(",");
    }

    this.dealers=[{name:'Vente directe',address:"0x0"}];
    this.selected_dealer=this.dealers[0];
    this.refresh();

    this.api._get("dealers/","").subscribe((dealers:any)=>{
      for(let dealer of dealers)
        this.dealers.push(dealer);
    })

    localStorage.setItem("last_screen","store");
  }




  refresh(withMessage = true) {
    if (withMessage) this.message = "Chargement des tokens ...";
    this.api._get("nfts/"+this.selected_dealer.address+"/").subscribe((r: any) => {
      this.message = "";
      this.nfts = [];
      for (let item of r) {
        item.message = "";
        item.search=item.title+" "+item.price;
        item.open = "";

        let same_item=null;
        for(let i of this.nfts){

          if(i.title==item.title && i.description==item.description && i.miner==item.miner && i.price==item.price && i.state==item.state)
            same_item=i;
        }

        if(same_item){
          same_item.count=same_item.count+1;
        } else {
          item.count=1;
          if (!this.filter_id || this.filter_id == item.token_id) {
          if (item.state == 0 && item.properties>=4 && item.owner!=this.user.addr) {
            this.nfts.push(item);
          }
        }
        }

      }
    });
  }


  clearQuery() {
    this.filter='';
    if(this.nfts.length>100) {
      this.refresh(false);
    }
  }

  handle:any;
  options:any[]=[
    {label:"Standard",style:{width:"250px",height:"fit-content",fontsize:"medium",with_icon:true}},
    {label:"Condensé",style:{width:"auto",height:"fit-content",fontsize:"small",with_icon:false}},
    {label:"Large",style:{width:"350px",height:"300px",fontsize:"large",with_icon:true}}
    ]

  selected_mode: any=this.options[0].style;
  selected_dealer: any;


  onQuery($event: KeyboardEvent) {
    if(this.nfts.length>100){
      clearTimeout(this.handle);
      this.handle=setTimeout(()=>{
        this.refresh(false);
      },1000);
    }
  }


  on_buy($event: any) {
    this.user.refresh_balance();
    this.router.navigate(['nfts-perso'],{queryParams:{index:0}})
  }

  ask_reference(dealer:any) {
    this.api._get("ask_ref/"+this.user.addr+"/"+dealer.address+"/","").subscribe(()=>{
      showMessage(this,"La demande de referencement a été envoyé");
    });
  }
}
