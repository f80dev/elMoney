import { Component, OnInit } from '@angular/core';
import {Router} from "@angular/router";
import {ConfigService} from "../config.service";
import {DomSanitizer} from "@angular/platform-browser";
import {Location} from "@angular/common";
import {UserService} from "../user.service";
import {PromptComponent} from "../prompt/prompt.component";
import {MatDialog} from "@angular/material/dialog";
import {showError, showMessage} from "../tools";
import {MatSnackBar} from "@angular/material/snack-bar";
import {ApiService} from "../api.service";

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.sass']
})
export class SettingsComponent implements OnInit {
  fileUrl;
  contrat="";

  message: string="";

  constructor(public router:Router,
              public user:UserService,
              public dialog:MatDialog,
              public toast:MatSnackBar,
              private sanitizer: DomSanitizer,
              public api:ApiService,
              public _location:Location,
              public config:ConfigService) { }

  ngOnInit(): void {
    let obj:any=this.user.pem;
    const blob = new Blob([obj.pem], { type: 'text/plain' });
    this.fileUrl = this.sanitizer.bypassSecurityTrustResourceUrl(window.URL.createObjectURL(blob));
  }


  raz_account() {
    this.dialog.open(PromptComponent, {
      width: '80%',
      data: {
        title: 'Effacer votre compte',
        question: 'Si vous effacer votre compte, vous perdez immédiatement l\'ensemble de votre wallet. Etes vous sûr ?',
        onlyConfirm: true,
        lbl_ok: 'Oui',
        lbl_cancel: 'Non'
      }
    }).afterClosed().subscribe((result_code) => {
      if(result_code=="yes")
        this.user.reset();
    });

  }

  reload_account() {
    if(this.config.server.proxy && this.config.server.proxy=="https://api.elrond.com"){
      showMessage(this,"Votre adresse est dans le presse papier, vous pouvez l'utiliser pour le prestataire de paiement");
      setTimeout(()=>{
        open("https://buy.moonpay.io/?currencyCode=EGLD&amp;colorCode=%231B46C2&amp;showAllCurrencies=false&amp;enabledPaymentMethods=credit_debit_card,sepa_bank_transfer,gbp_bank_transfer,apple_pay");
      },1000);
    }
    else {
      this.message="Rechargement en cours";
      this.api._get("refund/"+this.user.addr).subscribe((r:any)=>{
        this.message="";
        if(r)
          this.user.gas=r.gas;
      },(err)=>{
        showError(this,err)
      });
    }
  }
}
