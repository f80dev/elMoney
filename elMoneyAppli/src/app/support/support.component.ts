import { Component, OnInit } from '@angular/core';
import {ConfigService} from "../config.service";
import {ActivatedRoute} from "@angular/router";
import {environment} from "../../environments/environment";
import {Location} from "@angular/common";

@Component({
  selector: 'app-support',
  templateUrl: './support.component.html',
  styleUrls: ['./support.component.sass']
})
export class SupportComponent implements OnInit {
  private message: string="";

  constructor(
    public _location:Location,
    public routes:ActivatedRoute,
    public config:ConfigService) { }

  ngOnInit(): void {
    this.message=this.routes.snapshot.queryParamMap.get("message");
  }

  openForum() {
    open("https://t.me/el_money_forum");
  }

  restart(reset: boolean) {
    if(reset){
      localStorage.removeItem("addr");
      localStorage.removeItem("contract");
    }
    window.location.href=environment.domain_appli;
  }
}
