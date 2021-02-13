import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {DialogData} from "../prompt/prompt.component";

@Component({
  selector: 'app-new-dealer',
  templateUrl: './new-dealer.component.html',
  styleUrls: ['./new-dealer.component.sass']
})
export class NewDealerComponent implements OnInit {
  dealer: any={addr:"erd18tudnj2z8vjh0339yu3vrkgzz2jpz8mjq0uhgnmklnap6z33qqeszq2yn4",name:"eve"};
  focus_idx: number=0;

  constructor( public dialogRef: MatDialogRef<NewDealerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData) { }

  ngOnInit(): void {
    if(localStorage.getItem("last_percent"))this.dealer.percent=Number(localStorage.getItem("last_percent"));
    if(localStorage.getItem("last_name"))this.dealer.name=localStorage.getItem("last_name");
  }

}
