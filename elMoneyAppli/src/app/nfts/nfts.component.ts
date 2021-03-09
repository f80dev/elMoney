import {Component, EventEmitter, Input, OnChanges, OnInit, Output} from '@angular/core';
import {showError, showMessage} from "../tools";
import {environment} from "../../environments/environment";
import {NgNavigatorShareService} from "ng-navigator-share";
import {ClipboardService} from "ngx-clipboard";
import {Router} from "@angular/router";
import {ApiService} from "../api.service";
import {NewContactComponent} from "../new-contact/new-contact.component";
import {MatSnackBar} from "@angular/material/snack-bar";
import {PromptComponent} from "../prompt/prompt.component";
import {MatDialog} from "@angular/material/dialog";
import {NewDealerComponent} from "../new-dealer/new-dealer.component";
import {SellerProperties} from "../importer/importer.component";

@Component({
  selector: 'app-nfts',
  templateUrl: './nfts.component.html',
  styleUrls: ['./nfts.component.sass']
})
export class NftsComponent implements OnChanges {

  @Input("user") user:any;
  @Input("filter") filter:any={};
  @Input("nfts") nfts:any;
  @Input("seller") seller:string="0x0000000000000000000000000000000000000000000000000000000000000000";
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



  ngOnChanges(): void {
    if(this.nfts){
      for(let nft of this.nfts){
        nft.visibility='visible';
        for(let k of Object.keys(this.filter)){
          if(nft[k] && typeof nft[k]=="string" && nft[k].indexOf(this.filter[k])==-1){
            nft.visibility='hidden';
            break;
          }
        }
      }
    }
  }


  share(nft){
    this.router.navigate(["promo"],{queryParams:{
        url:environment.domain_appli+"/store?id="+nft.token_id,
        message:"Acheter ce token",
        title:nft.uri
      }});
  }

  buy(nft: any) {
    this.dialog.open(PromptComponent, {
      data: {
        title: 'Acheter ce token pour '+nft.price+" xEgld",
        question: 'Etes vous sûr ?',
        onlyConfirm: true,
        lbl_ok: 'Oui',
        lbl_cancel: 'Non'
      }}).afterClosed().subscribe((result:any) => {
      if (!result || result == "no")return;

      if (nft.price > this.user.gas / 1e18 + environment.transac_cost) {
        showMessage(this, "Votre solde est insuffisant (prix + frais de transaction)", 5000, () => {
          this.router.navigate(["faucet"]);
        }, "Recharger ?");
        return false;
      }

      nft.message = "En cours d'achat";
      let price = nft.price;
      this.api._post("buy_nft/" + nft.token_id + "/" + price + "/" + this.seller, "", this.user.pem).subscribe((r: any) => {
        nft.message = "";
        showMessage(this, "Achat du token pour " + (nft.price + r.cost) + " xEgld");
        this.user.refresh_balance(() => {
          this.onbuy.emit();
        });
      }, () => {
        nft.message = "";
        showMessage(this, "Achat annulé");
      });
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


  //Changer le prix de vente en ajoutant la commision du distributeur
  update_markup(nft: any) {
    this.dialog.open(PromptComponent, {
      data: {
        title: 'Marge vendeur',
        question: 'Indiquer votre commission entre '+nft.min_markup+" et "+nft.max_markup,
        result:Math.round(nft.price*0.2*100)/100,
        onlyConfirm: false,
        min:nft.min_markup,
        max:nft.max_markup,
        type:"number",
        lbl_ok: 'Oui',
        lbl_cancel: 'Non'
      }}).afterClosed().subscribe((result:any) => {
      if(result && result!="no"){
        let obj={
          pem:this.user.pem.pem,
          price:Number(result),
        };
        nft.message="Mise à jour du prix";
        this.api._post("update_price/"+nft.token_id+"/","",obj).subscribe((r:any)=>{
          nft.message="";
          let message=r.scResults[0].returnMessage;
          if(r.status=="success"){
            this.onrefresh.emit();
            message="Le nouveau prix est fixé à "+result;
          }
          showMessage(this,message);
        },(err)=>{
          showError(this,err);
        });
      }
    });


  }


  add_dealer(nft: any) {
    this.dialog.open(NewDealerComponent, {
      position:
        {left: '5vw', top: '5vh'},
      maxWidth: 400, width: '90vw', height: 'auto', data:{}
    }).afterClosed().subscribe((result) => {
      if (result && result.hasOwnProperty("addr")) {
        let obj:any={
          addr:result.addr,
          name:result.name,
          pem:this.user.pem
        };
        nft.message="Ajout du distributeur en cours";
        this.api._post("add_dealer/"+nft.token_id+"/","",obj).subscribe(()=>{
          nft.message="";
          showMessage(this,"Distributeur ajouté");
          this.onrefresh.emit();
        })
      }
    });
  }

  can_sell(properties: number) {
    let b=properties & 0b00000010;
    return (b>0);
  }

  can_transfer(properties: number) {
    let b=properties & 0b00000001;
    return (b>0);
  }


}
