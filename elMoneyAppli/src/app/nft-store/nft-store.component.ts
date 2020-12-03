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

  refresh() {
    this.message="Remplissage de la boutique ...";
    this.api._get("nfts").subscribe((r:any)=>{
      this.message="";
      this.nfts=[];
      for(let item of r){
        if(item.state==0)this.nfts.push(item);
      }
    })
  }

  buy(nft: any) {
    this.api._post("buy_nft/"+nft.token_id+"/","",this.user.pem).subscribe(()=>{
      showMessage(this,"En cours d'achat");
    })
  }
}
