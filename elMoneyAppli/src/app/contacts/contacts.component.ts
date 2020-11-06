import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";

@Component({
  selector: 'app-contacts',
  templateUrl: './contacts.component.html',
  styleUrls: ['./contacts.component.sass']
})
export class ContactsComponent implements OnInit {
  contacts: any;

  constructor(public api:ApiService) { }

  ngOnInit(): void {
    this.api._get("friends/"+localStorage.getItem("addr")).subscribe((r:any)=>{
      this.contacts=r;
    });
  }

}
