import {Component, OnDestroy, OnInit} from '@angular/core';
import {ApiService} from "../api.service";
import {showMessage, subscribe_socket, group_tokens, extract_tags, $$, set_icon} from "../tools";
import {UserService} from "../user.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {ActivatedRoute, Router} from "@angular/router";
import {Socket} from "ngx-socket-io";
import {environment} from "../../environments/environment";
import {ConfigService} from "../config.service";
import {SelDealerComponent} from "../sel-dealer/sel-dealer.component";
import {MatDialog} from "@angular/material/dialog";
import {Location} from "@angular/common";

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
  dealers:any[]=[];
  art:boolean=false;

  handle:any;
  options:any[]=[
    {label:"Standard",style:{width:"90%",height:"fit-content",fontsize:"1em",with_icon:true,maxwidth:'350px'}},
    {label:"Mobile",style:{width:"90%",height:"fit-content",fontsize:"small",with_icon:false,maxwidth:'500px'}},
    {label:"Large",style:{width:"350px",height:"300px",fontsize:"large",with_icon:true}}
  ]

  selected_mode: any=this.options[0].style;
  selected_dealer: any;

  tags=[""];
  selected_tag: any="";
  cache: any[]=[];


  constructor(public api: ApiService,
              public routes: ActivatedRoute,
              public toast:  MatSnackBar,
              public socket: Socket,
              public location:Location,
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
      width: '96vw', height: '460px',maxWidth:'500px',
      data:{
        title:"Selectionner un distributeur",
        dealers:this.dealers,
        direct_sel:true,
        no_dealer_message:"Aucun distributeur disponible"
      }
    }).afterClosed().subscribe((result:any) => {
      if (result.length>0) {
        this.selected_dealer=result[0];
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

    if(localStorage.getItem("premium_mode"))this.art=localStorage.getItem("premium_mode")=="true";
    if (this.routes.snapshot.queryParamMap.has("premium")) {
      this.art = (this.routes.snapshot.queryParamMap.get("premium")=="true");
    }

    if (this.routes.snapshot.queryParamMap.has("ids")) {
      this.filter_ids = this.routes.snapshot.queryParamMap.get("ids").split(",");
    }

    //Filtre sur une seule boutique
    let store=this.routes.snapshot.queryParamMap.get("store");
    this.api._get("dealers/","").subscribe((dealers:any)=>{
      for(let dealer of dealers){
        if(dealer.state==0 && (!store || store==dealer.address))this.dealers.push(dealer);
      }

      if(!store || this.dealers.length==0)
        this.dealers.splice(0,0,{
          shop_name:'Vente directe',
          address:"0x0",
          shop_description:"Ventes directes des créateurs sans intermédiaires",
          shop_visual:"https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/apple/285/convenience-store_1f3ea.png"
        });

      this.selected_dealer=this.dealers[0];

      this.refresh();
    })


    localStorage.setItem("last_screen","store");
  }




  apply_filter(nfts) : any[] {
    return group_tokens(nfts,(item)=> {
      if(item.tags==null)item.tags="";
      if (!this.filter_id || this.filter_id == item.token_id) {
        //TODO : item.properties >= 4 code a éclaircir
        if (item.for_sale && item.properties >= 4) {
          if ((item.tags.lenght==0 || item.tags.indexOf(this.selected_tag)>-1) && (this.filter.length == 0 || item.search.toLowerCase().indexOf(this.filter.toLowerCase())) > -1){
            return true;
          }
        }
        return false;
      }
    });
  }


  refresh(withMessage = true,limit=2500,offset=0) {
    if (withMessage) this.message = "Chargement des tokens ...";
    this.api._get("nfts/"+this.selected_dealer.address+"/","limit=1000&offset=0").subscribe((r: any) => {
      $$("Récupération de "+r.length+" NFT");
      this.message = "";
      r=set_icon(r,this.config.tags);
      this.cache=r;
      this.nfts=this.apply_filter(r);
      if(this.nfts.length==0 && this.filter_id){
        setTimeout(()=>{
          this.filter_id=null;
          this.location.replaceState(".");
          this.refresh(true,5000);
        },5000);
      }
      if(this.selected_tag.length==0)this.tags=extract_tags(this.nfts);
    });
  }


  clearQuery() {
    this.filter='';
    this.nfts=this.apply_filter(this.cache);
  }



  onQuery($event: KeyboardEvent) {
      clearTimeout(this.handle);
      this.handle=setTimeout(()=>{
        this.nfts=this.apply_filter(this.cache);
      },1000);
  }



  ask_reference(dealer:any) {
    this.api._get("ask_ref/"+this.user.addr+"/"+dealer.address+"/","").subscribe(()=>{
      showMessage(this,"La demande de referencement a été envoyé");
    });
  }

  on_buy($event: any) {
    this.user.check_email(()=>{
      this.router.navigate(['nft-buy'],
      {queryParams:{
          nft:JSON.stringify($event),
          seller:JSON.stringify(this.selected_dealer),
        }
      });
    },()=>{
      showMessage(this,"Achat annulé")
    },"L'achat requiert une authentification préalable");

  }


  update_premium_mode() {
    localStorage.setItem("premium_mode",this.art ? "true" : "false");
  }
}

