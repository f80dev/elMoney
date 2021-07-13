import { Component, OnInit } from '@angular/core';
import {UserService} from "../user.service";
import {Router} from "@angular/router";
import {environment} from "../../environments/environment";
import {ConfigService} from "../config.service";

@Component({
  selector: 'app-sidemenu',
  templateUrl: './sidemenu.component.html',
  styleUrls: ['./sidemenu.component.sass']
})
export class SidemenuComponent implements OnInit {

  isLocal:boolean;

  constructor(public router:Router,
              public config:ConfigService,
              public user:UserService) { }

  ngOnInit(): void {
    this.isLocal=!environment.production;
    if(localStorage.getItem("addr")){
      this.user.init(localStorage.getItem("addr"),()=>{this.user.refresh_balance();});
    }

  }

  logout() {
    this.user.logout("Se déconnecter",()=>{
      this.router.navigate(["store"])
    });
  }
}
