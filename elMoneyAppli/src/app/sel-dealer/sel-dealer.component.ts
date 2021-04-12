import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {UserService} from "../user.service";
import {ConfigService} from "../config.service";
import {DialogData} from "../prompt/prompt.component";
import {ApiService} from "../api.service";

@Component({
  selector: 'app-sel-dealer',
  templateUrl: './sel-dealer.component.html',
  styleUrls: ['./sel-dealer.component.sass']
})
export class SelDealerComponent implements OnInit {
  dealers: any[];
  sel_dealers: any[];

  constructor(
    public dialogRef: MatDialogRef<SelDealerComponent>,
    public user:UserService,
    public api:ApiService,
    public config:ConfigService,
    @Inject(MAT_DIALOG_DATA) public data: DialogData) { }

  ngOnInit(): void {
    this.api._get("dealers/"+this.user.addr+"/","").subscribe((r:any)=>{
      this.dealers=r;
    });
  }

  return_dealers() {
    let rc=[];
    for(let d of this.dealers){
      if(d.selected)rc.push(d);
    }
    this.dialogRef.close(rc);
  }
}
