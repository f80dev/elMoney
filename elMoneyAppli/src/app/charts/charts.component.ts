import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {Router} from "@angular/router";
import {subscribe_socket} from "../tools";

@Component({
  selector: 'app-charts',
  templateUrl: './charts.component.html',
  styleUrls: ['./charts.component.sass']
})
export class ChartsComponent implements OnInit {
  profils: any[]=[];
  message="";
  addrs=[];

  constructor(
    public api:ApiService,
    public router:Router
  ) {
     subscribe_socket(this,"refresh_account",($event)=>{
       this.refresh();
     });
  }

  refresh(){
    this.api._get("transactions","").subscribe((r:any)=>{
      this.addrs=Object.keys(r.charts);
      this.profils=r.charts;
    });
  }

  ngOnInit(): void {
    this.refresh();
  }

  open_creator(miner:any) {
    this.router.navigate(["miner"],{queryParams:{miner:miner.addr}});
  }
}
