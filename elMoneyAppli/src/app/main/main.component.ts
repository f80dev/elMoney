import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from "@angular/router";
import {ApiService} from "../api.service";
import {ConfigService} from "../config.service";
import {$$, showMessage, subscribe_socket} from "../tools";
import {MatSnackBar} from "@angular/material/snack-bar";
import {Socket} from "ngx-socket-io";
import {UserService} from "../user.service";
import {MatDialog} from "@angular/material/dialog";
import {NewContactComponent} from "../new-contact/new-contact.component";
import {PromptComponent} from "../prompt/prompt.component";

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
  hand:number=-1;
  showSlider: boolean=true;
  message="";
  _max: number=0;
  n_profils: number=0;
  temp_max: number=0;
  last_pseudo:string="";
  donateUrl: string="";

  constructor(public router:Router,
              public toast:MatSnackBar,
              public dialog: MatDialog,
              public socket:Socket,
              public user:UserService,
              public routes:ActivatedRoute,
              public api:ApiService,
              public config:ConfigService) {

    this.user.check_email(()=>{
      subscribe_socket(this,"refresh_account",($event)=>{
        if($event.param.comment){
          let unity=$event.param.comment;
          if(unity!=this.user.moneys[this.user.selected_money].unity){
            showMessage(this,"Vous avez reçu des "+unity);
            this.router.navigate(["moneys"],{queryParams:{"select":unity}});
          }
        }
        this.user.refresh_balance(()=>{
          this.refresh();
        });
      });
    },this.router,null,"main")


  }


  refresh(){
    if(this.api.identifier && this.user.moneys[this.user.selected_money]){
      this._max=this.user.moneys[this.user.selected_money].solde;
      if(this.hand<0)this.hand=Math.round(this._max/10);
      this.temp_max=this._max;
    } else {
      this.router.navigate(["moneys"]);
    }
  }




  informe_clipboard() {
    showMessage(this,"Adresse dans le presse papier")
  }




  transfer(dest:any){
    let value=this.hand;
    let unity=this.user.moneys[this.user.selected_money].unity;
    let question='Vous souhaitez envoyer '+value+" "+unity+" à "+dest.pseudo+" ("+dest.email+") ?";
    if(!dest.pseudo)question="Envoyer "+value+" "+unity+" à "+dest.addr;

    this.user.check_pem(()=>{
      this.dialog.open(PromptComponent, {
        data: {
          title: 'Confirmation',
          question: question,
          onlyConfirm: true,
          lbl_ok: 'Oui',
          lbl_cancel: 'Non'
        }}).afterClosed().subscribe((result:any) => {
        if (result=="yes") {
          this.message = value + " " + this.user.moneys[this.user.selected_money].unity + " en cours de transfert à " + dest.email;
          this.api._post("transfer/" + this.api.identifier + "/" + dest.addr + "/" + value + "/" + unity + "/",
            "",
            this.user.pem, 180).subscribe((r: any) => {
            this.message = "";
            showMessage(this, "Fond transféré, pour " + r["cost"] + " xeGld de frais de réseau", 4000);
            this.user.refresh_balance(() => {
              this.refresh();
            })
            this.user.moneys[this.user.selected_money].solde = this.user.moneys[this.user.selected_money].solde - value;
            this.hand = 0;
            this.refresh();
          }, (err) => {
            this.message = "";
            showMessage(this, "Problème technique, transfert non effectué");
          });
        }
      });
    })
  }


  add_contact(){
    let height='fit-content';
    this.dialog.open(NewContactComponent, {
      position: {left: '10vw', top: '5vh'},
      maxWidth: 450,
      width: '80vw',height: height,
      data:{}
    }).afterClosed().subscribe((result:any) => {
      if(result){
        this.transfer(result);
        this.refresh();
      }
    });
  }




  send_to() {
    if(this.hand==0)return;
    for(let f of this.friends){
      if(f.color!="transparent")
        this.transfer(f);
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
      this._max=this.user.moneys[this.user.selected_money].solde;
    } else {
      this._max=this.user.moneys[this.user.selected_money].solde/this.n_profils;
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



  ngOnInit(): void {
    setTimeout(()=>{
      this.user.refresh_balance(()=>{
        this.refresh();
      });
    },500)

    let params=this.routes.snapshot.queryParamMap;
    if(params.has("transfer") && params.has("to") && params.has("unity")){
      this.user.selected_money=params.get("unity");
      this.hand=Number(params.get("transfer"))
      this.transfer(params.get("to"));
    }

    localStorage.setItem("last_screen","main");
  }



  createDonateLink() {
    this.dialog.open(PromptComponent, {
      backdropClass:"removeBackground",
      data: {
        title: 'Combien souhaitez vous recevoir ?',
        question: "",
        onlyConfirm: false,
        type:"number",
        result:2,
        lbl_ok: 'Confirmer',
        lbl_cancel: 'Annuler'
      }}).afterClosed().subscribe((result:any) => {
      if (result) {
        let unity=this.user.selected_money;
        this.donateUrl=this.config.server.domain_appli+"/main?transfer="+result+"&unity="+unity+"&to="+this.user.addr;
        showMessage(this,"Votre lien est disponible. Coller le dans vos mail ou votre site web pour pouvoir recevoir des dons en "+this.user.moneys[this.user.selected_money].unity);
      }
    });
  }
}

