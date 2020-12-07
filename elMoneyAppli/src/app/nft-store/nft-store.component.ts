import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {showMessage} from "../tools";
import {UserService} from "../user.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {ActivatedRoute, Router} from "@angular/router";

@Component({
  selector: 'app-nft-store',
  templateUrl: './nft-store.component.html',
  styleUrls: ['./nft-store.component.sass']
})
export class NftStoreComponent implements OnInit {
  nfts: any[]=[];
  message="";
  perso_only: any={value:true};

  constructor(public api:ApiService,
              public routes:ActivatedRoute,
              public toast:MatSnackBar,
              public router:Router,
              public user:UserService) {

  }

  ngOnInit(): void {
    if(this.routes.snapshot.queryParamMap.has("perso_only"))
      this.perso_only.value=this.routes.snapshot.queryParamMap.get("perso_only")
    this.refresh();
  }

  refresh(withMessage=true) {
    if(withMessage)this.message="Remplissage de la boutique ...";
    this.api._get("nfts").subscribe((r:any)=>{
      this.message="";
      this.nfts=[];
      for(let item of r){
        item.message="";
        item.open="";
        if(this.perso_only){
          if(item.owner==this.user.addr)
            this.nfts.push(item);
        } else {
          if(item.state==0 || item.owner==this.user.addr)
            this.nfts.push(item);
        }
      }
    });
  }



  buy(nft: any) {
    nft.message="En cours d'achat";
    let price=nft.price;
    this.api._post("buy_nft/"+nft.token_id+"/"+price,"",this.user.pem).subscribe(()=>{
      nft.message="";
      showMessage(this,"En cours d'achat");
      this.refresh(false);
    },()=>{
      nft.message="";
      showMessage(this,"Achat annulé");
    });
  }

  setstate(nft: any,new_state,message) {
    nft.message=message;
    this.api._post("state_nft/"+nft.token_id+"/"+new_state,"",this.user.pem).subscribe(()=>{
      nft.message="";
      this.refresh(false);
    });
  }

  open(nft: any) {
    nft.message="En cours d'ouverture";
    this.api._post("open_nft/"+nft.token_id+"/","",this.user.pem).subscribe((r:any)=>{
      nft.message="";
      nft.open=r.response;
    });
  }

  burn(nft: any) {
    this.api._post("burn/"+nft.token_id+"/","",this.user.pem).subscribe((r:any)=>{
      nft.message="En cours de destruction";
      this.refresh(false);
    });
  }
}
