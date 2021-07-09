import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {showMessage, subscribe_socket, group_tokens, extract_tags} from "../tools";
import {UserService} from "../user.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {ActivatedRoute, Router} from "@angular/router";
import {Socket} from "ngx-socket-io";
import {environment} from "../../environments/environment";
import {ConfigService} from "../config.service";
import {SelDealerComponent} from "../sel-dealer/sel-dealer.component";
import {MatDialog} from "@angular/material/dialog";

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
  art:boolean=false;


  handle:any;
  options:any[]=[
    {label:"Standard",style:{width:"250px",height:"fit-content",fontsize:"medium",with_icon:true}},
    {label:"Condensé",style:{width:"auto",height:"fit-content",fontsize:"small",with_icon:false}},
    {label:"Large",style:{width:"350px",height:"300px",fontsize:"large",with_icon:true}}
  ]

  selected_mode: any=this.options[0].style;
  selected_dealer: any;

  tags=[""];
  selected_tag: any="";


  constructor(public api: ApiService,
              public routes: ActivatedRoute,
              public toast:  MatSnackBar,
              public socket: Socket,
              public dialog: MatDialog,
              public config: ConfigService,
              public router: Router,
              public user:   UserService
  ) {
    subscribe_socket(this, "refresh_nft", () => {
      setTimeout(() => {
        this.refresh(false);
      }, 200)
    });
  }


  change_dealer(){
    this.dialog.open(SelDealerComponent, {
      position: {left: '2vw', top: '5vh'},
      width: '96vw', height: 'auto',maxWidth:'500px',
      data:{
        title:"Selectionner un distributeur",
        dealers:this.dealers,
        direct_sel:true,
        no_dealer_message:"Aucun distributeur disponible"
      }
    }).afterClosed().subscribe((result:any) => {
      if (result && Object.keys(result).length > 0) {
        this.selected_dealer=result;
        this.refresh(false);
      }
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


    let store=this.routes.snapshot.queryParamMap.get("store");

    this.dealers=[{shop_name:'Vente directe',address:"0x0"}];
    this.selected_dealer=this.dealers[0];
    this.refresh();

    this.api._get("dealers/","").subscribe((dealers:any)=>{
      for(let dealer of dealers){
        this.dealers.push(dealer);
        if (store && store==dealer.address)
          this.selected_dealer=dealer;
      }

    })

    localStorage.setItem("last_screen","store");
  }




  refresh(withMessage = true) {
    if (withMessage) this.message = "Chargement des tokens ...";
    this.api._get("nfts/"+this.selected_dealer.address+"/").subscribe((r: any) => {
      this.message = "";
      this.nfts=group_tokens(r,this.config.tags,(item)=>{
        if (!this.filter_id || this.filter_id == item.token_id) {
          if (item.state == 0 && item.properties >= 4 && item.owner != this.user.addr) {
              return true;
          }
        return false;
        }
      });
      this.tags=extract_tags(this.nfts);
    });
  }


  clearQuery() {
    this.filter='';
    if(this.nfts.length>100) {
      this.refresh(false);
    }
  }






  onQuery($event: KeyboardEvent) {
    if(this.nfts.length>100){
      clearTimeout(this.handle);
      this.handle=setTimeout(()=>{
        this.refresh(false);
      },1000);
    }
  }



  ask_reference(dealer:any) {
    this.api._get("ask_ref/"+this.user.addr+"/"+dealer.address+"/","").subscribe(()=>{
      showMessage(this,"La demande de referencement a été envoyé");
    });
  }

  on_buy($event: any) {
    this.user.check_pem(()=>{
      this.router.navigate(['nft-buy'],
      {queryParams:{
          nft:JSON.stringify($event),
          seller:JSON.stringify(this.selected_dealer),
        }
      });
    },this)

  }
}
