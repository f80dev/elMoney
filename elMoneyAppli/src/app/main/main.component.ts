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
  hourglass=true;
  hand:number=0;
  showSlider: boolean=false;
  message="";

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
    let i=6
    for(let c of this.user.contacts){
      i=i-1;if(i<0)break;
      if(c.pseudo.length>15)c.pseudo=c.pseudo.substr(0,14);
      this.friends.push({label:c.pseudo,icon:"person",email:c.email})
    }

    this.friends.push({label:"Destinataire",icon:"person_add",email:"new"})

    if(this.user.addr){
      if(this.api.contract){
        this.hourglass=true;
        this.api.balance(this.user.addr).subscribe((r:any)=>{
          this.hourglass=false;
          this.solde=r.balance;
          this.config.unity=r.name;
        },(err)=>{
          showMessage(this,this.config.values?.messages.nomoney);
           this.hourglass=false;
          localStorage.removeItem("contract");
          this.router.navigate(["moneys"]);
        });
      }
    } else {
      this.api._get("new_account/").subscribe((r:any)=>{
        if(r.pem.length>0)
          this.user.init(r.address,{pem:r.pem});
        else
          this.user.init(r.address,r.keys);
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
    if(!this.user.pem){
      showMessage(this,"Avant tout transfert vous devez vous identifier avec votre fichier PEM ou votre clé secrète");
      this.router.navigate(["private"]);
      return;
    }

    let pem=JSON.stringify(this.user.pem);
    $$("Demande de transfert vers "+email+" avec pem="+pem);
    this.message="Fonds en cours de transfert";
    this.api._post("transfer/" + this.api.contract + "/" +  email+ "/" + this.hand+"/"+this.config.unity+"/",
        "",
        pem).subscribe((r: any) => {
          this.message="";
          showMessage(this,"Fonds transférés");
          this.hand=0;
          this.refresh();
      },(err)=>{
          this.message="";
          showMessage(this,"Problème technique, transfert non effectué");
    });
  }


  send_to(contact: any) {
    if(this.hand==0)return;
    if(contact.email=="new"){
      this.dialog.open(NewContactComponent, {
        position: {left: '10vw', top: '5vh'},
        maxWidth: 450,
        width: '80vw',height: '580px',
        data:{}
      }).afterClosed().subscribe((result:any) => {
        if(result){
          this.transfer(result.email);
          this.refresh();
        }
      });
    }
    else {
      this.transfer(contact.email);
    }

  }
}
