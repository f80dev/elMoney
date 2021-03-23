import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {ActivatedRoute, Router} from "@angular/router";
import {MatSnackBar} from "@angular/material/snack-bar";
import {Socket} from "ngx-socket-io";
import {UserService} from "../user.service";
import {SellerProperties} from "../importer/importer.component";
import {showError, subscribe_socket} from "../tools";
import {environment} from "../../environments/environment";
import {ConfigService} from "../config.service";


export interface I_Transaction {
  data:string;
  value:number;
}

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.sass']
})
export class TransactionsComponent implements OnInit {
  displayedColumns: string[] = ['data', 'value','gas'];
  transactions:I_Transaction[]=[];
  message: string="";

  constructor(public api: ApiService,
              public routes: ActivatedRoute,
              public config:ConfigService,
              public toast: MatSnackBar,
              public socket: Socket,
              public router: Router,
              public user: UserService
  ){ }

  refresh(){
    this.message="Chargement du journal des transactions";
    this.api._get("transactions/"+this.user.addr+"/").subscribe((ts:any)=>{
      this.message="";
      this.transactions=ts;
    },()=>{showError(this);})
  }

  ngOnInit(): void {
    subscribe_socket(this,"refresh_account",this.refresh);
    this.refresh();
  }

  open_transaction(transact: any) {
    let url=this.config.server.explorer+"/transactions/"+transact.transaction;
    open(url);
  }
}
