import { Component, OnInit } from '@angular/core';
import {showMessage} from "../tools";
import {ApiService} from "../api.service";
import {UserService} from "../user.service";
import {ImageSelectorComponent} from "../image-selector/image-selector.component";
import {MatDialog} from "@angular/material/dialog";
import {Router} from "@angular/router";
import {MatSnackBar} from "@angular/material/snack-bar";
import {NewDealerComponent} from "../new-dealer/new-dealer.component";
import {ConfigService} from "../config.service";
import {environment} from "../../environments/environment";
import {MatTableDataSource} from "@angular/material/table";
import {StepperSelectionEvent} from "@angular/cdk/stepper";
import {PromptComponent} from "../prompt/prompt.component";

export interface SellerProperties {
  address: string;
  name: string;
  marge:number;
}

@Component({
  selector: 'app-importer',
  templateUrl: './importer.component.html',
  styleUrls: ['./importer.component.sass']
})
export class ImporterComponent implements OnInit {

  message: string="";
  files:string[]=["",""];
  count: number=1;
  secret: string="";
  price: number=0;
  uri: string="Achetez mon NFT";
  cost=0;
  filename: string="";
  reseller: any=false;
  max_price: any=0;
  min_price: any=0;
  focus_idx=0;

  displayedColumns: string[] = ['Address', 'name','delete'];
  dataSource = new MatTableDataSource<SellerProperties>([]);
  owner_can_sell: boolean=true;
  owner_can_transfer: boolean=true;
  direct_sell: boolean=true;
  miner_ratio: number = 0;
  idx_tab: number=0;
  show_zone_upload: boolean=false;
  redirect: number=0;
  prompt: string="";


  constructor(public api:ApiService,
              public user:UserService,
              public config:ConfigService,
              public dialog:MatDialog,
              public toast:MatSnackBar,
              public router:Router) {
  }

  ngOnInit(): void {
    // this.api._get("evalprice/"+this.user.addr+"/kjfdkljgklfdjgklfdjklgfdlk/0/").subscribe((r:any)=>{
    //   if(!r.hasOwnProperty("error")){
    //     this.cost=r.txGasUnits;
    //   }
    // })
    localStorage.setItem("last_screen","importer");
  }


  import(fileInputEvent: any,index_file=0,prompt="",func=null) {
    this.dialog.open(PromptComponent,{width: '250px',data:
        {
          title: prompt,
          onlyConfirm:true,
          lbl_ok:"Continuer",
          lbl_cancel:"Annuler"
        }
    }).afterClosed().subscribe((rep) => {
      if (rep) {

      }
    });
  }


  tokenizer() {
    //properties est stoké sur 8 bits : 00000<vente directe possible><le propriétaire peut vendre><le propriétaire peut offrir>
    let properties:number=0b00000000;
    if(this.owner_can_transfer)properties=properties+0b00000001;
    if(this.owner_can_sell)properties=properties+0b00000010;
    if(this.direct_sell)properties=properties+0b00000100;

    let obj={
      pem:this.user.pem["pem"],
      owner:this.user.addr,
      file:this.files[0],
      visual:this.files[1],
      filename:this.filename,
      signature:this.uri,
      secret:this.secret,
      price:this.price,
      max_markup:this.max_price,
      min_markup:this.min_price,
      dealers:this.dataSource.data,
      properties:properties,
      direct_sell:this.direct_sell,
      miner_ratio:this.miner_ratio
    };

    this.message="Enregistrement dans la blockchain";
    this.api._post("mint/"+this.count,"",obj).subscribe((r:any)=>{
      if(r){
        this.message="";
        showMessage(this,"Fichier tokeniser pour "+r.cost+" xEgld");
        this.user.refresh_balance(()=>{
          this.router.navigate(["nfts-perso"],{queryParams:{index:2}});
        })
      }
    },(err)=>{
      showMessage(this,err.error);
    })
  }

  add_visual(func=null,index=1) {
    this.dialog.open(ImageSelectorComponent, {position:
        {left: '5vw', top: '5vh'},
      maxWidth: 400, maxHeight: 700, width: '90vw', height: 'auto', data:
        {
          result: this.files[1],
          checkCode: true,
          width: 200,
          height: 200,
          emoji: false,
          internet: false,
          ratio: 1,
          quality:0.7
        }
    }).afterClosed().subscribe((result) => {
      if (result) {
        this.files[index]= result;
        if(func)func(result);
      } else {
        if(func)func(null);
      }
    });
  }

  update_prices() {
    if(this.max_price==0)this.max_price=this.price*0.2;
    if(this.min_price==0 && this.price>0)this.min_price=0;
  }

  open_store(elt:any) {
    open("./assets/store.html?seller="+elt.address+"&server="+environment.domain_server+"&explorer="+this.config.server.explorer,"store");
  }

  add_seller() {
    this.dialog.open(NewDealerComponent, {
      position:
        {left: '5vw', top: '5vh'},
      maxWidth: 400, width: '90vw', height: 'auto', data:{}
    }).afterClosed().subscribe((result) => {
      if (result && result.hasOwnProperty("addr")) {
        let obj:SellerProperties={address:result.addr,name:result.name,marge:result.percent};
        this.dataSource.data.push(obj);
        this.dataSource._updateChangeSubscription();
      }
    });



  }

  delete_dealer(element: any) {
    let idx=this.dataSource.data.indexOf(element);
    if(idx>-1){
      this.dataSource.data.splice(idx,1);
      this.dataSource._updateChangeSubscription();
    }

  }

  update_idx($event: StepperSelectionEvent) {
    this.idx_tab=$event.selectedIndex;
  }

  ask_for_price(question="",func:Function=null){
    this.dialog.open(PromptComponent,{width: '250px',data:
        {
          title: "Prix de vente",
          question: question,
          min:0,max:10,
          type:"number",
          onlyConfirm:false,
          lbl_ok:"Ok",
          lbl_cancel:"Annuler"
        }
    }).afterClosed().subscribe((price) => {
      if(price){
        this.price=Number(price);
        this.min_price=0;this.max_price=0;this.miner_ratio=0;
        if(func)func(); else this.tokenizer();
      }
    });
  }

  ask_for_text(title:string,question:string,func:Function){
    this.dialog.open(PromptComponent,{width: '320px',
      data:{title: title,question: question,type:"string",onlyConfirm:false,lbl_ok:"Ok",lbl_cancel:"Annuler"}})
      .afterClosed().subscribe((rc) => {func(rc);});
  }


  quick_photo(index=0) {
    this.add_visual((result:any)=>{
      if(result){
        this.ask_for_text("Présentation","Faite une présentation rapide de votre photo",(legende)=>{
          if(legende){
            this.uri=legende;
            this.ask_for_price("Quel prix pour votre photo");
          }
        });
      }
    },index)
  }

  quick_secret(){
    this.ask_for_text("Cacher un secret","Saisissez votre secret, mot de passe, code ...",(secret)=>{
      if(secret){
        this.secret=secret;
        this.ask_for_text("Description","Entrez une breve description de votre token",(description)=>{
          if(description){
            this.uri=description;
            this.ask_for_price("Quel prix pour votre secret");
          }
        })
      }
    })
  }

  quick_tickets($event:any){
      this.files[1]=$event.file;
      this.filename=$event.filename;
      this.ask_for_text("Titre de votre évenement","",(title)=> {
        if (title) {
          this.ask_for_text("Lieu et Date","Indiquer l'adresse et l'horaire",(desc)=> {
            if (desc) {
              this.secret=title+" - Billet: @id@ - "+desc;
              this.ask_for_price("Prix unitaire du billet",(price)=>{
                this.ask_for_text("Combien de billets à "+price,"Indiquer le nombre de billets à fabriquer",(num)=>{
                  this.count=Number(num);
                  this.min_price=this.min_price=0;
                  this.price=Number(price);
                  this.tokenizer();
                });
              })
            }
          });
        }
      });
  }

  quick_file($event: any) {
      this.files[0]=$event.file;
      this.filename=$event.filename;
      this.ask_for_text("Description pour les acheteurs","Une phrase courte pour donner envie de l'acheter",(desc)=>{
        if(desc){
          this.uri=desc;
          this.ask_for_price("Quel est votre prix pour ce fichier");
        }
      })
  }

  show_fileupload(redirect: number,prompt:string) {
    this.show_zone_upload=true;
    this.prompt=prompt;
    this.redirect=redirect;
  }

  onupload($event: any) {
    if(this.redirect==1)this.quick_file($event);
    if(this.redirect==2)this.quick_tickets($event);
  }
}
