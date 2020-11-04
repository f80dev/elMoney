import { Component, OnInit } from '@angular/core';
import {Router} from "@angular/router";
import {ConfigService} from "../config.service";
import {DomSanitizer} from "@angular/platform-browser";
import {Location} from "@angular/common";

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.sass']
})
export class SettingsComponent implements OnInit {
  url_explorer="";
  addr="";
  fileUrl;
  url_contrat="";
  contrat="";

  constructor(public router:Router,
              private sanitizer: DomSanitizer,
              public _location:Location,
              public config:ConfigService) { }

  ngOnInit(): void {
    this.addr=localStorage.getItem("addr");

    this.contrat=localStorage.getItem("contract");

    this.url_explorer="https://testnet-explorer.elrond.com/address/"+this.addr;
    this.url_contrat="https://testnet-explorer.elrond.com/address/"+this.contrat;
    const blob = new Blob([this.config.pem], { type: 'application/octet-stream' });
    this.fileUrl = this.sanitizer.bypassSecurityTrustResourceUrl(window.URL.createObjectURL(blob));
  }

  downloadPEM() {

  }
}
