import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from "@angular/router";
import {ConfigService} from "../config.service";
import {Location} from "@angular/common";
import {UserService} from "../user.service";
import {MatDialog} from "@angular/material/dialog";
import {$$, showError, showMessage} from "../tools";
import {MatSnackBar} from "@angular/material/snack-bar";
import {ApiService} from "../api.service";
import {ImageSelectorComponent} from "../image-selector/image-selector.component";
import {environment} from "../../environments/environment";
import {NgNavigatorShareService} from "ng-navigator-share";
import {ClipboardService} from "ngx-clipboard";
import {PromptComponent} from "../prompt/prompt.component";

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.sass']
})
export class SettingsComponent implements OnInit,OnDestroy {

  contrat="";
  focus_idx: number;

  message: string="";
  filename: string="";
  open_section=1;
  domain_appli=environment.domain_appli;
  mustSave: boolean=false;
  qrcode_w=100;

  constructor(public router:Router,
              public user:UserService,
              public dialog:MatDialog,
              public toast:MatSnackBar,
              public api:ApiService,
              public _location:Location,
              public routes:ActivatedRoute,
              public ngNavigatorShareService:NgNavigatorShareService,
              public _clipboardService:ClipboardService,
              public config:ConfigService) {

  }


  ngOnInit(): void {
    this.user.check_pem(()=>{
      this.open_section=Number(this.routes.snapshot.queryParamMap.get("section"));
      if(!this.open_section)this.open_section=1;
    },this.router,null,"settings?section=1")
  }



  informe_clipboard() {
    showMessage(this,"Adresse est dans le presse papier");
    this.qrcode_w=200;
  }




  change_visual(field:string) {
    this.mustSave=true;
    $$("Modification du visuel")
    this.dialog.open(ImageSelectorComponent, {position:
        {left: '5vw', top: '5vh'},
      width: '90vw', height: 'fit-container', data:
        {
          title:'Votre visuel',
          result: "",
          checkCode: true,
          bank:true,
          width: 200,
          height: 200,
          emoji: true,
          internet: true,
          ratio: 1,
          webcam:true,
          quality:0.7
        }
    }).afterClosed().subscribe((result) => {
      if (result) {
        this.user[field]= result.img;
      }
    });
  }


  make_store() {
    this.user.check_pem(()=>{
      this.message="Création / Modification de la boutique";
      if(!this.user.shop_website || this.user.shop_website=="")this.user.shop_website=environment.domain_appli+"/?store="+this.user.addr;
      this.user.save_user(()=>{
        if(this.user.shop_website.length+this.user.shop_name.length+this.user.shop_description.length>0){
          this.user.new_dealer(()=>{
            this.message="";
            showMessage(this,"Vous avez été ajouté comme distributeur. Référencez des créateurs dés maintenant si vous pouvez");
          },(err)=>{
            showError(this,err);
          });
        }
      });
    },this);
  }

  openclose_store() {
    this.update_user(()=>{
      let state=Math.abs(this.user.dealer.state-1);
      if(state==0)
        this.message="Ouverture de la boutique";
      else
        this.message="Fermeture de la boutique";

      this.api._post("dealer_state/"+state+"/","",{pem:this.user.pem}).subscribe(()=>{
        showMessage(this,"Statut modifié");
        this.message="";
        this.config.refresh_dealers();
      });
    });
  }

  share(){
    this.informe_clipboard();
    this.ngNavigatorShareService.share({
      title: this.user.shop_name,
      text: this.user.shop_description || "Le spécialiste deu NFT",
      url: this.user.shop_website || ""
    })
      .then( (response) => {console.log(response);},()=>{
        this._clipboardService.copyFromContent(this.user.shop_website);
      })
      .catch( (error) => {
        this._clipboardService.copyFromContent(this.user.shop_website);
      });
  }



  update_user(func=null) {
    if(!this.mustSave){
      if(func)func();
    }else{
      this.message="Enregistrement en cours ...";
      this.user.save_user(()=>{
        this.mustSave=false;
        this.message="";
        showMessage(this,"Informations enregistrées");
        if(func)func();
      });
    }

  }

  delete_account(){
    if(this.user.gas>0.01 && this.config.isProd()){
      showMessage(this,"Le solde du compte doit être nul pour pouvoir le supprimer");
    } else {
      this.dialog.open(PromptComponent,{width: 'auto',data:
          {
            title: "Supprimer votre compte ?",
            question: "Cette action n'est pas annulable. L'ensemble des NFT achetés sont définitivement perdus",
            onlyConfirm:true,
            lbl_ok:"Ok",
            lbl_cancel:"Annuler"
          }
      }).afterClosed().subscribe((result) => {
        if(result){
          this.user.check_pem(()=>{
            this.user.remove_account().subscribe(()=>{
              showMessage(this,"Compte supprimé");
              this.user.reset(true);
            })
          },this,"Signer pour supprimer votre compte");
        }
      });
    }

  }

  raz_pem_ondevice() {
    this.user.pem=null;
    localStorage.removeItem("pem");
    showMessage(this,"Votre signature n'est plus stocké sur ce device");
  }

  update_identity() {
    this.dialog.open(ImageSelectorComponent, {position: {left: '5vw', top: '5vh'},
      width: '90vw', height: 'fit-container', data:
        {
          title:"Identité",
          subtitle:"Une photo d'identité ou d'un document officiel",
          checkCode: true,
          width: "200px",
          height: "300px",
          quality:0.8,
          bank:false,
          webcam:true
        }
    }).afterClosed().subscribe((result) => {
      if (result) {
        $$("Update identity");
        this.user.identity=result.img;
        this.mustSave=true;
      }
    });
  }

  ngOnDestroy(): void {
    if(this.mustSave)
      this.update_user();
  }


  clear_identity() {
    this.user.identity="";
    this.mustSave=true;
  }
}

