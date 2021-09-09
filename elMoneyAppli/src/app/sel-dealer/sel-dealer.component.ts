import {Component, Inject, Input, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {UserService} from "../user.service";
import {ConfigService} from "../config.service";
import {ApiService} from "../api.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {showMessage} from "../tools";


export interface DealerData {
  title: string;
  dealers:any;
  direct_sel:boolean;
  no_dealer_message:string;
}


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
    public toast:MatSnackBar,
    public config:ConfigService,
    @Inject(MAT_DIALOG_DATA) public data: DealerData) {
  }


  ngOnInit(): void {
    if(this.data.dealers && this.data.dealers.length>0){
      this.dealers=this.data.dealers;
    } else {
      this.api._get("dealers/"+this.user.addr+"/","").subscribe((r:any)=>{
        this.dealers=r;
        if(this.dealers.length==0){
          showMessage(this,"Aucun distributeur disponible");
          this.dialogRef.close();
        }
    });
    }
  }

  eval_selected_dealer(evt=null){
    setTimeout(()=>{
      this.sel_dealers= [];
      for(let d of this.dealers){
        if(d.selected)this.sel_dealers.push(d);
      }
    },50)

  }

  return_dealers() {
    this.dialogRef.close(this.sel_dealers);
  }
}
