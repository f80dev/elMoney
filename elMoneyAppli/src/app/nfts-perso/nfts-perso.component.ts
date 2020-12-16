import { Component, OnInit } from '@angular/core';
import {UserService} from "../user.service";
import {ApiService} from "../api.service";
import {$$, subscribe_socket} from "../tools";
import {ActivatedRoute, Router} from "@angular/router";
import {FormControl} from "@angular/forms";
import {Socket, SocketIoModule} from "ngx-socket-io";

@Component({
  selector: 'app-nfts-perso',
  templateUrl: './nfts-perso.component.html',
  styleUrls: ['./nfts-perso.component.sass']
})
export class NftsPersoComponent implements OnInit {
  message: string="";
  nfts: any[][]=[[],[]];
  selected:any = new FormControl(0);

  constructor(
    public routes:ActivatedRoute,
    public api:ApiService,
    public socket:Socket,
    public router:Router,
    public user:UserService,
  ) {
     subscribe_socket(this, "refresh_nft", () => {
      setTimeout(() => {this.refresh();}, 200)
    });

  }

  ngOnInit(): void {

    if (this.routes.snapshot.queryParamMap.has("index")) {
      this.selected.value=Number(this.routes.snapshot.queryParamMap.get("index"));
    }

    this.refresh();
    localStorage.setItem("last_screen","nfts-perso");
  }

   refresh() {
    for(let idx of [0,1]){
      let filters=["0x0","0x0"];
      filters[idx]=this.user.addr;
      this.message = "Chargement des tokens ...";
      this.api._get("nfts/"+filters[0]+"/"+filters[1]+"/").subscribe((r: any) => {
        this.message = "";
        this.nfts[idx]=r;
      });
    }
  }
}
