import { Component, OnInit } from '@angular/core';
import {Router} from "@angular/router";
import {ApiService} from "../api.service";
import {ConfigService} from "../config.service";
import {showMessage} from "../tools";
import {MatSnackBar} from "@angular/material/snack-bar";

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.sass']
})
export class MainComponent implements OnInit {
  addr: any;
  solde:any;
  name:string;
  url_explorer: string="";

  constructor(public router:Router,
              public toast:MatSnackBar,
              public api:ApiService,public config:ConfigService) { }

  refresh(){
    this.addr=localStorage.getItem("addr");
    if(this.addr){
      if(this.api.contract){
        this.api.balance(this.addr).subscribe((r:any)=>{
          this.solde=r;
        },(err)=>{
          showMessage(this,"Aucune monnaie sélectionnée");
          localStorage.removeItem("contract");
          this.router.navigate(["create"]);
        });
      }
    } else {
      this.api._get("new_account/").subscribe((r:any)=>{
        localStorage.setItem("addr",r.addr);
        this.addr=r.addr;
        this.config.pem=btoa(r.pem);
        this.refresh();
      })
    }
  }

  ngOnInit(): void {
    this.refresh();
  }

  informe_clipboard() {
    showMessage(this,"Adresse dans le presse papier")
  }
}
