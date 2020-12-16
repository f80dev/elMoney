import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {showMessage} from "../tools";
import {environment} from "../../environments/environment";
import {NgNavigatorShareService} from "ng-navigator-share";
import {ClipboardService} from "ngx-clipboard";
import {Router} from "@angular/router";
import {ApiService} from "../api.service";

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


  constructor(
    public ngNavigatorShareService:NgNavigatorShareService,
    public _clipboardService:ClipboardService,
    public api:ApiService,
    public router:Router,
  ) { }

  ngOnInit(): void {
  }


  share(nft:any){
    showMessage(this,"Lien du profil disponible dans le presse-papier");
    this.ngNavigatorShareService.share({
      title: nft.title,
      text: "Achter ce token",
      url: environment.domain_appli+"/store?id="+nft.token_id
    })
      .then( (response) => {console.log(response);},()=>{
        this._clipboardService.copyFromContent(environment.domain_appli+"/store?id="+nft.token_id);
      })
      .catch( (error) => {
        this._clipboardService.copyFromContent(environment.domain_appli+"/store?id="+nft.token_id);
      });
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

}
