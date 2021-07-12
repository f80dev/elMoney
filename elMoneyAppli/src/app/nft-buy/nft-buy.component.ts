import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {Location} from "@angular/common";
import {ActivatedRoute, Router} from "@angular/router";
import {UserService} from "../user.service";
import {showMessage} from "../tools";
import {MatSnackBar} from "@angular/material/snack-bar";

@Component({
  selector: 'app-nft-buy',
  templateUrl: './nft-buy.component.html',
  styleUrls: ['./nft-buy.component.sass']
})
export class NftBuyComponent implements OnInit {

  nft:any;
  seller:any;
  miner:any;
  message: string="";

  constructor(
    public api:ApiService,
    public router:Router,
    public _location:Location,
    public user:UserService,
    public toast:MatSnackBar,
    public routes:ActivatedRoute
  ) {
    this.user.check_pem(null,this,"L'achat nécessite une signature",()=>{this.router.navigate(["store"])});
  }



  ngOnInit(): void {
    this.nft=JSON.parse(this.routes.snapshot.queryParamMap.get("nft"));
    this.seller=JSON.parse(this.routes.snapshot.queryParamMap.get("seller"));
    this.api._get("users/"+this.nft.miner+"/","").subscribe((data:any)=>{
      this.miner=data;
    });
    if(this.nft.price==0 && this.user.pem)this.buy();
  }



  buy() {
    let identifier=this.nft.identifier;
      if(identifier=="")identifier="EGLD";

      if(this.nft.price>0){

        if (!this.user.moneys.hasOwnProperty(identifier) || this.nft.price > Number(this.user.moneys[identifier].balance)/ 1e18 ) {

          showMessage(this, "Votre solde est insuffisant (prix + frais de transaction)", 5000, () => {
            if(this.nft.identifier.startsWith("EGLD"))
              this.router.navigate(["faucet"]);
            else
              this.router.navigate(["main"]);
          }, "Recharger ?");
          return false;
        }
      }

      this.message = "Achat en cours";
      let price = this.nft.price;
      this.api._post("buy_nft/" + this.nft.token_id + "/" + price + "/" + this.seller.address, "", {pem:this.user.pem,identifier:this.nft.identifier}).subscribe((r: any) => {
        this.message = "";
        showMessage(this, "Achat du token pour " + (this.nft.price + r.cost) + " "+this.nft.unity);
        this.user.refresh_balance(() => {});
        this.router.navigate(['nfts-perso'],{queryParams:{index:0}})
      }, () => {
        this.message = "";
        showMessage(this, "Achat annulé");
      });



  }

  cancel() {
    this._location.back();
  }
}
