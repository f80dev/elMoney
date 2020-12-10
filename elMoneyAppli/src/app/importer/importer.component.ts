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
  file:string="vide";
  count: any=1;
  secret: any="monsecret";
  price: any=0;
  uri: any="montoken";
  cost=0;

  constructor(public api:ApiService,
              public user:UserService,
              public toast:MatSnackBar,
              public router:Router) { }

  ngOnInit(): void {
    // this.api._get("evalprice/"+this.user.addr+"/kjfdkljgklfdjgklfdjklgfdlk/0/").subscribe((r:any)=>{
    //   if(!r.hasOwnProperty("error")){
    //     this.cost=r.txGasUnits;
    //   }
    // })
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
      signature:this.uri,
      secret:this.secret,
      price:this.price,
    };
    this.message="Enregistrement dans la blockchain";
    this.api._post("mint/"+this.count,"",obj).subscribe((r:any)=>{
      this.message="";
      showMessage(this,"Fichier tokeniser pour "+r.tx.cost+" xEgld");
      this.user.refresh_balance(()=>{
        this.router.navigate(["store"],{queryParams:{perso_only:true}});
      })
    })
  }
}
