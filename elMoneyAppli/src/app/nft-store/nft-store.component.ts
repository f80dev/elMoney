import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {showMessage} from "../tools";
import {UserService} from "../user.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {Router} from "@angular/router";

@Component({
  selector: 'app-nft-store',
  templateUrl: './nft-store.component.html',
  styleUrls: ['./nft-store.component.sass']
})
export class NftStoreComponent implements OnInit {
  nfts: any[]=[];
  message="";

  constructor(public api:ApiService,
              public toast:MatSnackBar,
              public router:Router,
              public user:UserService) {

  }

  ngOnInit(): void {
    this.refresh();
  }

  refresh(withMessage=true) {
    if(withMessage)this.message="Remplissage de la boutique ...";
    this.api._get("nfts").subscribe((r:any)=>{
      this.message="";
      this.nfts=[];
      for(let item of r){
        item.message="";
        if(item.state==0)this.nfts.push(item);
      }
    })
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

  cancel_buy(nft: any) {
    this.api._post("state_nft/"+nft.token_id+"/1","",this.user.pem).subscribe(()=>{
      showMessage(this,"En cours d'achat");
      this.refresh(false);
    });
  }
}
