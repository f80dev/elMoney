import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from "@angular/router";
import {ConfigService} from "../config.service";
import {DomSanitizer} from "@angular/platform-browser";
import {Location} from "@angular/common";
import {UserService} from "../user.service";
import {PromptComponent} from "../prompt/prompt.component";
import {MatDialog} from "@angular/material/dialog";
import {showError, showMessage} from "../tools";
import {MatSnackBar} from "@angular/material/snack-bar";
import {ApiService} from "../api.service";
import {ImageSelectorComponent} from "../image-selector/image-selector.component";
import {environment} from "../../environments/environment";
import {NgNavigatorShareService} from "ng-navigator-share";
import {ClipboardService} from "ngx-clipboard";

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.sass']
})
export class SettingsComponent implements OnInit,OnDestroy {
  fileUrl;
  contrat="";
  focus_idx: number;

  message: string="";
  filename: string="";
  open_section=-1;
  domain_appli=environment.domain_appli;

  constructor(public router:Router,
              public user:UserService,
              public dialog:MatDialog,
              public toast:MatSnackBar,
              private sanitizer: DomSanitizer,
              public api:ApiService,
              public _location:Location,
              public routes:ActivatedRoute,
              public ngNavigatorShareService:NgNavigatorShareService,
              public _clipboardService:ClipboardService,
              public config:ConfigService) {}

  ngOnInit(): void {
    let obj:any=this.user.pem;

    if(this.user.pem){
      const blob = new Blob([obj.pem], { type: 'text/plain' });
      this.fileUrl = this.sanitizer.bypassSecurityTrustResourceUrl(window.URL.createObjectURL(blob));
    }
    this.open_section=Number(this.routes.snapshot.queryParamMap.get("section"));
  }



  raz_account() {
    this.dialog.open(PromptComponent, {
      width: '80%',
      maxWidth: '300px',
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


  informe_clipboard() {
    showMessage(this,"Adresse est dans le presse papier");
  }




  change_visual(field:string) {
    this.dialog.open(ImageSelectorComponent, {position:
        {left: '5vw', top: '5vh'},
      maxWidth: 400, maxHeight: 700, width: '90vw', height: 'auto', data:
        {
          title:'Votre visuel',
          result: this.user.visual,
          checkCode: true,
          width: 200,
          height: 200,
          emoji: false,
          internet: false,
          ratio: 1,
          quality:0.7
        }
    }).afterClosed().subscribe((result) => {
      if (result) {
        this.user[field]= result.img;
      }
    });
  }

  ngOnDestroy(): void {
    this.user.save_user();
  }

  make_store() {
    this.user.save_user(()=>{
      this.message="Création / modification de la boutique";
      if(this.user.shop_website.length+this.user.shop_name.length+this.user.shop_description.length>0){
        if(!this.user.shop_website || this.user.shop_website=="")
          this.user.shop_website=environment.domain_appli+"/?store="+this.user.addr;

        this.user.new_dealer(()=>{
          this.message="";
          showMessage(this,"Vous avez été ajouté comme distributeur. Référencez des créateurs dés maintenant si vous pouvez");
        },(err)=>{
          showError(this,err);
        });
      }
    });

  }

  openclose_store() {
    let state=Math.abs(this.user.dealer.state-1);
    this.api._post("dealer_state/"+state+"/","",{pem:this.user.pem}).subscribe(()=>{
      showMessage(this,"Statut modifié");
      this.config.refresh_dealers();
    });
  }

  share(){
    this.informe_clipboard();
     this.ngNavigatorShareService.share({
      title: this.user.shop_name,
      text: "Achetez des NFTs",
      url: this.user.shop_website
    })
      .then( (response) => {console.log(response);},()=>{
        this._clipboardService.copyFromContent(this.user.shop_website);
      })
      .catch( (error) => {
        this._clipboardService.copyFromContent(this.user.shop_website);
      });
  }
}
