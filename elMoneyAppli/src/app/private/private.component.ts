import {Component, EventEmitter, Inject, Input, OnInit, Output, Sanitizer} from '@angular/core';
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
  private_key="";

  @Input("dialog") frm_dialog:boolean=true;
  @Output('load') onload: EventEmitter<any>=new EventEmitter();
  private_method="file";

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
        this.quit({pem:r.pem,addr:r.address});
      });
    }
    reader.readAsBinaryString(fileInputEvent.target.files[0]);
  }




  quit(result=null){
    if(this.frm_dialog)
      this.dialogRef.close(result);
    else
      this.onload.emit(result);
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


  keyOnChange() {
    if(this.private_key.length==80){
      this.quit({private_key:this.private_key});
    }
  }
}
