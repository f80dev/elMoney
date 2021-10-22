import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {UserService} from "../user.service";
import {Router} from "@angular/router";
import {MatSnackBar} from "@angular/material/snack-bar";
import {ConfigService} from "../config.service";

@Component({
  selector: 'app-votes',
  templateUrl: './votes.component.html',
  styleUrls: ['./votes.component.sass']
})
export class VotesComponent implements OnInit {

  charts: any[]=[];

  constructor(
    public api:ApiService,
    public user:UserService,
    public router:Router,
    public toast:MatSnackBar,
    public config:ConfigService,
  ) { }

  ngOnInit(): void {
    this.user.check_pem(()=>{
      this.api._get("votes/"+this.user.addr,"").subscribe((r:any)=>{
        for(let item of Object.values(r)){
          let data=[];
          for(let k of Object.keys(item["data"])){
            data.push([k,item["data"][k]]);
          }

          this.charts.push({
            title:item["title"],
            type:"PieChart",
            data:data,
            width:400,
            height:400,
            options:{responsive:true}
          })
        }
      })
    },this);
  }

}
