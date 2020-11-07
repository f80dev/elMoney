import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {Location} from "@angular/common";
import {showMessage} from "../tools";
import {MatSnackBar} from "@angular/material/snack-bar";
import {UserService} from "../user.service";

@Component({
  selector: 'app-contacts',
  templateUrl: './contacts.component.html',
  styleUrls: ['./contacts.component.sass']
})
export class ContactsComponent implements OnInit {
  contacts: any;
  email: any;

  constructor(public api:ApiService,
              public user:UserService,
              public toast:MatSnackBar,
              public _location:Location) { }

  ngOnInit(): void {

  }


  add_contact($event: KeyboardEvent) {
    if($event.keyCode==13){
      this.user.add_contact($event.currentTarget["value"]);
    }
  }

  del_contact(email: any) {
    this.user.del_contact(email);
  }
}
