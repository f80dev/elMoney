import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {Location} from "@angular/common";
import {MatSnackBar} from "@angular/material/snack-bar";
import {UserService} from "../user.service";
import {ActivatedRoute, Router} from "@angular/router";

@Component({
  selector: 'app-contacts',
  templateUrl: './contacts.component.html',
  styleUrls: ['./contacts.component.sass']
})
export class ContactsComponent implements OnInit {
  contacts: any;
  email: any="";
  pseudo: any="";

  constructor(public api:ApiService,
              public user:UserService,
              public toast:MatSnackBar,
              public router:Router,
              public routes:ActivatedRoute,
              public _location:Location) {
    this.user.check_email(null,this.router);
  }

  ngOnInit(): void {

  }


  add_contact($event: any) {
    if($event.keyCode==13){
      this.user.add_contact(this.email);
      if(this.routes.snapshot.queryParamMap.has("onlyNew")){
        this.user.last_contact=$event.currentTarget["value"];
      }
    }
  }

  del_contact(email: any) {
    this.user.del_contact(email);
  }
}
