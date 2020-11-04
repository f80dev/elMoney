import { Component, OnInit } from '@angular/core';
import {Location} from "@angular/common";
import {ApiService} from "../api.service";
import {showMessage} from "../tools";

@Component({
  selector: 'app-moneys',
  templateUrl: './moneys.component.html',
  styleUrls: ['./moneys.component.sass']
})
export class MoneysComponent implements OnInit {
  moneys: any[]=[];

  constructor(public api:ApiService,
              public _location:Location) { }

  ngOnInit(): void {
    this.api._get("moneys/").subscribe((r:any)=>{
      this.moneys=r;
    })
  }

  select(addr:string){
    localStorage.setItem("contract",addr);
    this._location.back();
  }

  openContrat(contract: string) {
    open("https://testnet-explorer.elrond.com/transactions/"+contract);
  }
}
