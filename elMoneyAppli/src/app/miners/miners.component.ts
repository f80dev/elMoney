import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {UserService} from "../user.service";
import {NewDealerComponent} from "../new-dealer/new-dealer.component";
import {showMessage} from "../tools";
import {MatDialog} from "@angular/material/dialog";
import {ConfigService} from "../config.service";
import {PromptComponent} from "../prompt/prompt.component";
import {Router} from "@angular/router";

@Component({
  selector: 'app-miners',
  templateUrl: './miners.component.html',
  styleUrls: ['./miners.component.sass']
})
export class MinersComponent implements OnInit {
  miners: any[]=[];
  message: string="";

  constructor(
    public router:Router,
    public api:ApiService,
    public user:UserService,
    public dialog:MatDialog,
    public config:ConfigService
  ) { }

  ngOnInit(): void {
    if(!this.user.isDealer()){
      if(!this.user.pseudo || this.user.pseudo.length==0){
        showMessage(this,"Vous devez renseigné un pseudo pour avoir le statut de distributeur");
        this.router.navigate(["settings"]);
      } else {
        this.message="Ouverture de votre statut de distributeur";
        this.user.new_dealer(()=>{
          this.refresh();
        })

      }

    } else this.refresh();


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


  remove(miner: any) {
    this.dialog.open(PromptComponent,{width: '250px',data:
        {
          title: "Supprimer ce créateur ?",
          onlyConfirm:true,
          lbl_ok:"Continuer",
          lbl_cancel:"Annuler"
        }
    }).afterClosed().subscribe((result) => {
      if (result == "yes") {
        let obj:any={
          address:result.addr,
          pem:this.user.pem
        };
        this.message="Suppression en cours";
        this.api._post("del_miner/","",obj).subscribe(()=>{
          showMessage(this,"Créateur supprimé");
          this.message="";
          this.refresh();
        })
      }
    });
  }
}
