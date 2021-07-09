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
      //TODO a corriger
      this.user.pem=this.data.profil;
    }
  }


  import(fileInputEvent: any) {
    var reader = new FileReader();
    this.message = "Signature ...";
    reader.onload = () => {
      this.message = "Changement de compte";
      this.api._post("analyse_pem", "", btoa(reader.result.toString()), 240).subscribe((r: any) => {
        if(!this.user.addr || this.user.addr==r.addr){
          this.user.pem=r.pem;
          this.quit({pem:this.user.pem,addr:r.address});
        } else {
          showMessage(this,"Clé incorrecte");
        }
      });

    }
    reader.readAsBinaryString(fileInputEvent.target.files[0]);
  }




  quit(result=null){
    this.dialogRef.close(result);
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


}
