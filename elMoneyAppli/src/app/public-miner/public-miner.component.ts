import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {ActivatedRoute} from "@angular/router";

@Component({
  selector: 'app-public-miner',
  templateUrl: './public-miner.component.html',
  styleUrls: ['./public-miner.component.sass']
})
export class PublicMinerComponent implements OnInit {
  miner: any;

  constructor(
    public api:ApiService,
    public routes:ActivatedRoute
  ) { }

  ngOnInit(): void {
    let addr=this.routes.snapshot.queryParamMap.get("addr");
    this.api._get("users/"+addr+"/","").subscribe((data:any)=>{
      this.miner=data;
    });
  }

}
