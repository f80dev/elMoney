import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {showMessage} from "../tools";
import {UserService} from "../user.service";

@Component({
  selector: 'app-nft-store',
  templateUrl: './nft-store.component.html',
  styleUrls: ['./nft-store.component.sass']
})
export class NftStoreComponent implements OnInit {
  nfts: any[]=[];

  constructor(public api:ApiService,public user:UserService) {

  }

  ngOnInit(): void {
    this.refresh();
  }

  refresh() {
    this.api._get("nfts").subscribe((r:any)=>{
      this.nfts=r;
    })
  }

  buy(nft: any) {
    this.api._post("buy_nft/"+nft.token_id+"/","",this.user.pem).subscribe(()=>{
      showMessage(this,"En cours d'achat");
    })
  }
}
