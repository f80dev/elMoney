import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";

@Component({
  selector: 'app-nft-confirm',
  templateUrl: './nft-confirm.component.html',
  styleUrls: ['./nft-confirm.component.sass']
})
export class NftConfirmComponent implements OnInit {

  constructor(
    public api:ApiService
  ) { }

  ngOnInit(): void {
  }

}
