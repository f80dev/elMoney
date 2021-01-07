import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {subscribe_socket} from "../tools";
import {UserService} from "../user.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {ActivatedRoute, Router} from "@angular/router";
import {Socket} from "ngx-socket-io";
import {environment} from "../../environments/environment";

@Component({
  selector: 'app-nft-store',
  templateUrl: './nft-store.component.html',
  styleUrls: ['./nft-store.component.sass']
})
export class NftStoreComponent implements OnInit {
  nfts: any[] = [];
  message = "";
  transac_cost=environment.transac_cost;
  filter: any={value:""};
  filter_id: number=null;
  filter_ids: any[]=[];

  constructor(public api: ApiService,
              public routes: ActivatedRoute,
              public toast: MatSnackBar,
              public socket: Socket,
              public router: Router,
              public user: UserService
  ) {
    subscribe_socket(this, "refresh_nft", () => {
      setTimeout(() => {
        this.refresh(false);
      }, 200)
    });
  }



  ngOnInit(): void {
    if (this.routes.snapshot.queryParamMap.has("filter")) {
      this.filter = "token:"+this.routes.snapshot.queryParamMap.get("filter");
    }

    if (this.routes.snapshot.queryParamMap.has("id")) {
      this.filter_id = Number(this.routes.snapshot.queryParamMap.get("id"));
    }

    if (this.routes.snapshot.queryParamMap.has("ids")) {
      this.filter_ids = this.routes.snapshot.queryParamMap.get("ids").split(",");
    }

    this.refresh();
    localStorage.setItem("last_screen","store");
  }




  refresh(withMessage = true) {
    if (withMessage) this.message = "Chargement des tokens ...";
    this.api._get("nfts/").subscribe((r: any) => {
      this.message = "";
      this.nfts = [];
      for (let item of r) {
        item.message = "";
        item.open = "";

        if (!this.filter_id || this.filter_id == item.token_id) {
          if (item.state == 0) {
            this.nfts.push(item);
          }
        }
      }
    });
  }






  clearQuery() {
    this.filter.value='';
    if(this.nfts.length>100) {
      this.refresh(false);
    }
  }

  handle:any;
  onQuery($event: KeyboardEvent) {
    if(this.nfts.length>100){
      clearTimeout(this.handle);
      this.handle=setTimeout(()=>{
        this.refresh(false);
      },1000);
    }
  }





}
