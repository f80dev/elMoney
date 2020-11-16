import { Component, OnInit } from '@angular/core';
import {Location} from "@angular/common";
import {ApiService} from "../api.service";
import {$$, showMessage} from "../tools";
import {Router} from "@angular/router";
import {UserService} from "../user.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {ConfigService} from "../config.service";

@Component({
  selector: 'app-moneys',
  templateUrl: './moneys.component.html',
  styleUrls: ['./moneys.component.sass']
})
export class MoneysComponent implements OnInit {
  moneys: any[]=[];
  message: string="";

  constructor(public api:ApiService,
              public router:Router,
              public config:ConfigService,
              public toast:MatSnackBar,
              public user:UserService,
              public _location:Location) { }

  ngOnInit(): void {
    this.api._get("moneys/"+this.user.addr).subscribe((r:any)=>{
      this.moneys=r;
    })
  }

  delete_money(addr:string){
    //TODO: a raccorder
    $$("On supprime la monnaie "+addr);
    this.api._delete("money/"+addr).subscribe(()=>{});
    if(this.api.contract==addr)
      localStorage.removeItem("contract");
  }

  select(_m:any){
    this.message="Changement de monnaie";
    this.api.set_contract(_m.addr);
    this.user.refresh_balance(()=>{
      this.message="";
      this.router.navigate(["main"]);
    },()=>{
      this.message="";
      showMessage(this,"Problème technique, sélectionner une autre monnaie");
    });
  }

  openContrat(contract: string) {
    open("https://testnet-explorer.elrond.com/address/"+contract);
  }

  openDoc(url: any) {
    if(url.length>0)open(url,"_blank");
  }
}
