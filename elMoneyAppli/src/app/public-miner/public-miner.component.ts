import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {ActivatedRoute, Router} from "@angular/router";
import {UserService} from "../user.service";
import {group_tokens, showMessage} from "../tools";
import {ConfigService} from "../config.service";
import {MatSnackBar} from "@angular/material/snack-bar";

@Component({
  selector: 'app-public-miner',
  templateUrl: './public-miner.component.html',
  styleUrls: ['./public-miner.component.sass']
})
export class PublicMinerComponent implements OnInit {
  miner: any;
  nfts: any;
  show_add_miner=true;
  message: string="";

  constructor(
    public api:ApiService,
    public router:Router,
    public toast:MatSnackBar,
    public config:ConfigService,
    public routes:ActivatedRoute,
    public user:UserService
  ) { }

  ngOnInit(): void {
    let addr=this.routes.snapshot.queryParamMap.get("miner");
    this.api._get("users/"+addr+"/","").subscribe((data:any)=>{
      this.miner=data[0];
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

  ref_miner() {
    this.user.check_pem(()=>{
      this.message="Référencement en cours";
      this.api._post("add_miner/","",{address:this.miner.addr,pem:this.user.pem}).subscribe(()=>{
        showMessage(this,"Mineur ajoute");
        this.message="";
        this.router.navigate(["miners"]);
      },(err)=>{
        this.show_add_miner=false;
        this.router.navigate(["miners"]);
        showMessage(this,err.error);
        this.message="";
      })
    },this);
  }
}
