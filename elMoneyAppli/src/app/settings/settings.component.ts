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
  open_section=0;

  constructor(public router:Router,
              public user:UserService,
              public dialog:MatDialog,
              public toast:MatSnackBar,
              private sanitizer: DomSanitizer,
              public api:ApiService,
              public _location:Location,
              public routes:ActivatedRoute,
              public config:ConfigService) { }

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



  // set_filename() {
  //    this.dialog.open(PromptComponent, {
  //     data: {
  //       title: 'Enregistrer votre compte',
  //       question: 'Donner un pseudo à votre compte',
  //       onlyConfirm: false,
  //       _type:"text"
  //     }
  //   }).afterClosed().subscribe((result) => {
  //      if(result)this.filename=result+".pem";
  //   });
  // }




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
      } else {

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
        this.user.new_dealer(()=>{
          this.message="";
          showMessage(this,"Vous avez été ajouté comme distributeur. Référencez des créateurs dés maintenant",0,()=>{
            this.router.navigate(["miners"]);
          });
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
}
