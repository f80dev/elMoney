import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {UserService} from "../user.service";
import {ConfigService} from "../config.service";
import {Router} from "@angular/router";
import {MatSnackBar} from "@angular/material/snack-bar";
import {showMessage} from "../tools";

@Component({
  selector: 'app-validate',
  templateUrl: './validate.component.html',
  styleUrls: ['./validate.component.sass']
})
export class ValidateComponent implements OnInit {
  addr: any="";
  nfts: any[]=[];
  validate_nfts: any[]=[];
  message: string="";

  constructor(
    public api:ApiService,
    public user:UserService,
    public router:Router,
    public toast:MatSnackBar,
    public config:ConfigService,
  ) { }

  ngOnInit(): void {
    this.message="Chargement de vos billets";
    this.api._get("nfts/0x0/0x0/" + this.user.addr + "/").subscribe((r: any) => {
      this.message="";
      this.nfts=r;
    });
  }

  onscan($event: any) {
    if($event.data.length>20 && $event.data.startsWith("erd")){
      this.validate_nfts=[];
      for(let nft of this.nfts){
        if(nft.owner==$event.data)
          this.validate_nfts.push(nft);
      }
      if(this.validate_nfts.length==0){
        showMessage(this,"Ce wallet ne posséde aucun de vos tokens")
      }
    }
  }


}
