import {Component, OnInit } from '@angular/core';
import {showError, showMessage,openFAQ} from "../tools";
import {ConfigService} from "../config.service";
import {Location} from "@angular/common";
import {ActivatedRoute, Router} from "@angular/router";
import {UserService} from "../user.service";
import {ApiService} from "../api.service";
import {PromptComponent} from "../prompt/prompt.component";
import {MatDialog} from "@angular/material/dialog";


@Component({
  selector: 'app-private',
  templateUrl: './private.component.html',
  styleUrls: ['./private.component.sass']
})
export class PrivateComponent implements OnInit {

  message:string="";
  savePrivateKey={value:false};
  profils: any=[
    {label:"Alice",value:"alice.pem"},
    {label:"Eve",value:"eve.pem"},
    {label:"Dan",value:"dan.pem"},
    {label:"Grace",value:"grace.pem"},
    {label:"Franck",value:"franck.pem"},
    {label:"Ivan",value:"ivan.pem"},
    {label:"Mallory",value:"mallory.pem"},
    {label:"Judy",value:"judy.pem"}
  ]
  test_profil: any;

  constructor(public config:ConfigService,
              public router:Router,
              public api:ApiService,
              public dialog:MatDialog,
              public routes:ActivatedRoute,
              public user:UserService,
              public _location:Location) { }

  ngOnInit(): void {
    let profil=this.routes.snapshot.queryParamMap.get("profil");
    if(profil){
      this.change_user(profil+".pem");
    }
  }

  import(fileInputEvent: any) {
    var reader = new FileReader();
    this.message = "Signature ...";
    reader.onload = () => {
      this.message = "Changement de compte";
      this.api._post("analyse_pem", "", reader.result.toString(), 240).subscribe((r: any) => {
        if (this.user.addr != r.address) {
          this.change_user(r);
        } else {
          this.user.init(r.address, {pem: r.pem});
          this._location.back();
        }
      },(err)=>{
        showError(this,err);
      });
    }
    reader.readAsDataURL(fileInputEvent.target.files[0]);
  }





  change_user(profil:string){
    this.message="Chargement du profil de test";
    this.api._post("analyse_pem", "", profil, 240).subscribe((r: any) => {
      this.message="";
      localStorage.removeItem("addr");
      localStorage.removeItem("pem");
      this.user.init(r.address, {pem: r.pem},()=>{
        this._location.go(".");
      });
    },(err)=>{showError(this)});
  }

  select_model($event: any) {
    this.message="";
    this.dialog.open(PromptComponent, {
      width: '80%',
      data: {
        title: 'Changement de compte ???',
        question: "Cette clé ne correspond pas à votre compte actuel, changer de compte (assurez vous d'avoir sauvegardé la clé du compte actuel) ?",
        onlyConfirm: true,
        lbl_ok: 'Oui',
        lbl_cancel: 'Non'
      }
    }).afterClosed().subscribe((result_code) => {
      if (result_code == "yes") {
        this.change_user($event);
      } else {
        this._location.back();
      }
    });

}



_faq(index: string) {
  openFAQ(this,index);
}
}
