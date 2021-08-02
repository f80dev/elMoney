import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";

@Component({
  selector: 'app-charts',
  templateUrl: './charts.component.html',
  styleUrls: ['./charts.component.sass']
})
export class ChartsComponent implements OnInit {
  dealers: any[]=[];
  message="";
  addrs=[];

  constructor(
    public api:ApiService
  ) { }

  ngOnInit(): void {
    this.api._get("transactions","").subscribe((r:any)=>{
      this.addrs=Object.keys(r.charts);
      this.dealers=r.charts;
    })
  }

}
