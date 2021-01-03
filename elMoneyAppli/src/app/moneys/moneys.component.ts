import { Component, OnInit } from '@angular/core';
import {Location} from "@angular/common";
import {ApiService} from "../api.service";
import {$$, showMessage} from "../tools";
import {Router} from "@angular/router";
import {UserService} from "../user.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {ConfigService} from "../config.service";
import {NewContactComponent} from "../new-contact/new-contact.component";
import {MatDialog} from "@angular/material/dialog";
import {PromptComponent} from "../prompt/prompt.component";

@Component({
  selector: 'app-moneys',
  templateUrl: './moneys.component.html',
  styleUrls: ['./moneys.component.sass']
})
export class MoneysComponent implements OnInit {
  moneys: any[]=[];
  message: string="";

  constructor(public api:ApiService,
              public router:Router,
              public dialog:MatDialog,
              public config:ConfigService,
              public toast:MatSnackBar,
              public user:UserService,
              public _location:Location) { }



  ngOnInit(): void {
    this.refresh();
  }

  refresh(){
    this.api._get("moneys/"+this.user.addr).subscribe((r:any)=>{
      this.moneys=r;
    })
  }

  delete_money(idx:string){
    $$("On supprime la monnaie "+idx);
     this.dialog.open(PromptComponent, {
      data: {
        title: 'Déréférencer une monnaie',
        question: 'La monnaie restera utilisable mais ne sera plus visible dans la liste des monnaies disponibles. Etes vous sûr ?',
        onlyConfirm: true,
        lbl_ok: 'Oui',
        lbl_cancel: 'Non'
      }}).afterClosed().subscribe((result:any) => {
        if(result){
          this.api._delete("money/"+idx).subscribe(()=>{
            this.refresh();
          });
        }
      });
  }

  select(_m:any){
    debugger
    this.message="Changement de monnaie";
    this.api.set_idx(_m.idx);
    this.user.refresh_balance(()=>{
      this.message="";
      this.router.navigate(["main"]);
    },()=>{
      this.message="";
      showMessage(this,"Problème technique, sélectionner une autre monnaie");
    });
  }

  openContrat(contract: string) {
    open("https://testnet-explorer.elrond.com/address/"+contract);
  }

  openDoc(url: any) {
    if(url.length>0)open(url,"_blank");
  }
}
