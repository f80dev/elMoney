import {Component, Inject, OnInit} from '@angular/core';
import {ConfigService} from "../config.service";
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";
import {ApiService} from "../api.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {DomSanitizer} from "@angular/platform-browser";
import {UserService} from "../user.service";
import {Location} from "@angular/common";
import {$$, showError, showMessage} from "../tools";
import {WalletconnectService} from "../walletconnect.service";

@Component({
  selector: 'app-authent',
  templateUrl: './authent.component.html',
  styleUrls: ['./authent.component.sass']
})
export class AuthentComponent implements OnInit {
  message: string="";
  showScanner=true;
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
  authent_method: any="email";

  constructor(public config:ConfigService,
              public dialogRef: MatDialogRef<AuthentComponent>,
              @Inject(MAT_DIALOG_DATA) public data: any,
              public api:ApiService,
              public dialog:MatDialog,
              public toast:MatSnackBar,
              public walletconnect:WalletconnectService,
              public sanitizer:DomSanitizer,
              public user:UserService,
              public _location:Location) {
    if(!this.user.addr)this.user.addr=localStorage.getItem("addr");
    if(this.user.addr){
      this.quit({address:this.user.addr});
    }
  }

  ngOnInit(): void {

  }

  quit(result:any){
    this.dialogRef.close(result);
  }

  udpate_mail(){
    this.message="Récupération de votre compte ou ouverture d'un nouveau compte sur le "+this.config.server.network;
    this.api._get("new_account/","email="+this.user.email,240).subscribe((r:any)=> {
      this.message="";
      this.api.set_identifier(r["default_money"])
      this.quit(r);
    },(err)=>{
      showError(this);
      $$("!Impossible de créer le compte");
    });
  }




  change_user(profil:string){
    this.message="Vérification la clé";
    this.api._post("analyse_pem", "", profil, 240).subscribe((r: any) => {
      this.message="";
      $$("Changement de compte");
      this.user.pem=r.pem;
      this.user.init(r.address, ()=>{this.quit(r);});
    },(err)=>{showError(this)});
  }




  on_keypress($event: KeyboardEvent,email=true) {
    if($event.keyCode==13) {
      if (email)
        this.udpate_mail();
      else
        this.quit({addr: this.user.addr})
    }
  }

  onflash_event($event: any) {
    this.quit({addr:$event.data})
  }

  authent_by_key(evt: any) {
    this.user.init(evt.addr,()=>{
      this.message="";
      this.user.pem=evt.pem;
      this.quit(evt);
    },()=>{
      showMessage(this,"Problème de reconnaissance");
    })
  }
}
