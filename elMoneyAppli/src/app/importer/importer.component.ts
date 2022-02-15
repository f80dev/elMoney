import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {$$, eval_properties, isHTML, now, showError, showMessage} from "../tools";
import {ApiService} from "../api.service";
import {UserService} from "../user.service";
import {ImageSelectorComponent} from "../image-selector/image-selector.component";
import {MatDialog} from "@angular/material/dialog";
import {ActivatedRoute, Router} from "@angular/router";
import {MatSnackBar} from "@angular/material/snack-bar";
import {ConfigService} from "../config.service";
import {environment} from "../../environments/environment";
import {MatTableDataSource} from "@angular/material/table";
import {StepperSelectionEvent} from "@angular/cdk/stepper";
import {PromptComponent} from "../prompt/prompt.component";
import {SelDealerComponent} from "../sel-dealer/sel-dealer.component";
import {COMMA, ENTER} from "@angular/cdk/keycodes";
import {FormControl} from "@angular/forms";
import {Observable} from "rxjs";
import {MatAutocomplete, MatAutocompleteSelectedEvent} from "@angular/material/autocomplete";
import {MatChipInputEvent} from "@angular/material/chips";
import {map, startWith} from "rxjs/operators";
import {IpfsService} from "../ipfs.service";
import {DatePipe, Location} from "@angular/common";
import {ClipboardService} from "ngx-clipboard";

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

  picture:string="";
  visual:string=""
  collection:string="";
  count: number=1;
  gift:number=0;
  secret: string="";
  price: number=0;
  title: string="Mon super NFT";
  desc: string="mint by "+this.user.pseudo;
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
  find_secret: boolean=false;
  self_destruction: boolean=false;
  rent: boolean=false;
  direct_sell: boolean=true;

  miner_ratio: number = 0;
  idx_tab: number=0;
  show_zone_upload: boolean=false;
  redirect: number=0;
  prompt: string="";
  tokens: any[]=[]; //Liste des types de tokens
  file_format: string="";
  selected_token: any;
  nfts_preview: any[]=[];
  opt_gift:boolean=false; //si false, chaque billet contient le gift sinon un seul billet le contient
  transparent:boolean=false; //si false, chaque billet contient le gift sinon un seul billet le contient

  nft_on_db=false;
  id_required=false;

  //Gestion des tags
  solde_user: number;
  extensions: string="*";
  uploadProgress: number;
  selected_tab = 0;
  elrond_standard:boolean=false;
  vote=false;
  secret_vote=false;
  instant_sell=true;
  opt_unik: any=false;
  opt_miner_can_burn=false;
  nfts_to_send: any[]=[];
  owner_addr: string="";
  creator_addr: string="";


  //Money à utiliser pour la transaction du NFT
  selected_money: any={label:"eGld",identifier:"egld"};
  moneys: any[]=[];

  //Gestion des tags
  visible = true;
  selectable = true;
  separatorKeysCodes: number[] = [ENTER, COMMA];
  tagCtrl = new FormControl();
  filteredTags: Observable<string[]>;
  tags: string[] = [];
  allTags: string[] = ['Photos', 'Musique','Evénement',"Secret","Souvenir","Peinture","Scoop"];

  @ViewChild('tagsInput') tagInput: ElementRef<HTMLInputElement>;
  @ViewChild('auto') matAutocomplete: MatAutocomplete;
  file_to_send: { pem: string; filename:string,content: any };
  required_tokens: any[]=[];




  constructor(public api:ApiService,
              public user:UserService,
              public config:ConfigService,
              public ipfs:IpfsService,
              public _location:Location,
              public dialog:MatDialog,
              public toast:MatSnackBar,
              public routes:ActivatedRoute,
              public _clipboardService:ClipboardService,
              public datepipe:DatePipe,
              public router:Router) {
    this.filteredTags = this.tagCtrl.valueChanges.pipe(
      startWith(null),
      map((tag: string | null) => tag ? this._filter(tag) : this.allTags.slice()));

  }

  ngOnInit(): void {
    this.user.check_pem(()=>{
      localStorage.setItem("last_screen","importer");
      this.api._get("moneys/"+this.user.addr).subscribe((r:any)=>{
        for(let money of Object.values(r)){
          if(money.hasOwnProperty("tokenIdentifier")){
            this.moneys.push({identifier:money["tokenIdentifier"],label:money["unity"]})
          }
        }
        this.selected_money=this.moneys[0];
        if(this.routes.snapshot.queryParamMap.has("token")){
          for(let tk of this.tokens){
            if(tk.index==this.routes.snapshot.queryParamMap.get("token")){
              this.open_wizard(tk);
              this._location.replaceState(".");
            }
          }
        }
      });
    },this,"La création d'un NFT requiert votre signature",()=>{
      this._location.back();
    });



    this.api.getyaml("tokens").subscribe((r:any)=>{
      this.tokens=[];
      for(let token of r.content){
        token.tuto_title=token.title.replace("<br>"," ");
        token.tuto=token.tuto+"<br><br><small>Le cout de fabrication est d'environ "+token.fee+" + "+token.transac+" xEgld de frais de réseau</small>";
        if(token.production)
          this.tokens.push(token);
      }
    });
    if(this.user.pseudo.length==0){
      showMessage(this,"Vous pouvez créer un NFT anonynement mais il est préférable de se donner un pseudo à minima");
    }

    if(this.routes.snapshot.queryParamMap.has("tab")){
      this.selected_tab=Number(this.routes.snapshot.queryParamMap.get("tab"));
    }
  }

  add(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;

    // Add our fruit
    if ((value || '').trim()) {
      this.tags.push(value.trim());
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }

    this.tagCtrl.setValue(null);
  }



  remove(fruit: string): void {
    const index = this.tags.indexOf(fruit);
    if (index >= 0) {
      this.tags.splice(index, 1);
    }
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    this.tags.push(event.option.viewValue);
    this.tagInput.nativeElement.value = '';
    this.tagCtrl.setValue(null);
  }


  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.allTags.filter(tag => tag.toLowerCase().indexOf(filterValue) === 0);
  }


  _import(_file: any,index_file=0,prompt="",func=null) {
    this.picture=_file.file;
    this.filename=_file.filename;
  }



  tokenizer(fee=0,func=null,func_error=null,simulate=false) {
    //properties est stoké sur 8 bits : 00000<vente directe possible><le propriétaire peut vendre><le propriétaire peut offrir>
    if(this.min_price<0 || this.max_price<0 || this.price<0){
      showMessage(this,"Données incorrectes");
      if(func_error)func_error();
      return;
    }

    if(this.gift>0){
      $$("Lorsqu'il y a de l'argent on ne peut pas décaller la fabrication du NFT");
      this.nft_on_db=false;
    }

    let required_token_ids=[];
    for(let t of this.required_tokens)
      required_token_ids.push(t.token_id);

    let properties=eval_properties(this);
    this.message="Transfert des fichiers vers IPFS";
    this.ipfs.add(this.visual,this,(cid_visual)=>{
      this.ipfs.add(this.picture,this,(cid_picture)=> {
        let obj = {
          pem: this.user.pem,
          owner: this.user.addr,
          file: cid_picture,
          visual: cid_visual,
          filename: this.filename,
          format: this.file_format,
          title: this.title,
          collection: this.collection,
          deadline:this.deadline,
          secret: this.secret,
          price: this.price,
          elrond_standard:this.elrond_standard,
          fee: fee,
          rent: this.rent,
          tags: this.tags,
          desc: this.desc,
          vote:this.vote,
          gift: this.gift,
          instant_sell:this.instant_sell,
          fullscreen: false,
          find_secret: this.find_secret,
          min_markup: this.min_price,
          creator: this.creator_addr,
          dealers: this.dataSource.data,
          properties: properties,
          opt_lot: Number(this.opt_gift),
          direct_sell: this.direct_sell,
          miner_ratio: this.miner_ratio,
          money: this.selected_money.identifier,
          required_tokens:required_token_ids,
          network:this.nft_on_db ? "db" : "elrond"
        };

        if(this.owner_addr.length>0)obj["owner"]=this.owner_addr;
        if(this.creator_addr.length>0)obj["creator"]=this.creator_addr;

        showMessage(this,"Création du NFT");

        this.message = "Enregistrement dans la blockchain";
        window.scrollTo(0, 0);
        this.show_zone_upload = false;

        if(this.count>20)showMessage(this,"Le délai de création de "+this.count+" NFTs peut être long");

        this.api._post("mint/" + this.count, "simulate="+simulate, obj,240).subscribe((r: any) => {
          this.message = "";
          if(!simulate){
            $$("Enregistrement dans la blockchain");
            if (r) {
              let cost=0;
              for(let t of r){cost=cost+t["cost"];}
              showMessage(this, "Fichier tokenisé pour " + cost + " xEgld");
              setTimeout(()=>{
                this.user.refresh_balance(() => {
                  this.router.navigate(["nfts-perso"], {queryParams: {index: 1}});
                },()=>{showError(this);});
                if (func) func(r);
              },1500);
            }
          } else {
            showMessage(this,"Cout estimé "+r.gas);
          }
        }, (err) => {
          if(this.count<15){
            $$("!Erreur de création");
            this.message = "";
            showMessage(this, err.error);
            if (func_error) func_error();
          } else {
            showMessage(this,"Vos NFTs sont en cours de création, ils devraient bientôt être présent dans vos NFTs");
          }
        });
      });
    });
  }


  create_preview(){
    if(this.nfts_preview.length==0){
      this.nfts_preview=[
        {
          title: this.title,
          properties: eval_properties(this),
          desc: this.desc,
          secret: this.secret,
          tags: this.tags.join(" "),
          visual: this.visual,
          miner: this.user.addr,
          owner: this.user.addr,
          state: 0,
          isDealer: false,
          message: "",
          price: this.price
        }
      ];
      $$("Fabrication du NFT pour prévisualisation ",this.nfts_preview[0]);
    } else this.nfts_preview=[];
  }


  add_visual(func=null,title="",width=200,height=200,square=true,can_be_null:boolean=true,bank=true,subtitle="") {
    this.dialog.open(ImageSelectorComponent, {
      position:{left: '10vw', top: '10vh'},
      backdropClass:'removeBackground',
      maxWidth: 900, maxHeight: 900, width: '80vw', height: 'auto',
      data:
        {
          title:title,
          subtitle:subtitle,
          result: this.visual,
          checkCode: true,
          square:square,
          width: width,
          height: height,
          emoji: false,
          internet: false,
          ratio: 1,
          quality:0.7,
          webcam:true,
          bank:bank
        }
    }).afterClosed().subscribe((result) => {
      if (result) {
        this.transparent=result.img.indexOf("image/gif")>0 || result.img.indexOf("image/png")>0 || result.img.indexOf("webp")>0;
        this.visual=result.img;
        if(func)func(result);
      } else {
        if(can_be_null){
          func(null);
        } else {
          showMessage(this,"Action annulée");
        }

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

  add_seller(all_seller=false) {
    if(all_seller){

    } else {
      this.dialog.open(SelDealerComponent, {
        position: {left: '5vw', top: '5vh'},
        maxWidth: 500, width: '95vw', height: 'auto',
        data:{
          title:"Ajouter mes distributeurs",
          direct_sel:false,
          no_dealer_message:"Aucun distributeur ne vous a référencé. Demander votre référencement depuis la marketplace"
        }
      }).afterClosed().subscribe((result:any) => {
        if (result && Object.keys(result).length>0) {
          for(let seller of result){
            let obj:SellerProperties={address:seller.address,name:seller.name};
            this.dataSource.data.push(obj);
          }
          this.dataSource._updateChangeSubscription();
        }
      });
    }
  }



  delete_dealer(element: any) {
    let idx=this.dataSource.data.indexOf(element);
    if(idx>-1){
      this.dataSource.data.splice(idx,1);
      if(this.dataSource.data.length==0)this.direct_sell=true;
      this.dataSource._updateChangeSubscription();
    }
  }


  update_idx($event: StepperSelectionEvent) {
    this.idx_tab=$event.selectedIndex;
  }

  ask_options(options:any[],func:Function,title="Sélectionnez une option") {
    this.dialog.open(PromptComponent,{width: 'auto',data:
        {
          title: title,
          question: "",
          type:"options",
          options:options,
          lbl_ok:"Ok",
          lbl_cancel:"Annuler"
        }
    }).afterClosed().subscribe((result) => {
      func(result);
    });
  }


  ask_for_price(question="",func:Function=null,fee=0,default_price=0){
    this.dialog.open(PromptComponent,{
      backdropClass:'removeBackground',
      width: '280px',data:
        {
          title: "Prix de vente ?",
          question: question,
          result:0,
          value:default_price,
          subtitle:"Montant en "+this.selected_money.label,
          min:0,max:10,
          type:"number",
          onlyConfirm:false,
          lbl_ok:"Ok",
          lbl_cancel:"Annuler"
        }
    }).afterClosed().subscribe((price) => {
      if(price){
        this.price=price.replace(",",".");
        this.min_price=0;this.max_price=this.price*2;this.miner_ratio=0;
        if(func)func(Number(this.price)); else this.ask_confirm(fee);
      }
    });
  }



  ask_for_text(title:string,question:string,func:Function,subtitle:string="",_type="string",_max=0,_default:any="",placeholder=""){
    let _data= {
      title: title,
      question: question,
      type: _type,
      max: _max,
      onlyConfirm: false,
      lbl_ok: "Ok",
      lbl_cancel: "Annuler",
      result:_default,
      placeholder: placeholder,
      subtitle:subtitle
    }
    if(_type=="text")_type="string";
    if(_type=="number" && _default=="")_default=0;
    if(_max>0 && _type!="number")_max=0;
    if(_type=="date" && _default=="")_default=new Date().toDateString();
    if(_default!="")_data.result=_default;

    this.dialog.open(PromptComponent,{
      backdropClass:"removeBackground",
      width: '350px',
      data:_data
    }).afterClosed().subscribe((rc) => {
      if(rc=="no")rc=null;
      func(rc);
    });
  }



  quick_pow(token:any,w,h,extension="*"){
    this.extensions=extension;
    this.add_visual((result:any)=>{
      if(result && result.img){
        this.ask_for_text("Titre","Donner un titre à votre NFC",(title)=> {
          this.ask_for_text("Signer","Indiquer votre signature publique (pseudo, nom)",(signature)=> {
            if (title && title.length > 0) {
              this.ask_for_text("Authentification", "Donner une information vous désignant formellement (numéro de passeport, de SS, email)", (legende) => {
                if (legende != null) {
                  this.title = title;
                  this.desc = "Réalisé par "+signature;
                  if(token.tags)this.desc=this.desc+" "+token.tags;
                  this.secret="Authentification "+legende;
                  this.ask_for_price("Quel prix pour votre oeuvre", null, token.fee);
                }
              });
            } else {
              this.show_zone_upload=false;
            }
          });
        });
      } else this.cancel_wizard();
    },"Télécharger un visuel de votre oeuvre",w,h,true);
  }



  quick_photo(token:any,title="",subtitle="",w=400,h=400,square=true) {
    this.add_visual((result:any)=>{
      this.visual=result.img;
      this.picture=result.file;
      if(result.file){
        this.filename=result.file.name;
        this.file_format=result.file.type;
      }
      this.ask_for_text("Titre","Donner un titre à votre NFT",(title)=>{
        if(title && title.length>0){
          this.ask_for_text("Présentation","Rédigez une présentation rapide de votre photo pour la place de marché",(legende)=>{
            if(legende==null)legende="";
            this.title=title;
            this.desc=legende;
            if(token.tags)this.desc=this.desc+" "+token.tags;
            this.ask_for_price("Quel prix pour votre photo",null,token.fee);
          },"Exemple: Tirage argentique numérisé, objectif 24/36");
        } else this.show_zone_upload=false;
      },"Un titre doit être court (3 ou 4 mots) et percutant");
    },title,w,h,square,false,false,subtitle);
  }


  quick_propriete(token){
    this.ask_for_text("Description du bien","Décrivez précisément le bien à attribuer",(desc)=>{
      this.add_visual((visual)=>{
        this.ask_for_text("Titre du bien","Indiquer le nom du bien",(title)=>{
          this.ask_for_text("Désigner le nouveau propriétaire","Indiquer les nom, prénoms du destinataire",(names)=>{
            this.ask_for_text("Renforcer l'identification","Ajouter un identifiant tel qu'un numéro de passeport, de carte d'identité, de sécurité sociale",(identifiant)=>{
              this.visual=visual;
              this.self_destruction=false;
              this.rent=false;
              this.price=0;
              this.owner_can_sell=false;
              this.owner_can_transfer=false;
              this.desc=desc+" "+title+" est la propriété de "+names+" identifié par "+identifiant;
              this.title=title;
              this.ask_confirm(token.fee);
            });
          });
        });
      },"",300,300,false,true,false);
    },"Un visuel va pouvoir être ajouté","memo")
  }



  quick_secret(token,lib_secret="Saisissez votre secret (mot de passe, adresse secret, lien web ...)",_default=""){
    this.ask_for_text("Contenu embarqué",lib_secret,(secret)=>{
      if(secret){
        this.secret=secret;
        this.ask_for_text("Un titre","Entrez un titre pour présenter votre NFT sur les places de marché",(title)=> {
          if(title)
            this.ask_for_text("Description","Rédiger une brève description",(description)=>{
              this.add_visual((visual)=>{
                if(visual)this.visual=visual.img;
                this.ask_options([
                  {label:"<div class='bloc-bouton'>Le NFT s'autodétruit<br>après ouverture</div>",value:true,width:'200px'},
                  {label:"<div class='bloc-bouton'>Le NFT peut être ouvert<br>plusieurs fois</div>",value:false,width:'200px'}
                ],(value)=>{
                  this.self_destruction=value;
                  this.desc=description;
                  if(token.tags)this.desc=this.desc+" "+token.tags;
                  this.title=title;
                  this.ask_for_price("Quel prix pour votre NFT",null,token.fee);
                });
              },"Ajouter un visuel si vous le souhaitez")
            },"","memo")
        });
      } else this.cancel_wizard();
    },"ce lien ne sera visible qu'au propriétaire du NFT","url",0,"",_default);
  }


  quick_game(token){
    this.ask_for_text("La question","Quelle est la question du jeu",(question)=>{
      if(!question)this.cancel_wizard();
      this.desc=question;
      if(!this.desc.endsWith("?"))this.desc=this.desc+" ?";
      this.ask_for_text("Quelle est la réponse","Entrer la réponse (si possible en 1 seul mot) extactement comme le joueur doit la saisir",(secret)=> {
        if(secret)this.secret=secret.toLowerCase().trim();
        if(secret.indexOf(" ")>-1){
          this.cancel_wizard("Votre secret ne doit contenir qu'un seul mot (ou un seul nombre) afin de limiter les problèmes de syntaxe pour les partacipants donnant la réponse");
        }
        this.ask_for_text("Titre","Rédiger un titre pour votre jeu",(title)=>{
          if(title){
            this.ask_for_text("Récompense","De combien est la récompense",(gift)=>{
              this.gift=Number(gift);
              this.ask_options([
                {label:"<div class='bloc-bouton'>Le NFT s'autodétruit<br>après ouverture</div>",value:true,width:'200px'},
                {label:"<div class='bloc-bouton'>Le NFT peut être ouvert<br>plusieurs fois</div>",value:false,width:'200px'}
              ],(value)=>{
                this.self_destruction=value;
                this.title=title;
                this.find_secret=true;

                if(token.tags)this.desc=this.desc+" "+token.tags;
                this.ask_for_price("Combien coute la participation",null,token.fee);
              });
            });
          }
        },"Exemple: Calcul mental")
      },"Exemple: 168");
    },"Exemple: Combien font 12 x 14 ?");
  }


  create_options(func,title="Rédiger les réponses possible",func_abort=null){
    this.ask_for_text(title,"Saisisser les différentes options possible en les séparant par un retour à la ligne",(text_options)=> {
      if(text_options.length>0){
        let options = [];
        let i = 0;
        for (let txt of text_options.split("\n")) {
          if (txt.trim().length > 0) {
            i++;
            options.push("Choix " + i + " : <strong>" + txt.trim() + "</strong>");
          }
        }
        let rc="<li>"+options.join("</li><li>")+"</li>";
        rc="<div style='text-align: left;'>Les propositions sont les suivantes:<br><ul style='text-align: left;'>"+rc+"</ul></div>";
        func(rc,options);
      } else {
        if(!func_abort)func_abort();
      }


    },"","memo");
  }


  quick_vote(token){
    this.ask_for_text("Question du sondage / du vote","",(title)=>{
      this.title=title;
      this.create_options((desc,options)=>{
        this.desc=desc;
        this.ask_for_text("Récompense","De combien est la récompense pour la participation",(gift)=> {
          this.gift = gift;
          this.vote=true;
          this.owner_can_transfer=false;
          this.secret_vote=false;
          if(token.tags)this.desc=this.desc+" "+token.tags;
          this.ask_for_text("Nombre de participants","",(count)=>{
            this.count=count;
            this.instant_sell=true;
            this.ask_for_price("Combien coute la participation",null,token.fee);
          },"","number");
        });
      },"Lister les différents choix",()=>{this.cancel_wizard()})
    },"Exemple: Pour ou contre le nucléaire ?","string",0,"");
  }


  quick_qcm(token){
    this.ask_for_text("La question","Quelle est la question du QCM",(question)=>{
      this.title=question;
      if(!this.title.endsWith("?"))this.title=this.title+" ?";
      if(!question)this.cancel_wizard();

      this.create_options((desc,options)=>{
        this.desc=desc;
        this.ask_for_text("Indiquer la bonne réponse de 1 à "+options.length,"html:"+this.desc,(secret)=>{
          secret=Number(secret).toFixed(0);
          if(secret && secret<=options.length && secret>0){
            this.ask_for_text("Récompense","De combien est la récompense",(gift)=>{
              this.gift=gift;
              if(gift>0)this.title=this.title+" Gagnez "+gift+" "+this.selected_money.label+" en trouvant la réponse";
              this.ask_options([
                {label:"<div class='bloc-bouton'>Le NFT s'autodétruit<br>après ouverture</div>",value:true,width:'200px'},
                {label:"<div class='bloc-bouton'>Le NFT peut être ouvert<br>plusieurs fois</div>",value:false,width:'200px'}
              ],(value)=>{
                this.self_destruction=value;
                this.find_secret=true;
                this.secret=Number(secret).toString();
                if(token.tags)this.desc=this.desc+" "+token.tags;
                this.ask_for_price("Combien coute la participation",null,token.fee);
              });
            },"","number");
          } else this.cancel_wizard("Cette réponse n'est pas possible");
        },"","number",options.length,1)
      },"Rédiger les réponses possible",()=>{this.cancel_wizard()});
    },"Exemple: Combien font 12 x 14 ?");
  }


  quick_loterie(token:any){
    this.add_visual((visual:any)=> {
      if(visual){
        this.filename=visual.file.name;
        this.ask_for_text("Titre de l'événement","",(title)=> {
          this.ask_for_text("Nombre de billet","",(num_billets)=> {
            if(!num_billets)this.cancel_wizard();
            this.ask_for_text("Montant du billet gagnant","",(gift)=> {
              if(!gift)this.cancel_wizard();
              this.ask_for_price("Prix unitaire du billet",(price)=>{
                this.count=num_billets;
                this.self_destruction=true;
                this.opt_gift=true;
                this.gift=gift;
                this.title=title;
                this.desc="Ouvrir pour savoir si vous avez gagné"
                this.ask_confirm(token.fee);
              });
            },"Montant en eGold","number",20);
          },"Prix en eGold","number",20);
        },"Exemple: la grande loterie");
      }
    },"Visuel de vos billets de participation");
  }

  //http://localhost:4200/importer?token=member_card
  deadline: number=0;
  quick_card(token:any,title="Titre de la carte / du club ?"){
    this.add_visual((visual:any)=>{
      if(visual){
        this.ask_for_text(title,"",(title)=> {
          if (title) {
            this.title=title;
            this.ask_for_text("Nom du club","",(club_name)=> {
              this.ask_for_text("Durée de validité (en jours)","",(duration_validity)=> {
                let dtExpiration=this.datepipe.transform(now(Number(duration_validity)*3600*24),"dd/MM/yyyy");
                this.desc=club_name;
                this.ask_for_price("Prix unitaire de la carte", (price) => {
                  this.ask_for_text("Combien de cartes fabriquer", "", (num) => {
                    this.count = Number(num);
                    this.opt_miner_can_burn=true;
                    if (this.count < this.config.values.max_token)
                      this.ask_confirm(token.fee);
                    else {
                      showMessage(this, "Maximum "+this.config.values.max_token+" billets en une seule fois");
                    }
                  }, "", "number", 30);
                })
              },"","number",0,365)
            },"","string",0,"Elrond Fan")
          }
        },"Exemple: Carte de membre","string",0,"Carte de membre");
      } else this.cancel_wizard();
    },"Visuel associé à la carte",200,200,true,false);
  }


  quick_tickets(token:any,title="Titre de votre évenement"){
    this.add_visual((visual:any)=>{
      if(visual){
        this.ask_for_text(title,"",(title)=> {
          if (title) {
            this.ask_for_text("Adresse","Indiquer l'adresse",(lieu)=> {
              this.ask_for_text("La date","Quel jour à lieu votre événement",(dt)=> {
                this.ask_for_text("Heure","Indiquer L'heure",(hr)=> {
                  this.desc =lieu +" - "+ this.datepipe.transform(dt,"dd/MM/yyyy") +" à "+hr;
                  this.title = title;
                  this.secret = "@id@";
                  if (token.tags) this.desc = this.desc + " " + token.tags;
                  this.ask_for_price("Prix unitaire du billet", (price) => {
                    this.ask_for_text("Combien de billets", "Indiquer le nombre de billets à fabriquer (maximum 30)", (num) => {
                      this.count = Number(num);
                      this.opt_miner_can_burn=true;
                      if (this.count < this.config.values.max_token)
                        this.ask_confirm(token.fee);
                      else {
                        showMessage(this, "Maximum "+this.config.values.max_token+" billets en une seule fois");
                      }
                    }, "", "number", 30);
                  })
                },"Exemple: 20:30")
              },"","date")
            },"Exemple: Rendez-vous 12 rue Martel, Paris");
          }
        },"Exemple: Les dessins de Picasso");
      } else this.cancel_wizard();
    },"Visuel du billet",200,200,true,false);
  }


  quick_lifeevents(token: any) {
    this.ask_for_text("Donner un titre à votre souvenir","",(title)=> {
      if (title) {
        this.ask_for_text("Commentaire", "Ajouter un commentaire, une impression, un lieu", (desc) => {
          this.ask_for_text("Dater l'événement", "Dater votre événement", (dt) => {
            this.add_visual((visual: any) => {
              if(visual){
                this.visual="";
                this.picture = visual.img;
                this.title = title;
                this.instant_sell=false;
                this.desc = desc+" - "+new Date(dt).toLocaleDateString();
                if (token.tags) this.desc = this.desc + " " + token.tags;
                this.owner_can_sell = false;
                this.owner_can_transfer = true;
                this.price = 0;
                this.ask_confirm(token.fee);
              }
            }, "Ajouter une belle photo de cet événement", 800, 800);
          },"","date");
        },"Exemple: une super journée à la mer","memo");
      }
    },"Exemple: L'anniversaire de Lola");
  }



  quick_file( $event: any,token:any,
              title="Ajouter un visuel",
              subtitle="Exemple: Manuel de fonctionnement de la TB-303",
              desc="Exemple: Ce manuel de fonctionnement couvre l'utilisation courante du synthétiseur",
              titre_annonce="Titre de votre annonce",
              titre_desc="Rédigez une courte phrase pour donner envie de l'acheter"
  ) {
    this.picture=$event.file;
    this.filename=$event.filename;
    this.extensions="*";

    this.add_visual((visual)=>{
      if(!visual)showMessage(this,"Pas de visuel");
      this.ask_for_text(titre_annonce,"",(title)=>{
        if(title) {
          this.ask_for_text("Description",titre_desc,(desc)=>{
            if(desc){
              this.ask_for_text("Nombre d'exemplaire","",(occ)=> {
                if (Number(occ)>0) {
                  this.desc=desc;
                  this.count=occ;
                  if(token.tags)this.desc=this.desc+" "+token.tags;
                  this.title=title;
                  this.ask_for_price("Quel est votre prix pour ce fichier",null,token.fee);
                } else
                  this.cancel_wizard("Annulation");
              },"Indiquer le nombre de NFT identique à créer","number",15,1);
            }
          },desc,"memo")
        }
      },subtitle);
    },title);

  }

  quick_contract($event: any,token:any,title="Ajouter un visuel",subtitle="Contrat de travail à durée indéterminée",desc="Entre les soussignés Madame X et Monsieur Y") {
    this.picture=$event.file;
    this.filename=$event.filename;
    this.extensions="*";

    this.ask_for_text("Titre du contrat","",(title)=>{
      if(title) {
        this.ask_for_text("Description","Préciser l'objet du contrat",(desc)=>{
          if(!desc)desc="";
          this.ask_for_text("L'identité des cosignataires","Indiquer les noms, prénoms, date et lieu de naissance des cosignataires",(email)=>{
            this.desc=desc+token.tags;
            this.title=title;
            this.owner_can_transfer=true;
            this.owner_can_sell=false;
            this.price=0;
            this.count=2;
            this.min_price=0;
            this.max_price=0;

            this.tokenizer(token.fee,(r)=>{
              let body={pem:this.user.pem,message:"",title:this.title,from:this.config.server.explorer+"/account/"+this.user.addr};
              this.message="Expédition au contractant";
              this.api._post("transfer_nft/"+r.ids[0]+"/"+email+"/","",body).subscribe(()=>{
                this.message="";
                return;
              },(err)=>{showError(this,err)});
            });
          });
        },"","memo")
      }
    },subtitle);
  }


  show_fileupload(redirect: number,prompt:string,token:any,extension="*") {
    this.show_zone_upload=true;
    this.extensions=extension;
    this.prompt=prompt;
    this.redirect=redirect;
  }



  onupload($event: any) {
    if(this.redirect==3)this.quick_file($event,this.tokens[4],
      "Ajouter la pochette du titre",
      "Exemple: Karma Police",
      "Exemple: Radiohead",
      "titre du morceau / de l'album",
      "Liste des titres / Auteur");
    if(this.redirect==1)this.quick_file($event,this.tokens[3]);
    if(this.redirect==2)this.quick_contract($event,this.tokens[5]);
  }


  create_token(token: any) {
    this.selected_token=token;
  }



  open_wizard(token:any){
    this._location.replaceState(".","tab=0&token="+token.index);
    if(token.index=="photo")this.quick_photo(token,"Sélectionner la photo","Sélectionnez une partie de la photo pour présenter le NFT sur la place de marché",null,null,false);
    if(token.index=="pow")this.quick_pow(token,300,300);
    if(token.index=="music")this.show_fileupload(3,'Téléverser le fichier musical',token,"audio/*");
    if(token.index=="film")this.quick_secret(token,'Indiquer le lien internet de votre film');
    if(token.index=="file")this.show_fileupload(1,'Téléverser le fichier à embarquer dans votre eNFT',token);
    if(token.index=="contract")this.show_fileupload(2,'Téléverser le contrat signé',token);
    if(token.index=="secret")this.quick_secret(token);
    if(token.index=="game")this.quick_game(token);
    if(token.index=="qcm")this.quick_qcm(token);
    if(token.index=="life_events")this.quick_lifeevents(token);
    if(token.index=="tickets")this.quick_tickets(token);
    if(token.index=="member_card")this.quick_card(token);
    if(token.index=="loterie")this.quick_loterie(token);
    if(token.index=="propriete")this.quick_propriete(token);
    if(token.index=="vote")this.quick_vote(token);
  }

  cancel_wizard(message=""){
    this.show_zone_upload=false;
    showMessage(this,"Création du NFT annulée. "+message);
    setTimeout(()=>{this._location.back();},1000);
  }


  ask_confirm(fee){
    this.dialog.open(PromptComponent,{width: 'auto',data:
        {
          title: "Construire immédiatement le NFT ou le modifier avant ?",
          question: "",
          options: {},
          lbl_ok:"Fabriquer",
          lbl_cancel:"Modifier"
        }
    }).afterClosed().subscribe((result) => {
      if(result==""){
        this.tokenizer(fee);
      } else {
        this.selected_tab=1;
      }

    });
  }

  make_token(bSimulate=false) {
    // if(this.tags && this.tags.length>0)
    //   for(let tag of this.tags)
    //     if(tag)this.desc=" "+this.desc.trim()+"#"+tag;
    this.tokenizer(0,null,null,bSimulate);
  }

  inc_price(inc: number) {
    this.price=this.price+0.1;
  }

  update_user_solde() {
    this.solde_user=Number(this.user.moneys[this.selected_money.identifier].balance);
  }


  is_html(desc: string) {
    return isHTML(desc);
  }

  onUpload($event: any) {
    this.file_to_send={content:$event.file,filename:$event.filename,pem:this.user.pem};
    this.api._post("mint_from_file/eval/","filename="+$event.filename,this.file_to_send).subscribe((r:any)=>{
      this.nfts_to_send=r;
    });
  }


  send_file() {
    let keys=[];
    for(let item of this.nfts_to_send){
      if(item["to_mint"]==1)keys.push(item.index);
    }
    this.file_to_send["to_mint"]=keys;

    this.message="Fabrication des NFTs.";
    this.api._post("mint_from_file/mint/","filename="+this.file_to_send.filename,this.file_to_send,60).subscribe(r=>{
      this.nfts_to_send=[];
      this.message="";
    },(err)=>{
      this.message="";
      if(err.name=="TimeoutError"){
        showMessage(this,"La fabrication de vos NFTs est en cours, cela peut durer plusieurs minutes. Ils apparaitront dans vos NFTs au fil du processus.")
        this.router.navigate(["nfts-perso"],{queryParams:{index:2}});
      }
    });
  }




  export_to_yaml(){
    let file="count: "+this.count+"\ntitle: "+this.title+"\ndescription: \""+this.desc+"\"";
    if(this.price>0)file=file+"\nprice: "+this.price;
    if(this.secret.length>0)file=file+"\nsecret: "+this.secret;
    if(this.owner_can_transfer)file=file+"\nowner_can_transfer: 1";
    if(this.owner_can_sell)file=file+"\nowner_can_sell: 1";
    if(this.instant_sell)file=file+"\ninstant_sell: 1";
    if(this.visual.length>0)file=file+"\nvisual: "+this.visual;
    if(this.direct_sell)file=file+"\ndirect_sell: 1";
    if(this.gift>0)file=file+"\ngift: "+this.gift;
    if(this.owner_addr.length>0)file=file+"\nowner: "+this.owner_addr;
    if(this.vote)file=file+"\nvote: 1";
    if(this.secret_vote)file=file+"\nsecret_vote: 1";
    if(this.tags.length>0)file=file+"\ntags: "+this.tags;
    if(this.self_destruction)file=file+"\nself_destruction: 1";
    if(this.find_secret)file=file+"\nfind_secret: 1";

    file=file+"\nto_mint: 1";
    this._clipboardService.copy(file);
    showMessage(this,"Le contenu est disponible dans le presse-papier");
  }

  update_tab(evt) {
    this._location.replaceState('./importer','tab='+evt)
  }

  add_required_token() {
    this.api._get("nfts", "").subscribe((nfts: any) => {
      let options=[];
      for(let t of nfts){
        options.push({value:t,label:t.title});
      }
      if(options.length>0){
        this.dialog.open(PromptComponent,{width: 'auto',data:
            {
              title: "Selectionner le NFT requis pour l'achat",
              type:"list",
              question: "NFT sélectionné",
              options:options,
              onlyConfirm:false,
              lbl_ok:"Ok",
              lbl_cancel:"Annuler"
            }
        }).afterClosed().subscribe((result) => {
            if (result) this.required_tokens.push(result);
          }
        );
      } else {
        showMessage(this,"Aucun NFT ne peut être utilisé comme référence");
      }
    })
  }

  remove_required_token(t: any) {
    let i=this.required_tokens.indexOf(t);
    if(i>-1)this.required_tokens.splice(i,1);
  }
}
