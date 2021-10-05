import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {ActivatedRoute, Router} from "@angular/router";
import {MatSnackBar} from "@angular/material/snack-bar";
import {UserService} from "../user.service";
import {NgNavigatorShareService} from "ng-navigator-share";
import {ClipboardService} from "ngx-clipboard";
import {showMessage} from "../tools";

@Component({
  selector: 'app-promo',
  templateUrl: './promo.component.html',
  styleUrls: ['./promo.component.sass']
})
export class PromoComponent implements OnInit {
  url: string;
  message:string;
  title:string;
  email: string;
  body:string;
  visual: string;

  constructor(public api: ApiService,
              public routes: ActivatedRoute,
              public toast: MatSnackBar,
              public router: Router,
              public user: UserService,
              public ngNavigatorShareService:NgNavigatorShareService,
              public _clipboardService:ClipboardService) {

  }


  ngOnInit(): void {
    this.url=this.routes.snapshot.queryParamMap.get("url")+"&premium="+this.routes.snapshot.queryParamMap.get("premium");
    this.visual=this.routes.snapshot.queryParamMap.get("visual");
    this.title=this.routes.snapshot.queryParamMap.get("title");
    this.message=this.routes.snapshot.queryParamMap.get("message");
    this.body="Découvrez mon NFT '"+this.title+"' sur "+this.url+" "+this.message;
  }

  informe_clipboard() {
    showMessage(this,"Lien du profil disponible dans le presse-papier");
  }


  share(){
    this.informe_clipboard();
    this.ngNavigatorShareService.share({
      title: this.title,
      text: this.message,
      url: this.url
    })
      .then( (response) => {console.log(response);},()=>{
        this._clipboardService.copyFromContent(this.url);
      })
      .catch( (error) => {
        this._clipboardService.copyFromContent(this.url);
      });
  }




  copy_message() {
    let param="";
    if(this.user.email && this.user.email.length>0)param="&cc="+this.user.email;
    let url="mailto:?subject=Acquérir un NFT&body="+this.body+param;

    window.open(url.replace(" ","%20"));
  }
}
