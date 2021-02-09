import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {UserService} from "../user.service";
import {ConfigService} from "../config.service";
import {Router} from "@angular/router";

@Component({
  selector: 'app-validate',
  templateUrl: './validate.component.html',
  styleUrls: ['./validate.component.sass']
})
export class ValidateComponent implements OnInit {
  addr: any="";
  nfts: any[]=[];
  validate_nfts: any[]=[];

  constructor(
    public api:ApiService,
    public user:UserService,
    public router:Router,
    public config:ConfigService,
  ) { }

  ngOnInit(): void {
    this.api._get("nfts/0x0/0x0/" + this.user.addr + "/").subscribe((r: any) => {
      this.nfts=r;
    });
  }

  onscan($event: any) {
      this.validate_nfts=[];
      for(let nft of this.nfts)
        if(nft.owner==$event.data)this.validate_nfts.push(nft);
  }


}
