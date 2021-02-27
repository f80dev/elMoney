import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {DialogData} from "../prompt/prompt.component";
import {UserService} from "../user.service";

@Component({
  selector: 'app-new-dealer',
  templateUrl: './new-dealer.component.html',
  styleUrls: ['./new-dealer.component.sass']
})
export class NewDealerComponent implements OnInit {
  dealer: any={addr:"",name:"moi-même"};
  focus_idx: number=0;

  constructor( public dialogRef: MatDialogRef<NewDealerComponent>,
    public user:UserService,
    @Inject(MAT_DIALOG_DATA) public data: DialogData) { }

  ngOnInit(): void {
    this.dealer.addr=this.user.addr;
  }

}
