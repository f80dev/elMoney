import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {Router} from "@angular/router";
import {MatSnackBar} from "@angular/material/snack-bar";
import {showError, showMessage} from "../tools";
import {Location} from "@angular/common";
import {toBase64String} from "@angular/compiler/src/output/source_map";
import {ConfigService} from "../config.service";

@Component({
  selector: 'app-transfer',
  templateUrl: './transfer.component.html',
  styleUrls: ['./transfer.component.sass']
})
export class TransferComponent implements OnInit {

  message: string="";
  amount: any;
  address_to: any;
  solde: any;

   constructor(public api:ApiService,
               public config:ConfigService,
               public _location:Location,
               public router:Router,public toast:MatSnackBar) { }


  ngOnInit(): void {
     if(!this.config.pem)this.router.navigate(["private"]);
     this.address_to=localStorage.getItem("last_to");
     this.amount=localStorage.getItem("last_amount");
     if(this.address_to){
       this.api.balance(this.address_to).subscribe((r:any)=>{
         this.solde=r;
       })
     }
  }


  transfer() {
    localStorage.setItem("last_to", this.address_to);
    localStorage.setItem("last_amount", this.amount);
    this.api._post("transfer/" + this.api.contract + "/" + this.address_to + "/" + this.amount, "", this.config.pem).subscribe((r: any) => {
      this.message = "";
      showMessage(this, "Fond transféré");
      this._location.back();
    }, (err) => {
      showError(this, err);
    })

  }
}
