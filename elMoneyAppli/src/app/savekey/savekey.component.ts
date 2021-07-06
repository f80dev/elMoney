import { Component, OnInit } from '@angular/core';
import {UserService} from "../user.service";
import {DomSanitizer} from "@angular/platform-browser";

@Component({
  selector: 'app-savekey',
  templateUrl: './savekey.component.html',
  styleUrls: ['./savekey.component.sass']
})
export class SavekeyComponent implements OnInit {

  fileUrl:any;
  save_key=false;

  constructor(
    public user:UserService,
    public sanitizer:DomSanitizer
  ) {}

  ngOnInit(): void {
    this.save_key=(localStorage.getItem("save_key") && localStorage.getItem("save_key")=="true");
    if(this.user.pem){
      const blob = new Blob([this.user.pem], { type: 'text/plain' });
      this.fileUrl = this.sanitizer.bypassSecurityTrustResourceUrl(window.URL.createObjectURL(blob));
    }
  }

  valide_save() {
    localStorage.setItem("save_key","true");
    this.save_key=true;
  }

  already_save() {
    this.valide_save();
  }
}
