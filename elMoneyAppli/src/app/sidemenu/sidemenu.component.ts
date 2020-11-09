import { Component, OnInit } from '@angular/core';
import {UserService} from "../user.service";
import {Router} from "@angular/router";
import {environment} from "../../environments/environment";

@Component({
  selector: 'app-sidemenu',
  templateUrl: './sidemenu.component.html',
  styleUrls: ['./sidemenu.component.sass']
})
export class SidemenuComponent implements OnInit {

  isLocal:boolean;

  constructor(public router:Router,
              public user:UserService) { }

  ngOnInit(): void {
    this.isLocal=!environment.production;
  }

}
