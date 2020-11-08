import { Component, OnInit } from '@angular/core';
import {showError, showMessage} from "../tools";
import {ConfigService} from "../config.service";
import {Location} from "@angular/common";
import {Router} from "@angular/router";
import {UserService} from "../user.service";
import {ApiService} from "../api.service";

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
              public api:ApiService,
              public user:UserService,
              public _location:Location) { }

  ngOnInit(): void {
  }

  import(fileInputEvent: any) {
      var reader = new FileReader();
      this.message="Signature ...";
      reader.onload = ()=>{
        this.message="Changement de compte";
        this.api._post("analyse_pem","",reader.result.toString(),240).subscribe((r:any)=>{
          this.user.init(r.address, {pem:r.pem});
          window.location.reload();
        })
      };
      reader.readAsDataURL(fileInputEvent.target.files[0]);
  }

  openFAQ() {
    //TODO a connecter
  }
}
