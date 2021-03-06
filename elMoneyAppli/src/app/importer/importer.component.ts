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
  count: any=1;
  secret: any="";
  price: any=0;
  uri: any="Achetez mon super token";
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


   import(fileInputEvent: any,index_file=0) {
      var reader:any = new FileReader();
      this.message="Chargement du fichier";
      if(fileInputEvent.target.files[0].size<this.config.values.max_file_size){
        this.filename=fileInputEvent.target.files[0].name;
        reader.onload = ()=> {
          this.files[index_file]=JSON.stringify(reader.result);
          this.message="";
        }
        reader.readAsDataURL(fileInputEvent.target.files[0]);
      } else {
        showMessage(this,"La taille limite des fichier est de "+Math.round(this.config.values.max_file_size/1024)+" ko");
        this.message="";
      }

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

  add_visual() {
  this.dialog.open(ImageSelectorComponent, {position:
          {left: '5vw', top: '5vh'},
        maxWidth: 400, maxHeight: 700, width: '90vw', height: '600px', data:
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
          this.files[1]= result;
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
    debugger
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
}
