import { Component, OnInit } from '@angular/core';
import {Location} from "@angular/common";
import {ApiService} from "../api.service";
import {$$, showMessage} from "../tools";
import {ActivatedRoute, Router} from "@angular/router";
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
              public routes:ActivatedRoute,
              public dialog:MatDialog,
              public config:ConfigService,
              public toast:MatSnackBar,
              public user:UserService,
              public _location:Location) { }



  ngOnInit(): void {

    this.refresh();
  }

  refresh(){
    this.message="Chargement des monnaies";
    this.api._get("moneys/"+this.user.addr).subscribe((r:any)=>{
      this.message="";
      delete r.egld; //On n'affiche pas les eGold dans les monnaies
      this.moneys=Object.values(r);

      if(this.routes.snapshot.queryParamMap.get("select")){
        for(let m of this.moneys){
          if(m.unity==this.routes.snapshot.queryParamMap.get("select"))
            this.select(m);
        }
      }

    })
  }

  delete_money(identifier:string){
    $$("On supprime la monnaie "+identifier);
     this.dialog.open(PromptComponent, {
      data: {
        title: 'Déréférencer une monnaie',
        question: 'La monnaie restera utilisable mais ne sera plus visible dans la liste des monnaies disponibles. Etes vous sûr ?',
        onlyConfirm: true,
        lbl_ok: 'Oui',
        lbl_cancel: 'Non'
      }}).afterClosed().subscribe((result:any) => {
        if(result){
          this.api._delete("money/"+identifier).subscribe(()=>{
            this.refresh();
          });
        }
      });
  }

  select(_m:any){
    this.message="Changement de monnaie";
    this.api.set_identifier(_m.identifier);
    this.user.selected_money=_m.identifier;
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
