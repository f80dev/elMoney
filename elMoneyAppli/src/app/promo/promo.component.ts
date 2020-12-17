import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {ActivatedRoute, Router} from "@angular/router";
import {MatSnackBar} from "@angular/material/snack-bar";
import {Socket} from "ngx-socket-io";
import {UserService} from "../user.service";
import {NgNavigatorShareService} from "ng-navigator-share";
import {ClipboardService} from "ngx-clipboard";
import {showMessage} from "../tools";
import {environment} from "../../environments/environment";

@Component({
  selector: 'app-promo',
  templateUrl: './promo.component.html',
  styleUrls: ['./promo.component.sass']
})
export class PromoComponent implements OnInit {
  url: string;
  message:string;
  title:string;

  constructor(public api: ApiService,
              public routes: ActivatedRoute,
              public toast: MatSnackBar,
              public router: Router,
              public user: UserService,
              public ngNavigatorShareService:NgNavigatorShareService,
              public _clipboardService:ClipboardService) {
  }


  ngOnInit(): void {
    this.url=this.routes.snapshot.queryParamMap.get("url");
  }

  informe_clipboard() {

  }


  share(){
    showMessage(this,"Lien du profil disponible dans le presse-papier");
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



}
