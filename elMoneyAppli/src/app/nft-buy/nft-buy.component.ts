import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {Location} from "@angular/common";
import {ActivatedRoute, Router} from "@angular/router";
import {UserService} from "../user.service";
import {$$, ID_REQUIRED, showMessage} from "../tools";
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

  }



  ngOnInit(): void {
    this.nft=JSON.parse(this.routes.snapshot.queryParamMap.get("nft"));
    this.seller=JSON.parse(this.routes.snapshot.queryParamMap.get("seller"));
    this.api._get("users/"+this.nft.miner+"/","").subscribe((data:any)=>{this.miner=data[0];});
    this.user.check_pem(()=>{
      if(this.nft.price==0) this.buy();
      if(this.nft.price>this.user.moneys[this.nft.unity].solde){
        showMessage(this,"Vous n'avez pas suffisament de "+this.nft.unity+" sur votre compte, je vous redirige vers le rechargement ?",6000,()=>{
          this.router.navigate(["refund"]);
        });
      }
    },this,"L'achat nécessite une signature",()=>{this.router.navigate(["store"])});
  }



  buy() {
    this.user.check_pem(()=>{
      let identifier=this.nft.identifier;
      if(identifier=="0" || identifier=="")identifier="EGLD";

      if(this.nft.id_required && this.user.authent==0){
        showMessage(this,"Ce type de NFT exige une identification forte de l'acheteur",10000,()=>{
          this.router.navigate(["settings"],{queryParams:{section:2}})
        },"S'authentifier");
        this._location.back();
        return;
      }

      if(this.nft.price>0){
        if(this.nft.unity=="eGld"){
          if (!this.user.moneys.hasOwnProperty(identifier) || this.nft.price > Number(this.user.moneys[identifier].balance)/ 1e18 ) {

            showMessage(this, "Votre solde est insuffisant (prix + frais de transaction)", 50000, () => {
              if(this.nft.identifier.startsWith("EGLD"))
                this.router.navigate(["faucet"]);
              else
                this.router.navigate(["main"]);
            }, "Recharger ?");
            return false;
          }
        }
      }

      this.message = "Achat en cours";

      let body=this.nft;
      body["pem"]=this.user.pem;
      body["identifier"]=this.nft.identifier;

      // if(this.nft.network=="db"){
      //   $$("Le NFT doit être d'abord miné")
      //   this.nft.network="elrond"
      //   this.api._post("mint/1/","",body).subscribe((results:any)=>{
      //     $$("Puis supprimer de la base de données");
      //     this.api._delete("delete_nft_from_db/"+this.nft.token_id).subscribe(()=>{
      //       $$("Puis transférer à l'acheteur "+this.nft.owner);
      //       body.token_id=results[0].token_id;
      //       this.buy_nft(body);
      //     });
      //   })
      // } else {
        this.buy_nft(body);
      // }
    },this);
  }

  buy_nft(body){
    this.api._post("buy_nft/" + this.nft.token_id + "/" + body.price + "/" + this.seller.address+"/"+this.nft.network+"/", "", body,600).subscribe((r: any) => {
        this.message = "";
        if(r.status=="success"){
          showMessage(this, "Achat réalisé. Prix unitaire + frais de service (" + r.cost + " eGld)");
          this.user.refresh_balance(() => {});
          this.router.navigate(['nfts-perso'],{queryParams:{index:0},replaceUrl:true})
        } else {
          showMessage(this,"Achat annulé : "+r.receipt.data);
        }
      }, () => {
        this.message = "";
        showMessage(this, "Achat annulé");
      });
  }

  cancel() {
    this._location.back();
  }

}
