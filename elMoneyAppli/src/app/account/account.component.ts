import {Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.sass']
})
export class AccountComponent implements OnInit {
  @Input("label") label: any;
  @Input("solde") solde: any;
  @Input("unity") unity: any;

  constructor() { }

  ngOnInit(): void {
  }

}
