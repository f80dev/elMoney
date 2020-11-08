import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";

@Component({
  selector: 'app-new-contact',
  templateUrl: './new-contact.component.html',
  styleUrls: ['./new-contact.component.sass']
})
export class NewContactComponent implements OnInit {
  email: any="";

  constructor(
    public dialog:MatDialog,
    public dialogRef: MatDialogRef<NewContactComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) {

  }

  ngOnInit(): void {
  }

  add_contact($event: KeyboardEvent) {
    if($event.keyCode==13){
        this.dialogRef.close({email:this.email});
    }
  }
}
