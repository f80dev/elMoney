import {Component, Inject, OnInit, Sanitizer} from '@angular/core';
import {showError, showMessage, openFAQ, $$} from "../tools";
import {ConfigService} from "../config.service";
import {Location} from "@angular/common";
import {ActivatedRoute, Router} from "@angular/router";
import {UserService} from "../user.service";
import {ApiService} from "../api.service";
import {DialogData, PromptComponent} from "../prompt/prompt.component";
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";
import {DomSanitizer} from "@angular/platform-browser";
import {MatSnackBar} from "@angular/material/snack-bar";


@Component({
  selector: 'app-private',
  templateUrl: './private.component.html',
  styleUrls: ['./private.component.sass']
})
export class PrivateComponent implements OnInit {
  fileUrl;
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
    {label:"Judy",value:"judy.pem"},
    {label:"Thomas",value:"thomas.pem"},
    {label:"Herve",value:"herve.pem"},
    {label:"Test1",value:"test1.pem"},
    {label:"Test2",value:"test2.pem"},
    {label:"Test3",value:"test3.pem"},
    {label:"Test4",value:"test4.pem"}
  ]
  test_profil: any;

  constructor(public config:ConfigService,
              public dialogRef: MatDialogRef<PrivateComponent>,
              @Inject(MAT_DIALOG_DATA) public data: any,
              public api:ApiService,
              public dialog:MatDialog,
              public toast:MatSnackBar,
              public sanitizer:DomSanitizer,
              public user:UserService,
              public _location:Location) { }

  ngOnInit(): void {

    this.data.title=this.data.title || "Changer de compte";


    if(this.data.profil){
      this.change_user(this.data.profil+".pem");
    }
  }


  import(fileInputEvent: any) {
    var reader = new FileReader();
    this.message = "Signature ...";
    reader.onload = () => {
      this.message = "Changement de compte";
      this.change_user(reader.result.toString());
    }
    reader.readAsDataURL(fileInputEvent.target.files[0]);
  }




  quit(result=null){
    this.user.refresh_balance(()=> {
      this.dialogRef.close(result);
    },()=>{
      $$("Probleme de rafraichissement");
    });
  }


  change_user(profil:string){
    this.message="Vérification la clé";
    this.api._post("analyse_pem", "", profil, 240).subscribe((r: any) => {
      this.message="";

      if (this.user.addr != r.address) {
        if(this.data.canChange){
          $$("Changement de compte");
          localStorage.removeItem("addr");
          this.user.init(r.address, r.pem,()=>{this.quit(r);});
          localStorage.setItem("save_key","true");
        } else {
          showMessage(this,"Cette signature ne correspond pas à votre compte");
        }
      } else {
        this.quit(r);
      }
    },(err)=>{showError(this)});
  }




  select_model($event: any) {
    this.message="";
    if(this.user.pem || this.user.gas>1){
      this.dialog.open(PromptComponent, {
        width: '300px',
        data: {
          title: 'Changement de compte ?',
          question: "Un changement de compte entrainera la perte de votre solde si vous n'avez pas enregistrer votre clé",
          onlyConfirm: true,
          lbl_ok: 'Oui',
          lbl_cancel: 'Non'
        }
      }).afterClosed().subscribe((result_code) => {
        if (result_code == "yes") {
          this.change_user($event);
          localStorage.setItem("save_key","true");
        } else {
          this._location.back();
        }
      });
    } else {
      this.change_user($event);
    }


  }

  raz_account() {
    this.dialog.open(PromptComponent, {
      width: '80%',
      maxWidth: '300px',
      data: {
        title: 'Effacer votre compte',
        question: 'Si vous effacer votre compte, vous perdez immédiatement l\'ensemble de votre wallet. Etes vous sûr ?',
        onlyConfirm: true,
        lbl_ok: 'Oui',
        lbl_cancel: 'Non'
      }
    }).afterClosed().subscribe((result_code) => {
      if(result_code=="yes")
        this.user.reset();
    });
  }


  _faq(index: string) {
    openFAQ(this,index);
  }

  new_account() {
      this.message="Ouverture d'un nouveau compte sur le "+this.config.server.network+". Cela prendra moins de 1 minute, le temps de créditer quelques eGold pour les transactions et quelques 'TFC', la monnaie par défaut de l'application";
      $$("Création d'un nouveau compte");
      this.api._get("new_account/","",120).subscribe((r:any)=> {
        this.api.set_identifier(r["default_money"])
        this.user.init(r.address, r.pem,()=>{this.quit(r);});
      },(err)=>{
        showError(this);
        $$("!Impossible de créer le compte");
      });
  }
}
