import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {DialogData} from "../prompt/prompt.component";
import {UserService} from "../user.service";
import {ConfigService} from "../config.service";

@Component({
  selector: 'app-new-dealer',
  templateUrl: './new-dealer.component.html',
  styleUrls: ['./new-dealer.component.sass']
})
export class NewDealerComponent implements OnInit {
  dealer: any={addr:"",name:"moi-meme"};
  focus_idx: number=0;
  showScanner: boolean=false;

  constructor( public dialogRef: MatDialogRef<NewDealerComponent>,
    public user:UserService,
    public config:ConfigService,
    @Inject(MAT_DIALOG_DATA) public data: DialogData) { }

  ngOnInit(): void {
    this.dealer.addr=this.data.result;
    this.showScanner=this.config.webcamsAvailable>0;
  }

  onflash_event($event: any) {
    this.dealer.addr = $event.data;
    this.dealer.name="";
    this.dialogRef.close(this.dealer);
  }
}
