import {Component, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {UserService} from "../user.service";
import {DomSanitizer} from "@angular/platform-browser";

@Component({
  selector: 'app-savekey',
  templateUrl: './savekey.component.html',
  styleUrls: ['./savekey.component.sass']
})
export class SavekeyComponent implements OnChanges {

  fileUrl:any;
  save_key=false;
  @Input("filename") filename="macle.pem";

  constructor(
    public user:UserService,
    public sanitizer:DomSanitizer
  ) {}


  valide_save() {

  }

  already_save() {
    this.valide_save();
  }

  ngOnChanges(changes: SimpleChanges): void {
    setTimeout(()=>{
      if(this.user.pem){
        if(this.user.pem.indexOf("\"file\":")>0)this.user.pem=JSON.parse(this.user.pem).file;
        const blob = new Blob([this.user.pem], { type: 'application/octet-stream' });
        this.fileUrl = this.sanitizer.bypassSecurityTrustResourceUrl(window.URL.createObjectURL(blob));
      }
    },2000);

  }
}
