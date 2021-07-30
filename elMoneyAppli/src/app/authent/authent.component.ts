import {Component, Inject, OnInit} from '@angular/core';
import {ConfigService} from "../config.service";
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";
import {ApiService} from "../api.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {DomSanitizer} from "@angular/platform-browser";
import {UserService} from "../user.service";
import {Location} from "@angular/common";
import {$$, showError, showMessage} from "../tools";
import {Router} from "@angular/router";
import {environment} from "../../environments/environment";


@Component({
  selector: 'app-authent',
  templateUrl: './authent.component.html',
  styleUrls: ['./authent.component.sass']
})
export class AuthentComponent implements OnInit {
  message: string="";
  showScanner=true;
  test_profil: any;
  authent_method="email";
  showSaveKey: boolean=false;
  savePrivateKey=false;

  constructor(public config:ConfigService,
              public dialogRef: MatDialogRef<AuthentComponent>,
              @Inject(MAT_DIALOG_DATA) public data: any,
              public api:ApiService,
              public dialog:MatDialog,
              public router:Router,
              public toast:MatSnackBar,
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
    this.showSaveKey=false;
    this.api._get("users/"+this.user.email+"/").subscribe((r:any)=> {
      this.api.set_identifier(r["default_money"])
      if(!r.hasOwnProperty('addr')){
        this.message="ouverture d'un nouveau compte sur le "+this.config.server.network+" elrond";
        this.showSaveKey=true;
        this.api._get("new_account/","email="+this.user.email,240).subscribe((r:any)=> {
          this.message = "";
          this.user.pem = r.pem;
          if(this.savePrivateKey)localStorage.setItem('pem',r.pem);
          this.user.init(r.addr);
          this.quit(r);
        });
      } else {
        let mess="Bonjour";
        if(r.hasOwnProperty("pseudo"))mess=mess+" "+r.pseudo;
        showMessage(this,mess);
        this.quit(r);
      }
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

  open_elrond_authent() {
    if(!this.data.redirect)this.data.redirect="store";
    let url=this.config.server.wallet_domain+"hook/login?callbackUrl="+environment.domain_appli+"/"+this.data.redirect
    window.location.href=url;
  }
}
