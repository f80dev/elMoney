import { Component, OnInit } from '@angular/core';
import {showError, showMessage} from "../tools";
import {ApiService} from "../api.service";
import {Router} from "@angular/router";
import {UserService} from "../user.service";
import {stringify} from "@angular/compiler/src/util";
import {MatSnackBar} from "@angular/material/snack-bar";

@Component({
  selector: 'app-importer',
  templateUrl: './importer.component.html',
  styleUrls: ['./importer.component.sass']
})
export class ImporterComponent implements OnInit {

  message: string="";
  signature: any="masignature";
  file:string="vide";
  count: any=1;
  price: any=0;

  constructor(public api:ApiService,
              public user:UserService,
              public toast:MatSnackBar,
              public router:Router) { }

  ngOnInit(): void {
  }

   import(fileInputEvent: any) {
      var reader = new FileReader();
      this.message="Chargement du fichier";
      reader.onload = ()=>{
        this.file=stringify(reader.result);
        this.message="";
      }
      reader.readAsDataURL(fileInputEvent.target.files[0]);
  }


  tokenizer() {
    let obj={
      pem:this.user.pem["pem"],
      owner:this.user.addr,
      file:this.file,
      signature:this.signature,
      price:this.price,
    };
    this.api._post("mint/"+this.count,"",obj).subscribe(()=>{
      showMessage(this,"Fichier tokeniser");
    })
  }
}
