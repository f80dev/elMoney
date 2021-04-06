import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {ActivatedRoute} from "@angular/router";

@Component({
  selector: 'app-public-miner',
  templateUrl: './public-miner.component.html',
  styleUrls: ['./public-miner.component.sass']
})
export class PublicMinerComponent implements OnInit {
  miner: any;
  nfts: any;

  constructor(
    public api:ApiService,
    public routes:ActivatedRoute
  ) { }

  ngOnInit(): void {
    let addr=this.routes.snapshot.queryParamMap.get("addr");
    this.api._get("users/"+addr+"/","").subscribe((data:any)=>{
      this.miner=data;
    });

    this.api._get("nfts/0x0/0x0/"+addr+"/").subscribe((r: any) => {
      this.nfts=r;
    });
  }

}
