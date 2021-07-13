import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {ActivatedRoute} from "@angular/router";
import {UserService} from "../user.service";
import {group_tokens} from "../tools";
import {ConfigService} from "../config.service";

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
    public config:ConfigService,
    public routes:ActivatedRoute,
    public user:UserService
  ) { }

  ngOnInit(): void {
    let addr=this.routes.snapshot.queryParamMap.get("addr");
    this.api._get("users/"+addr+"/","").subscribe((data:any)=>{
      this.miner=data;
    });
    this.refresh();
  }

  refresh(){
    let addr=this.routes.snapshot.queryParamMap.get("miner");
    this.api._get("nfts/0x0/0x0/"+addr+"/").subscribe((r: any) => {
      this.nfts=group_tokens(r,this.config.tags);
    });
  }

  open_website(miner: any) {
    open(miner.website,"Createur web site");
  }
}
