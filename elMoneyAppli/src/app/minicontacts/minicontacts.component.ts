import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {UserService} from "../user.service";
import {ApiService} from "../api.service";

@Component({
  selector: 'app-minicontacts',
  templateUrl: './minicontacts.component.html',
  styleUrls: ['./minicontacts.component.sass']
})
export class MinicontactsComponent implements OnInit {
  @Input("title") title="Les destinataires de vos envois";
  @Input("with_photo") with_photo=false;
  @Output('select') onselect: EventEmitter<any>=new EventEmitter();

  constructor(
    public user:UserService,
    public api:ApiService
  ) { }

  ngOnInit(): void {
    debugger
    this.api._get("users/"+this.user.contacts.join(",")+"/","").subscribe((r:any)=>{
      this.user.contacts=[];
      for(let c of r){
        this.user.contacts.push({
          label:c.pseudo,
          selected:false,
          icon:"person",
          email:c.email,
          color:"white"
        })
      }
    });
  }

  select_friends(fr: any) {
    this.onselect.emit(fr);
  }
}
