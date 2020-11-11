import {Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.sass']
})
export class AccountComponent implements OnChanges {
  @Input("label") label: any;
  @Input("solde") solde: any;
  @Input("unity") unity: any;
  @Input("fontsize") fontsize: any;
  @Output('change') onchange: EventEmitter<any>=new EventEmitter();

  constructor() { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(changes.solde)
      this.onchange.emit(changes.solde.currentValue);
  }

}
