import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {showMessage} from "../tools";
import {environment} from "../../environments/environment";
import {NgNavigatorShareService} from "ng-navigator-share";
import {ClipboardService} from "ngx-clipboard";
import {Router} from "@angular/router";
import {ApiService} from "../api.service";
import {NewContactComponent} from "../new-contact/new-contact.component";
import {MatSnackBar} from "@angular/material/snack-bar";
import {PromptComponent} from "../prompt/prompt.component";
import {MatDialog} from "@angular/material/dialog";

@Component({
  selector: 'app-nfts',
  templateUrl: './nfts.component.html',
  styleUrls: ['./nfts.component.sass']
})
export class NftsComponent implements OnInit {

  @Input("user") user:any;
  @Input("filter") filter:any={value:""};
  @Input("nfts") nfts:any;
  @Output("refresh") onrefresh:EventEmitter<any>=new EventEmitter();
  @Output("buy") onbuy:EventEmitter<any>=new EventEmitter();
  @Output("transfer") ontransfer:EventEmitter<any>=new EventEmitter();


  constructor(
    public ngNavigatorShareService:NgNavigatorShareService,
    public _clipboardService:ClipboardService,
    public toast:MatSnackBar,
    public api:ApiService,
    public dialog:MatDialog,
    public router:Router,
  ) {
  }

  ngOnInit(): void {
  }


  share(nft){
    this.router.navigate(["promo"],{queryParams:{
        url:environment.domain_appli+"/store?id="+nft.token_id,
        message:"Acheter ce token",
        title:nft.uri
    }});
  }

  buy(nft: any) {
    if (nft.price > this.user.gas / 1e18+environment.transac_cost) {
      showMessage(this, "Votre solde est insuffisant (prix + frais de transaction)", 5000, () => {
        this.router.navigate(["faucet"]);
      }, "Recharger ?");
      return false;
    }

    nft.message = "En cours d'achat";
    let price = nft.price;
    this.api._post("buy_nft/" + nft.token_id + "/" + price, "", this.user.pem).subscribe((r: any) => {
      nft.message = "";
      showMessage(this, "Achat du token pour " + (nft.price + r.cost) + " xEgld");
      this.user.refresh_balance(() => {
        this.onbuy.emit();
      });
    }, () => {
      nft.message = "";
      showMessage(this, "Achat annulé");
    });
  }

  setstate(nft: any, new_state, message) {
    nft.message = message;
    this.api._post("state_nft/" + nft.token_id + "/" + new_state, "", this.user.pem).subscribe((r: any) => {
      nft.message = "";
      let mes="Votre token n'est plus en vente. ";
      if(new_state==0)mes="Votre token est en vente. "
      showMessage(this, mes+"Frais de service " + (r.cost) + " xEgld");
      this.user.refresh_balance(() => {
        this.onrefresh.emit();
      });
    });
  }

  open(nft: any) {
    nft.message = "En cours d'ouverture";
    this.api._post("open_nft/" + nft.token_id + "/", "", this.user.pem).subscribe((r: any) => {

      nft.message = "";

      nft.open = r.response;
      if(nft.open.length==46)nft.open="https://ipfs.io/ipfs/"+nft.open;

      showMessage(this, "Coût de la transaction: " + r.cost+" xEgld");
      this.user.refresh_balance(() => {});
    });
  }

  burn(nft: any) {
    nft.message = "En cours de destruction";
    this.api._post("burn/" + nft.token_id + "/", "", this.user.pem).subscribe((r: any) => {
      nft.message = "";
      showMessage(this,"Votre token n'existe plus");
      this.user.refresh_balance(() => {
        this.onrefresh.emit();
      });
    });
  }

  transfer(nft: any) {
    this.ontransfer.emit(nft);
  }

  update_price(nft: any) {
    this.dialog.open(PromptComponent, {
      data: {
        title: 'Modifier le prix',
        question: 'Indiquer le nouveau prix',
        result:nft.price,
        onlyConfirm: false,
        lbl_ok: 'Oui',
        lbl_cancel: 'Non'
      }}).afterClosed().subscribe((result:any) => {
        if(result){
          let obj={
            pem:this.user.pem.pem,
            price:result,
          };
          nft.message="Mise a jour du prix";
          this.api._post("update_price/"+nft.token_id+"/","",obj).subscribe((r:any)=>{
            nft.message="";
            let message=r.scResults[0].returnMessage;
            if(message.length<5){
              nft.price=result;
              message="Le nouveau prix est fixé à "+result;
            }
            showMessage(this,message);
          });
        }
      });


  }
}
