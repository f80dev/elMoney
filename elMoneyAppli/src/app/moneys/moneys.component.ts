import { Component, OnInit } from '@angular/core';
import {Location} from "@angular/common";
import {ApiService} from "../api.service";
import {$$, showMessage} from "../tools";
import {Router} from "@angular/router";
import {UserService} from "../user.service";

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

  select(addr:string){
    this.message="Changement de monnaie";
    this.api.set_contract(addr);
    this.user.refresh_balance(()=>{
      this.message="";
      this.router.navigate(["main"]);
    });
  }

  openContrat(contract: string) {
    open("https://testnet-explorer.elrond.com/transactions/"+contract);
  }

  openDoc(url: any) {
    open(url,"_blank");
  }
}
