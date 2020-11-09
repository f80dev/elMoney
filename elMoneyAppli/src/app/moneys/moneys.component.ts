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

  constructor(public api:ApiService,
              public router:Router,
              public user:UserService,
              public _location:Location) { }

  ngOnInit(): void {
    this.api._get("moneys/"+this.user.addr).subscribe((r:any)=>{
      this.moneys=r;
    })
  }

  select(addr:string){
    this.api.set_contract(addr);
    this._location.back();
  }

  openContrat(contract: string) {
    open("https://testnet-explorer.elrond.com/transactions/"+contract);
  }

  openDoc(url: any) {
    open(url,"_blank");
  }
}
