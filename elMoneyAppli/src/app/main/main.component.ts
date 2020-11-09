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
  solde:number=0;
  url_explorer: string="";
  showQRCode: boolean=false;
  friends=[];
  buttons=[
    {value:10},{value:5},{value:2},{value:1}
  ]
  hourglass=true;
  hand:number=0;
  showSlider: boolean=true;
  message="";
  _max: number=0;
  n_profils: number=0;
  temp_max: number=0;
  last_pseudo:string="";

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
      this.friends.push(
        { label:c.pseudo,
          selected:false,
          icon:"person",
          email:c.email,
          color:"white"
        })
    }
    if(this.friends.length==1)this.select_friends(this.friends[0]);

    if(this.user.addr){
      if(this.api.contract){
        this.hourglass=true;
        this.api.balance(this.user.addr).subscribe((r:any)=>{
          this.hourglass=false;
          this.solde=r.balance;
          this.user.gas=r.gas;
          this._max=Number(r.balance.toString());
          this.temp_max=this._max;
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


  add_contact(){
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

  send_to() {
    if(this.hand==0)return;
    for(let f of this.friends){
      if(f.color!="transparent")
        this.transfer(f.email);
    }
  }

  update_account() {
    this.n_profils=0;
    for(let f of this.friends){
      if(f.selected){
        this.n_profils=this.n_profils+1;
        this.last_pseudo=f.label;
      }
    }

    if(this.n_profils==0){
      this.solde=this._max-this.hand;
    } else {
      this.solde=this._max-this.n_profils*this.hand;
      if(this.solde<0){
        this.hand=this.solde/this.n_profils;
        this.solde=0;
      }

      this.temp_max=this._max/this.n_profils;
    }

  }

  select_friends(fr: any) {
    if(fr.color=="white"){
      fr.color="deeppink";
      fr.selected=true;
    }
    else{
      fr.color="white";
      fr.selected=false;
    }

    this.update_account();
  }
}
