import { Component, OnInit } from '@angular/core';
import {Router} from "@angular/router";
import {ApiService} from "../api.service";

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.sass']
})
export class MainComponent implements OnInit {
  addr: any;
  solde:any;

  constructor(public router:Router,public api:ApiService) { }

  ngOnInit(): void {
    this.addr=localStorage.getItem("addr");
    if(this.addr)
      this.api._get("/balance/"+this.addr+"/").subscribe((r:any)=>{
        this.solde=r;
      })
  }

}
