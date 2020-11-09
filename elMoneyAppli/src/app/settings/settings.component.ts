import { Component, OnInit } from '@angular/core';
import {Router} from "@angular/router";
import {ConfigService} from "../config.service";
import {DomSanitizer} from "@angular/platform-browser";
import {Location} from "@angular/common";
import {UserService} from "../user.service";
import {PromptComponent} from "../prompt/prompt.component";
import {MatDialog} from "@angular/material/dialog";

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.sass']
})
export class SettingsComponent implements OnInit {
  fileUrl;
  contrat="";

  message: string="";

  constructor(public router:Router,
              public user:UserService,
              public dialog:MatDialog,
              private sanitizer: DomSanitizer,
              public _location:Location,
              public config:ConfigService) { }

  ngOnInit(): void {
    this.contrat=localStorage.getItem("contract");
    const blob = new Blob([this.user.pem], { type: 'application/octet-stream' });
    this.fileUrl = this.sanitizer.bypassSecurityTrustResourceUrl(window.URL.createObjectURL(blob));
  }

  downloadPEM() {

  }

  raz_account() {
    this.dialog.open(PromptComponent, {
      width: '80%',
      data: {
        title: 'Effacer votre compte',
        question: 'Si vous effacer votre compte, vous perdez immédiatement l\'ensemble de votre wallet. Etes vous sûr ?',
        onlyConfirm: true,
        lbl_ok: 'Oui',
        lbl_cancel: 'Non'
      }
    }).afterClosed().subscribe((result_code) => {
      if(result_code)
        this.user.reset();
    });

  }
}
