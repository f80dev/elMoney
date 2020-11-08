import { Component, OnInit } from '@angular/core';
import {Router} from "@angular/router";
import {ApiService} from "../api.service";
import {ConfigService} from "../config.service";
import {$$, showError, showMessage, subscribe_socket} from "../tools";
import {MatSnackBar} from "@angular/material/snack-bar";
import {Socket} from "ngx-socket-io";
import {UserService} from "../user.service";
import {MatDialog} from "@angular/material/dialog";
import {NewContactComponent} from "../new-contact/new-contact.component";

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.sass']
})
export class MainComponent implements OnInit {
  solde:any;
  url_explorer: string="";
  showQRCode: boolean=false;
  friends=[];
  buttons=[
    {value:10},{value:5},{value:2},{value:1}
  ]
  hand:number=0;

  constructor(public router:Router,
              public toast:MatSnackBar,
              public socket:Socket,
              public dialog: MatDialog,
              public user:UserService,
              public api:ApiService,
              public config:ConfigService) {

  }


  refresh(){
    this.friends=[];
    for(let c of this.user.contacts){
      this.friends.push({label:c.pseudo,icon:"person",email:c.email})
    }

    this.friends.push({label:"Nouveau",icon:"person_add",email:"new"})

    if(this.user.addr){
      if(this.api.contract){
        this.api.balance(this.user.addr).subscribe((r:any)=>{
          this.solde=r.balance;
          this.config.unity=r.name;
        },(err)=>{
          showMessage(this,this.config.values?.messages.nomoney);
          localStorage.removeItem("contract");
          this.router.navigate(["moneys"]);
        });
      }
    } else {
      this.api._get("new_account/").subscribe((r:any)=>{
        this.user.init(r.address)
        this.user.pem=r.pem;
        this.refresh();
      })
    }
  }



  ngOnInit(): void {
    subscribe_socket(this,"refresh_account",()=>{this.refresh();})
    setTimeout(()=>{
      this.refresh();
    },1500);
  }




  informe_clipboard() {
    showMessage(this,"Adresse dans le presse papier")
  }



  addInHand(value: number) {
    this.hand=this.hand+value;
    this.solde=this.solde-value;
  }


  transfer(email:string){
    $$("Demande de transfert vers "+email+" avec pem="+this.user.pem);
      this.api._post("transfer/" + this.api.contract + "/" +  email+ "/" + this.hand+"/"+this.config.unity+"/",
        "",
        JSON.stringify(this.user.pem)).subscribe((r: any) => {
        showMessage(this,"Fonds transférés");
        this.hand=0;
        this.refresh();
      });
  }


  send_to(contact: any) {
    if(contact.email=="new"){
      this.dialog.open(NewContactComponent, {
        position: {left: '5vw', top: '5vh'},
        maxWidth: 400,maxHeight: 700,
        width: '90vw',height: '90vh',
        data:{}
      }).afterClosed().subscribe((result:any) => {
        this.transfer(result.email);
      });
    }
    else {
      this.transfer(contact.email);
    }

  }
}
