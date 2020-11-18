import { Component, OnInit } from '@angular/core';
import {showError, showMessage} from "../tools";
import {ApiService} from "../api.service";
import {Router} from "@angular/router";

@Component({
  selector: 'app-importer',
  templateUrl: './importer.component.html',
  styleUrls: ['./importer.component.sass']
})
export class ImporterComponent implements OnInit {

  message: string="";
  signature: any="";

  constructor(public api:ApiService,public router:Router) { }

  ngOnInit(): void {
  }

   import(fileInputEvent: any) {
      var reader = new FileReader();
      this.message="Chargement du fichier";
      reader.onload = ()=>{
        this.message="Transfert du fichier";
        this.api._post("importer/","",reader.result,200).subscribe((r:any)=>{
          this.message="";
          showMessage(this,r);
          this.router.navigate(["search"])
        },(err)=>{
          showError(this,err);
        })
      };
      reader.readAsDataURL(fileInputEvent.target.files[0]);
  }


  tokenizer() {
    //TODO appeler l'api pour envoie dans la blockchain
  }
}
