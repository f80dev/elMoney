import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {UserService} from "../user.service";
import {Router} from "@angular/router";
import {MatSnackBar} from "@angular/material/snack-bar";
import {ConfigService} from "../config.service";
import {subscribe_socket} from "../tools";
import {Socket} from "ngx-socket-io";

@Component({
  selector: 'app-votes',
  templateUrl: './votes.component.html',
  styleUrls: ['./votes.component.sass']
})
export class VotesComponent implements OnInit {

  charts: any[]=[];
  all_nfts=false;
  message: string="";

  constructor(
    public api:ApiService,
    public user:UserService,
    public router:Router,
    public toast:MatSnackBar,
    public socket:Socket,
    public config:ConfigService,
  ) {
    subscribe_socket(this, "answer_nft", () => {
        this.refresh();
    });
  }

  refresh(){
    this.message="Récupération des statistiques";
    this.api._get("votes/"+this.user.addr,"").subscribe((r:any)=>{
      this.charts=[];
      let visible=false;
      for(let item of Object.values(r)){
        let data=[];
        for(let k of Object.keys(item["data"])){
          let label=k;
          if(k!="0" || this.all_nfts){
            if(k=="0")label="Non Réponse";
            data.push([label,item["data"][k]]);
            visible=true;
          }
        }

        this.charts.push({
          title: item["title"],
          type:"PieChart",
          visible:visible,
          data:data,
          width:400,
          height:400,
          options:{
            backgroundColor: '#7b7b7b',
            is3D: true,
            responsive:true,
            areaOpacity: 0
          }
        })
      }
      this.message="";
    });
  }

  ngOnInit(): void {
    this.user.check_pem(()=>{
      this.refresh();
    },this);
  }

}
