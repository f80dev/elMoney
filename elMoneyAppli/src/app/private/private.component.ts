import { Component, OnInit } from '@angular/core';
import {showError, showMessage} from "../tools";
import {ConfigService} from "../config.service";
import {Location} from "@angular/common";

@Component({
  selector: 'app-private',
  templateUrl: './private.component.html',
  styleUrls: ['./private.component.sass']
})
export class PrivateComponent implements OnInit {

  message:string="";

  constructor(public config:ConfigService,public _location:Location) { }

  ngOnInit(): void {
  }

  import(fileInputEvent: any) {

      var reader = new FileReader();
      this.message="Signature ...";
      reader.onload = ()=>{
        this.message="Transfert des fonds";
        this.config.pem=reader.result.toString();
        this._location.back();
      };
      reader.readAsDataURL(fileInputEvent.target.files[0]);
  }
}
