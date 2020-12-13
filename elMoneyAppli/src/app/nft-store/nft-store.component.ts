import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {showMessage, subscribe_socket} from "../tools";
import {UserService} from "../user.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {ActivatedRoute, Router} from "@angular/router";
import {Socket} from "ngx-socket-io";
import {environment} from "../../environments/environment";

@Component({
  selector: 'app-nft-store',
  templateUrl: './nft-store.component.html',
  styleUrls: ['./nft-store.component.sass']
})
export class NftStoreComponent implements OnInit {
  nfts: any[] = [];
  message = "";
  perso_only = false;
  mined_only = false;
  transac_cost=environment.transac_cost;

  constructor(public api: ApiService,
              public routes: ActivatedRoute,
              public toast: MatSnackBar,
              public socket: Socket,
              public router: Router,
              public user: UserService) {
    subscribe_socket(this, "refresh_nft", () => {
      setTimeout(() => {
        this.refresh(false);
      }, 200)
    });
  }



  ngOnInit(): void {
    if (this.routes.snapshot.queryParamMap.has("only_perso")) {
      this.perso_only = (this.routes.snapshot.queryParamMap.get("only_perso") == "true");
    }

    this.refresh();
    localStorage.setItem("last_screen","store");
  }




  refresh(withMessage = true) {
    if (withMessage) this.message = "Remplissage de la boutique ...";
    this.api._get("nfts/" + this.user.addr + "/" + this.perso_only + "/" + this.mined_only).subscribe((r: any) => {
      this.message = "";
      this.nfts = [];
      for (let item of r) {
        item.message = "";
        item.open = "";
        this.nfts.push(item);
        }
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
        this.refresh(false);
      });
    });
  }

  open(nft: any) {
    nft.message = "En cours d'ouverture";
    this.api._post("open_nft/" + nft.token_id + "/", "", this.user.pem).subscribe((r: any) => {
      nft.message = "";
      nft.open = r.response;
      showMessage(this, "Coût de la transaction: " + r.cost+" xEgld");
      this.user.refresh_balance(() => {
        this.refresh(false);
      });
    });
  }

  burn(nft: any) {
    nft.message = "En cours de destruction";
    this.api._post("burn/" + nft.token_id + "/", "", this.user.pem).subscribe((r: any) => {
      nft.message = "";
      showMessage(this,"Votre token n'existe plus");
      this.user.refresh_balance(() => {
        this.refresh(false);
      });
    });
  }
}
