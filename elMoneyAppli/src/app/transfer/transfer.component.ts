import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {Router} from "@angular/router";
import {MatSnackBar} from "@angular/material/snack-bar";
import {showError, showMessage} from "../tools";
import {Location} from "@angular/common";

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
               public _location:Location,
               public router:Router,public toast:MatSnackBar) { }


  ngOnInit(): void {
     this.address_to=localStorage.getItem("last_to");
     this.amount=localStorage.getItem("last_amount");
     if(this.address_to){
       this.api._get("/balance/"+this.address_to).subscribe((r:any)=>{
         this.solde=r;
       })
     }
  }

   import(fileInputEvent: any) {
     localStorage.setItem("last_to",this.address_to);
     localStorage.setItem("last_amount",this.amount);
      var reader = new FileReader();
      this.message="Signature ...";
      reader.onload = ()=>{
        this.message="Transfert des fonds";
        this.api._post("transfer/"+this.address_to+"/"+this.amount,"",reader.result).subscribe((r:any)=>{
          this.message="";
          showMessage(this,"Fond transféré");
          localStorage.setItem("addr",r.from_addr);
          this._location.back();
        },(err)=>{
          showError(this,err);
        })
      };
      reader.readAsDataURL(fileInputEvent.target.files[0]);
  }

}
