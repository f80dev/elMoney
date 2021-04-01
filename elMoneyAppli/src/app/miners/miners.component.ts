import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {UserService} from "../user.service";
import {NewDealerComponent} from "../new-dealer/new-dealer.component";
import {showMessage} from "../tools";
import {MatDialog} from "@angular/material/dialog";

@Component({
  selector: 'app-miners',
  templateUrl: './miners.component.html',
  styleUrls: ['./miners.component.sass']
})
export class MinersComponent implements OnInit {
  miners: any[]=[];

  constructor(
    public api:ApiService,
    public user:UserService,
    public dialog:MatDialog
  ) { }

  ngOnInit(): void {
    this.refresh();
     this.api._post("add_dealer/","",{pem:this.user.pem,name:"moi",addr:this.user.addr}).subscribe((r:any)=>{
      debugger
    });
  }

  refresh(){
     this.api._get("miners/"+this.user.addr,"").subscribe((r:any)=>{
      this.miners=r;
    });
  }


  add_miner(){
    this.dialog.open(NewDealerComponent, {
      position: {left: '5vw', top: '5vh'},
      maxWidth: 400, width: '90vw', height: 'auto',
      data:{title:"Ajout d'un mineur",result:this.user.addr}
    }).afterClosed().subscribe((result) => {
      if (result && result.hasOwnProperty("addr")) {
        let obj:any={
          address:result.addr,
          pem:this.user.pem
        };

        this.api._post("add_miner/","",obj).subscribe(()=>{
          showMessage(this,"Mineur ajoute");
          this.refresh();
        })
      }
    });
  }



}
