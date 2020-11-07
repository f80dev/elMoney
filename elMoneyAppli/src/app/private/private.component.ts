import { Component, OnInit } from '@angular/core';
import {showError, showMessage} from "../tools";
import {ConfigService} from "../config.service";
import {Location} from "@angular/common";
import {Router} from "@angular/router";
import {UserService} from "../user.service";

@Component({
  selector: 'app-private',
  templateUrl: './private.component.html',
  styleUrls: ['./private.component.sass']
})
export class PrivateComponent implements OnInit {

  message:string="";
  savePrivateKey={value:false};

  constructor(public config:ConfigService,
              public router:Router,
              public user:UserService,
              public _location:Location) { }

  ngOnInit(): void {
  }

  import(fileInputEvent: any) {
      var reader = new FileReader();
      this.message="Signature ...";
      reader.onload = ()=>{
        this.message="Transfert des fonds";
        this.user.pem=reader.result.toString();
        if(this.savePrivateKey)localStorage.setItem("pem",this.user.pem);

        let pubkey=atob(this.user.pem.split("base64,")[1]);
        localStorage.setItem("addr","erd"+pubkey.split(" for erd")[1].split("---")[0]);
        this._location.back();
      };
      reader.readAsDataURL(fileInputEvent.target.files[0]);
  }

  openFAQ() {
    //TODO a connecter
  }
}
