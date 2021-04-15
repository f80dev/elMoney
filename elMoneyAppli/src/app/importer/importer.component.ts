import { Component, OnInit } from '@angular/core';
import {showMessage} from "../tools";
import {ApiService} from "../api.service";
import {UserService} from "../user.service";
import {ImageSelectorComponent} from "../image-selector/image-selector.component";
import {MatDialog} from "@angular/material/dialog";
import {Router} from "@angular/router";
import {MatSnackBar} from "@angular/material/snack-bar";
import {ConfigService} from "../config.service";
import {environment} from "../../environments/environment";
import {MatTableDataSource} from "@angular/material/table";
import {StepperSelectionEvent} from "@angular/cdk/stepper";
import {PromptComponent} from "../prompt/prompt.component";
import {SelDealerComponent} from "../sel-dealer/sel-dealer.component";

export interface SellerProperties {
  address: string;
  name: string;
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
  gift:number=0;
  secret: string="";
  price: number=0;
  title: string="Mon NFT pour vous";
  desc: string="Achetez mon NFT";
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
  tokens: any[]=[];
  full_flyer: boolean=true;
  file_format: string="";
  selected_token: any;

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
    this.api.getyaml("tokens").subscribe((r:any)=>{
      this.tokens=r.content;
    });
    if(this.user.pseudo.length==0){
      showMessage(this,"Vous pouvez créer un NFT anonynement mais il est préférable de se donner un pseudo à minima");
    }
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


  tokenizer(fee=0,func=null,func_error=null) {
    //properties est stoké sur 8 bits : 00000<vente directe possible><le propriétaire peut vendre><le propriétaire peut offrir>
    if(this.min_price<0 || this.max_price<0 || this.price<0){
      showMessage(this,"Données incorrectes");
      if(func_error)func_error();
      return;
    }

    let properties:number=0b00000000;
    if(this.owner_can_transfer)properties=properties+0b00000001;
    if(this.owner_can_sell)properties=properties+0b00000010;
    if(this.direct_sell)properties=properties+0b00000100;

    let obj={
      pem:this.user.pem,
      owner:this.user.addr,
      file:this.files[0],
      visual:this.files[1],
      filename:this.filename,
      format:this.file_format,
      signature:this.title,
      secret:this.secret,
      price:this.price,
      fee:fee,
      description:this.desc,
      gift:this.gift,
      fullscreen:this.full_flyer,
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
        });
        if(func)func();
      }
    },(err)=>{
      this.message="";
      showMessage(this,err.error);
      if(func_error)func_error();
    })
  }

  add_visual(func=null,title="",width=200,height=200,square=true) {
    this.dialog.open(ImageSelectorComponent, {position:
        {left: '5vw', top: '5vh'},
      maxWidth: 400, maxHeight: 700, width: '90vw', height: 'auto', data:
        {
          title:title,
          result: this.files[1],
          checkCode: true,
          square:square,
          width: width,
          height: height,
          emoji: false,
          internet: false,
          ratio: 1,
          quality:0.7
        }
    }).afterClosed().subscribe((result) => {
      if (result) {
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


  add_all_seller() {
    //TODO: a coder la récupération de l'ensemble des distributeurs ayant reconnu le créateur
  }

  add_seller() {
    this.dialog.open(SelDealerComponent, {
      position:
        {left: '5vw', top: '5vh'},
      maxWidth: 400, width: '90vw', height: 'auto', data:{
        title:"Ajouter mes distributeurs"
      }
    }).afterClosed().subscribe((result) => {
      if (result!={}) {
        for(let seller of result){
          let obj:SellerProperties={address:seller.address,name:seller.name};
          this.dataSource.data.push(obj);
        }
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



  ask_for_price(question="",func:Function=null,fee=0){
    this.dialog.open(PromptComponent,{width: '250px',data:
        {
          title: "Prix de vente",
          question: question,
          result:0,
          min:0,max:10,
          type:"number",
          onlyConfirm:false,
          lbl_ok:"Ok",
          lbl_cancel:"Annuler"
        }
    }).afterClosed().subscribe((price) => {
      if(price){
        this.price=Number(price);
        this.min_price=0;this.max_price=this.price*2;this.miner_ratio=0;
        if(func)func(this.price); else this.tokenizer(fee);
      }
    });
  }



  ask_for_text(title:string,question:string,func:Function,_type="string",_max=0){
    this.dialog.open(PromptComponent,{width: '320px',
      data:{title: title,question: question,type:_type,max:_max,onlyConfirm:false,lbl_ok:"Ok",lbl_cancel:"Annuler"}})
      .afterClosed().subscribe((rc) => {
      if(rc=="no")rc=null;
      func(rc);
    });
  }



  quick_pow(token:any,w,h){
    this.add_visual((result:any)=>{
      this.files[1]=result.img;
      this.ask_for_text("Titre","Donner un titre à votre NFC",(title)=> {
        this.ask_for_text("Signer","Indiquer votre signature publique (pseudo, nom)",(signature)=> {
          if (title && title.length > 0) {
            this.ask_for_text("Authentification", "Donner une information vous désignant formellement (numéro de passeport, de SS, email)", (legende) => {
              if (legende != null) {
                this.title = title;
                this.desc = "Réalisé par "+signature;
                this.secret="Authentification "+legende;
                this.ask_for_price("Quel prix pour votre oeuvre", null, token.fee);
            }
          });
        }
        });
      });
    },"Télécharger un visuel de votre oeuvre",w,h,true);
  }



  quick_photo(token:any,title="",w=400,h=400,square=true) {
    this.add_visual((result:any)=>{
      this.files[1]=result.img;
      this.files[0]=result.original;
      this.filename=result.file.name;
      this.file_format=result.file.type;
      this.ask_for_text("Titre","Donner un titre à votre NFC",(title)=>{
        if(title && title.length>0){
          this.ask_for_text("Présentation","Rédigez une présentation rapide de votre photo pour la marketplace",(legende)=>{
            if(legende!=null){
              this.title=title;
              this.desc=legende;
              this.ask_for_price("Quel prix pour votre photo",null,token.fee);
            }
          });
        }
      });
    },title,w,h,square)
  }



  quick_secret(token,lib_secret="Saisissez votre secret, mot de passe ..."){
    this.ask_for_text("Contenu embarqué",lib_secret,(secret)=>{
      if(secret){
        this.secret=secret;
        this.ask_for_text("Un titre","Entrez un titre pour votre NFT",(title)=> {
          if(title)
            this.ask_for_text("Description","Ecrivez une breve description",(description)=>{
              if(description){
                this.desc=description;
                this.title=title;
                this.ask_for_price("Quel prix pour votre secret",null,token.fee);
              }
            })
        });
      }
    });
  }


  quick_loterie(token:any){
    this.add_visual((visual:any)=> {
      if(visual){
        this.files[1]=visual.img;
        this.ask_for_text("Nombre de billet","",(num_billets)=> {
          if(num_billets)
            this.ask_for_text("Montant du billet gagnant","",(gift)=> {
              if(gift)
                this.ask_for_price("Prix unitaire du billet",(price)=>{
                  this.count=num_billets-1;
                  this.gift=0;
                  this.secret="Désolé ! Perdu";
                  this.tokenizer(token.fee,(result)=>{
                    this.message="Fabrication du billet gagnant";
                    this.count=1;
                    this.gift=gift;
                    this.secret="Vous avez gagné "+gift+" xEgld";
                    this.tokenizer(token.fee);
                  });
                });
            },"number",20);
        },"number",20);
      }
    },"Visuel de vos billets");
  }





  quick_tickets($event:any,token:any){
    this.add_visual((visual:any)=>{
      if(visual){
        this.files[1]=visual.img;
        this.ask_for_text("Titre de votre évenement","",(title)=> {
          if (title) {
            this.ask_for_text("Lieu et Date","Indiquer l'adresse et l'horaire",(desc)=> {
              if (desc) {
                this.title=title+" - "+desc;
                this.secret="Billet: @id@";
                this.ask_for_price("Prix unitaire du billet",(price)=>{
                  this.ask_for_text("Combien de billets","Indiquer le nombre de billets à fabriquer (maximum 30)",(num)=>{
                    this.count=Number(num);
                    if(this.count<31)
                      this.tokenizer(token.fee);
                    else {
                      showMessage(this,"Maximum 30 billets en une seule fois");
                    }
                  },"number",30);
                })
              }
            });
          }
        });
      }

    },"Visuel de votre invitation");

  }



  quick_file($event: any,token:any) {
    this.files[0]=$event.file;
    this.filename=$event.filename;
    this.ask_for_text("Titre","Titre de votre annonce",(title)=>{
      if(title) {
        this.ask_for_text("Description","Rédigez une courte phrase pour donner envie de l'acheter",(desc)=>{
          if(desc){
            this.desc=desc;
            this.title=title;
            this.ask_for_price("Quel est votre prix pour ce fichier",null,token.fee);
          }
        })
      }
    });
  }


  show_fileupload(redirect: number,prompt:string,token:any) {
    this.show_zone_upload=true;
    this.prompt=prompt;
    this.redirect=redirect;
  }



  onupload($event: any) {
    if(this.redirect==1)this.quick_file($event,this.tokens[2]);
    if(this.redirect==2)this.quick_tickets($event,this.tokens[4]);
  }

  create_token(token: any) {
    this.selected_token=token;
  }

  open_wizard(token:any){
    if(token.index=="photo")this.quick_photo(token,"Télécharger votre photo",null,null,false);
    if(token.index=="pow")this.quick_pow(token,300,300);
    if(token.index=="music")this.show_fileupload(1,'Téléverser le fichier musical',token);
    if(token.index=="film")this.quick_secret(token,'coller le lien secret (fourni par youtube) du film');
    if(token.index=="file")this.show_fileupload(1,'Téléverser le fichier à embarquer dans votre token',token);
    if(token.index=="secret")this.quick_secret(token);
    if(token.index=="tickets")this.quick_tickets('Téléverser le visuel de votre invitation',token);
    if(token.index=="loterie")this.quick_loterie(token);
  }


}
