import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {Location} from "@angular/common";
import {MatSnackBar} from "@angular/material/snack-bar";
import {UserService} from "../user.service";
import {ActivatedRoute, Router} from "@angular/router";
import {showError} from "../tools";

@Component({
  selector: 'app-contacts',
  templateUrl: './contacts.component.html',
  styleUrls: ['./contacts.component.sass']
})
export class ContactsComponent implements OnInit {

  email: any="";
  pseudo: any="";
  message="";

  constructor(public api:ApiService,
              public user:UserService,
              public toast:MatSnackBar,
              public router:Router,
              public routes:ActivatedRoute,
              public _location:Location) {

  }

  ngOnInit(): void {
    this.user.check_pem(()=>{
      this.user.load_contacts();
    },this.router);
  }


  add_contact($event: any) {
    if($event.keyCode==13){
      this.message="Ajout du contact";
      this.user.add_contact(this.email,(r:any)=>{
        this.user.load_contacts((r:any)=>{
          this.message="";
          this.email="";
        });

        if(this.routes.snapshot.queryParamMap.has("onlyNew")){
          this.user.last_contact=$event.currentTarget["value"];
        }
      },(err)=>{
        showError(this,err);
      });

    }
  }


  del_contact(contact: any) {
    this.message="Suppression du contact";
    this.user.del_contact(contact);
  }

  onflash_event($event: any) {
    this.email=$event.data;
    this.add_contact({keyCode:13});
  }
}
