import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {UserService} from "../user.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {ActivatedRoute, Router} from "@angular/router";
import {checkConfig, showError, showMessage} from "../tools";
import {ConfigService} from "../config.service";

@Component({
  selector: 'app-faucet',
  templateUrl: './faucet.component.html',
  styleUrls: ['./faucet.component.sass']
})
export class FaucetComponent implements OnInit {
  message: string="";
  paymentHandler: any=null;

  constructor(public api:ApiService,
              public user:UserService,
              public config:ConfigService,
              public toast:MatSnackBar,
              public routes:ActivatedRoute,
              public router:Router) { }

  ngOnInit(): void {
    checkConfig(this);
    this.user.check_email(()=>{
      this.user.refresh_balance();
      if(this.routes.snapshot.queryParamMap.get("auto")=="reload"){
        this.reload_account();
      }
    },null,null,"faucet");

    this.invokeStripe();
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
        showMessage(this,"Compte rechargé");
        if(r)
          this.user.gas=r.gas;
      },(err)=>{
        showError(this,err)
      });
    }
  }

  informe_clipboard() {
    showMessage(this,"Votre adresse est disponible dans le presse-papier");
  }


  //https://www.freakyjolly.com/stripe-payment-checkout-gateway-angular-tutorial/
  initializePayment(amount: number) {
    const paymentHandler = (<any>window).StripeCheckout.configure({
      key: 'pk_test_sLUqHXtqXOkwSdPosC8ZikQ800snMatYMb',
      locale: 'auto',
      token: function (stripeToken: any) {
        console.log({stripeToken})
        alert('Stripe token generated!');
      }
    });

    paymentHandler.open({
      name: 'Rechargement',
      description: 'Transférer '+amount+" euros sur votre compte",
      amount: amount * 100
    });
  }

  invokeStripe() {
    if(!window.document.getElementById('stripe-script')) {
      const script = window.document.createElement("script");
      script.id = "stripe-script";
      script.type = "text/javascript";
      script.src = "https://checkout.stripe.com/checkout.js";
      script.onload = () => {
        this.paymentHandler = (<any>window).StripeCheckout.configure({
          key: 'pk_test_sLUqHXtqXOkwSdPosC8ZikQ800snMatYMb',
          locale: 'auto',
          token: function (stripeToken: any) {
            console.log(stripeToken)
            alert('Payment has been successfull!');
          }
        });
      }
      window.document.body.appendChild(script);
    }
  }
}
