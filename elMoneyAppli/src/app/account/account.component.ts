import {Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.sass']
})
export class AccountComponent implements OnChanges {
  @Input("label") label: any;
  @Input("money") money: any;
  @Input("decimals") decimals: number=2;
  @Input("fontsize") fontsize: any;
  @Input("unit_fontsize") unit_fontsize="2em";
  @Output('change') onchange: EventEmitter<any>=new EventEmitter();
  _format: string="1.0-2";

  constructor() { }

  ngOnInit(): void {
    this._format="1.0-"+this.decimals;
  }


  ngOnChanges(changes: SimpleChanges): void {
    if(changes.solde)
      this.onchange.emit(changes.solde.currentValue);
  }

}
