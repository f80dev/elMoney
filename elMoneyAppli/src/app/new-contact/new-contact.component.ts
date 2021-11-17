import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";
import {UserService} from "../user.service";
import {$$, showError, showMessage} from "../tools";
import {ConfigService} from "../config.service";

@Component({
  selector: 'app-new-contact',
  templateUrl: './new-contact.component.html',
  styleUrls: ['./new-contact.component.sass']
})
export class NewContactComponent implements OnInit {
  email: any = "";
  pseudo: any = "";
  showScanner: boolean = true;
  message: string="";

  constructor(
    public user: UserService,
    public dialog: MatDialog,
    public config:ConfigService,
    public dialogRef: MatDialogRef<NewContactComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) {
    this.showScanner=this.config.webcamsAvailable>0;
  }

  _close(toSave = true) {
    if (toSave) {
      if(this.user.addr==this.email){
        this.dialogRef.close({"error":"Impossible de s'envoyer des fonds à soit même"});
      }
      if(this.email.indexOf("@")>-1){
        this.message="En cours de traitement";
        this.user.add_contact(this.email,(r:any)=>{
          this.message="";
          this.dialogRef.close(r);
        },(err)=>{showError(this,err);});
      } else {
        this.dialogRef.close({email:this.email});
      }
    } else {
      this.dialogRef.close();
    }
  }

  add_contact($event: KeyboardEvent) {
    if ($event.keyCode == 13) {
      this._close(true);
    }
  }


  refresh_pseudo(new_value: any) {
    if (this.pseudo.length == 0 && new_value.indexOf("@") > -1)
      this.pseudo = new_value.split("@")[0].split(".")[0];
  }


  onflash_event($event: any) {
    this.email = $event.data;
    this._close(true);
  }

  ngOnInit(): void {
  }

  onUpload($event: any) {
    let content=$event.file.split("base64,")[1];
    //TODO a terminer
    content=atob(content);
    for(let email of content.split(",")){
      debugger
    }
  }
}
