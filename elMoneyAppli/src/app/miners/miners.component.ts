import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {UserService} from "../user.service";
import {NewDealerComponent} from "../new-dealer/new-dealer.component";
import {showMessage} from "../tools";
import {MatDialog} from "@angular/material/dialog";
import {ConfigService} from "../config.service";

@Component({
  selector: 'app-miners',
  templateUrl: './miners.component.html',
  styleUrls: ['./miners.component.sass']
})
export class MinersComponent implements OnInit {
  miners: any[]=[];
  message: string="";

  constructor(
    public api:ApiService,
    public user:UserService,
    public dialog:MatDialog,
    public config:ConfigService
  ) { }

  ngOnInit(): void {
    this.refresh();
    let isDealer=localStorage.getItem("isDealer");
    if(!isDealer || isDealer!="true"){
      this.message="Ouverture de votre statut de distributeur";
      this.api._post("new_dealer/","",{pem:this.user.pem,name:"moi",addr:this.user.addr}).subscribe((r:any)=>{
        localStorage.setItem("isDealer","true");
        this.message="";
      });
    }
  }

  refresh(){
    this.message="Récupération de la liste des fabricants validés";
     this.api._get("miners/"+this.user.addr,"").subscribe((r:any)=>{
       this.message="";
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
        this.message="Approbation d'un fabricant";
        this.api._post("add_miner/","",obj).subscribe(()=>{
          showMessage(this,"Mineur ajoute");
          this.message="";
          this.refresh();
        })
      }
    });
  }



}
