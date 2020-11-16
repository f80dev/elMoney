import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {Router} from "@angular/router";
import {showError, showMessage} from "../tools";
import {MatSnackBar} from "@angular/material/snack-bar";
import {UserService} from "../user.service";
import {ConfigService} from "../config.service";

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.sass']
})
export class AdminComponent implements OnInit {
  password: any="";



   constructor(public api:ApiService,
               public toast:MatSnackBar,
               public config:ConfigService,
               public user:UserService,
               public router:Router) { }


  ngOnInit(): void {

  }


  raz() {
    this.api._get("raz/hh4271/").subscribe(()=>{
      showMessage(this,"Base effacée");
      this.user.reset();
    });
  }
}
