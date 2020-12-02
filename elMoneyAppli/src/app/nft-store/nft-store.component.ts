import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";

@Component({
  selector: 'app-nft-store',
  templateUrl: './nft-store.component.html',
  styleUrls: ['./nft-store.component.sass']
})
export class NftStoreComponent implements OnInit {
  nfts: any[]=[];

  constructor(public api:ApiService) {

  }

  ngOnInit(): void {
    this.refresh();
  }

  refresh() {
    this.api._get("nfts").subscribe((r:any)=>{
      this.nfts=r;
    })
  }
}
