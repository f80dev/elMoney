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
    this.user.load_contacts();
  }

  select_friends(fr: any) {
    this.onselect.emit(fr);
  }
}
