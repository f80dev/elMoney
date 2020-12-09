import { Component, OnInit } from '@angular/core';
import {ConfigService} from "../config.service";
import {ActivatedRoute, Router} from "@angular/router";
import {environment} from "../../environments/environment";
import {Location} from "@angular/common";
import {UserService} from "../user.service";
import {checkConfig} from "../tools";
import {MatSnackBar} from "@angular/material/snack-bar";

@Component({
  selector: 'app-support',
  templateUrl: './support.component.html',
  styleUrls: ['./support.component.sass']
})
export class SupportComponent implements OnInit {
  message: string="";

  constructor(
    public _location:Location,

    public user:UserService,
    public toast:MatSnackBar,
    public router:Router,
    public routes:ActivatedRoute,
    public config:ConfigService) { }


  ngOnInit(): void {
    checkConfig(this);
    this.message=this.routes.snapshot.queryParamMap.get("message");
    this._location.replaceState("./support");
  }

  openForum() {
    if(!this.config.values)
      open("https://t.me/coinmaker_forum");
    else
      open(this.config.values.support.forum);
  }

  restart(reset: boolean) {
    this.user.reset();
  }
}
