import { Component, OnInit } from '@angular/core';
import {Router} from "@angular/router";
import {ApiService} from "../api.service";
import {ConfigService} from "../config.service";
import {$$, showMessage, subscribe_socket} from "../tools";
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
  url_explorer: string="";
  showQRCode: boolean=false;
  friends=[];
  buttons=[
    {value:10},{value:5},{value:2},{value:1}
  ]
  hourglass=false;
  hand:number=0;
  showSlider: boolean=true;
  message="";
  _max: number=0;
  n_profils: number=0;
  temp_max: number=0;
  last_pseudo:string="";

  constructor(public router:Router,
              public toast:MatSnackBar,
              public dialog: MatDialog,
              public socket:Socket,
              public user:UserService,
              public api:ApiService,
              public config:ConfigService) {
    subscribe_socket(this,"refresh_account",()=>{
      setTimeout(()=>{
        this.refresh();
      },200)

    })
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

    if(this.user.addr){
      if(this.api.contract){
          this._max=this.user.balance;
          this.temp_max=this._max;
      }
    } else {
      this.api._get("new_account/").subscribe((r:any)=>{
        if(r.pem.length>0){
          this.user.init(r.address,{pem:r.pem});
          showMessage(this,"Enregistrer votre fichier d'authentification dans un endroit sûr pour pouvoir vous reconnecter",
            0,()=>{this.router.navigate(["settings"]);},"Enregistrer")
        }
        else
          this.user.init(r.address,r.keys);
        this.refresh();
      })
    }
  }



  ngOnInit(): void {
    setTimeout(()=>{
      this.refresh();
    },1500);
  }




  informe_clipboard() {
    showMessage(this,"Adresse dans le presse papier")
  }



  // addInHand(value: number) {
  //   this.hand=this.hand+value;
  //   this.solde=this.solde-value;
  // }


  transfer(email:string){
    if(!this.user.pem){
      showMessage(this,"Avant tout transfert vous devez vous identifier avec votre fichier PEM ou votre clé secrète");
      this.router.navigate(["private"]);
      return;
    }

    let pem=JSON.stringify(this.user.pem);
    $$("Demande de transfert vers "+email+" avec pem="+pem);
    this.message="Fonds en cours de transfert";
    this.api._post("transfer/" + this.api.contract + "/" +  email+ "/" + this.hand+"/"+this.user.unity+"/",
        "",
        pem).subscribe((r: any) => {
          this.message="";
          showMessage(this,"Fonds transférés");
          this.user.balance=this.user.balance-this.hand;
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
        width: '80vw',height: '600px',
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
    if(!this)return false;
    this.n_profils=0;
    for(let f of this.friends){
      if(f.selected){
        this.n_profils=this.n_profils+1;
        this.last_pseudo=f.label;
      }
    }

    if(this.n_profils==0){
      this._max=this.user.balance;
    } else {
      this._max=this.user.balance/this.n_profils;
      if(this.hand>this._max){
        this.hand=this._max;
      }
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
