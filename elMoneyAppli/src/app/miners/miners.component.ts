import { Component, OnInit } from '@angular/core';
import {ApiService} from "../api.service";
import {UserService} from "../user.service";
import {NewDealerComponent} from "../new-dealer/new-dealer.component";
import {showError, showMessage} from "../tools";
import {MatDialog} from "@angular/material/dialog";
import {ConfigService} from "../config.service";
import {PromptComponent} from "../prompt/prompt.component";
import {Router} from "@angular/router";
import {MatSnackBar} from "@angular/material/snack-bar";
import {ClipboardService} from "ngx-clipboard";

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
    public clipboard:ClipboardService,
    public user:UserService,
    public dialog:MatDialog,
    public config:ConfigService,
    public toast:MatSnackBar
  ) { }

  ngOnInit(): void {
    if(!this.user.isDealer()){
      showMessage(this,"Vous devez renseigner la section distributeur pour approuver des mineurs");
      this.router.navigate(["settings"],{queryParams:{section:2}});
    } else{
      this.user.check_pem(()=>{
        this.refresh();
      },this,null,()=>{
        this.router.navigate(["settings"],{queryParams:{section:2}});
      })

    }

  }

  refresh(){
    this.message="Récupération de la liste des fabricants validés";
    this.api._get("miners/"+this.user.addr,"").subscribe((r:any)=>{
      this.message="";

      this.miners=r;
    },(err)=>{
      showError(this,err);
      this.message="";
    });
  }


  prompt_dealer(addr){
    this.dialog.open(NewDealerComponent, {
      position: {left: '5vw', top: '5vh'},
      maxWidth: 400, width: '90vw', height: 'auto',
      data:{title:"Référencement d'un créateur",result:addr,placeholder:"coller l'adresse du créateur"}
    }).afterClosed().subscribe((result) => {
      if (result && result.hasOwnProperty("addr")) {
        let obj:any={
          address:result.addr,
          pem:this.user.pem
        };
        this.message="Approbation d'un nouveau créateur";
        this.api._post("add_miner/","",obj).subscribe(()=>{
          showMessage(this,"Mineur ajoute");
          this.message="";
          this.refresh();
        },(err)=>{
          showMessage(this,"Ce créateur n'est pas conforme");
          this.message="";
        })
      }
    });
  }



  add_miner(){
    if(this.config.platform.FIREFOX){
      this.prompt_dealer("");
    } else {
      navigator["clipboard"].readText().then((data)=>{
        let _default=this.user.addr;
        if(data.startsWith("erd"))_default=data;
        this.prompt_dealer(_default);
      }).catch(()=>{
        this.prompt_dealer(this.user.addr);
      })
    }
  }


  remove(miner: any) {
    this.dialog.open(PromptComponent,{width: 'fit-content',data:
        {
          title: "Déréférencer "+miner.pseudo+" de votre boutique ?",
          onlyConfirm:true,
          lbl_ok:"Continuer",
          lbl_cancel:"Annuler"
        }
    }).afterClosed().subscribe((result) => {
      if (result == "yes") {
        let obj:any={
          address:miner.addr,
          pem:this.user.pem
        };
        this.message="Déréférencement en cours ...";
        this.api._post("del_miner/","",obj).subscribe(()=>{
          showMessage(this,miner.pseudo+" n'est plus référencé(e) dans votre boutique");
          this.message="";
          this.refresh();
        })
      }
    });
  }

  open_creator(miner: any) {
    this.router.navigate(["miner"],{queryParams:{miner:miner.addr}});
  }
}
