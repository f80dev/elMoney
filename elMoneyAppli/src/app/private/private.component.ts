import { Component, OnInit } from '@angular/core';
import {showError, showMessage} from "../tools";
import {ConfigService} from "../config.service";
import {Location} from "@angular/common";
import {Router} from "@angular/router";

@Component({
  selector: 'app-private',
  templateUrl: './private.component.html',
  styleUrls: ['./private.component.sass']
})
export class PrivateComponent implements OnInit {

  message:string="";
  savePrivateKey: any;

  constructor(public config:ConfigService,
              public router:Router,
              public _location:Location) { }

  ngOnInit(): void {
  }

  import(fileInputEvent: any) {
      var reader = new FileReader();
      this.message="Signature ...";
      reader.onload = ()=>{
        this.message="Transfert des fonds";
        this.config.pem=reader.result.toString();
        let pubkey=atob(this.config.pem.split("base64,")[1]);
        localStorage.setItem("addr","erd"+pubkey.split(" for erd")[1].split("---")[0]);
        this._location.back();
      };
      reader.readAsDataURL(fileInputEvent.target.files[0]);
  }

  openFAQ() {
    //TODO a connecter
  }
}
