import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {$$, autoRotate, cropToSquare, resizeBase64Img, showMessage} from "../tools";
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
import {COMMA, ENTER} from "@angular/cdk/keycodes";
import {FormControl} from "@angular/forms";
import {Observable} from "rxjs";
import {MatAutocomplete, MatAutocompleteSelectedEvent} from "@angular/material/autocomplete";
import {MatChipInputEvent} from "@angular/material/chips";
import {map, startWith} from "rxjs/operators";
import {IpfsService} from "../ipfs.service";
import {DatePipe, Location} from "@angular/common";

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
  show_preview=false;

  displayedColumns: string[] = ['Address', 'name','delete'];
  dataSource = new MatTableDataSource<SellerProperties>([]);
  owner_can_sell: boolean=true;
  owner_can_transfer: boolean=true;
  find_secret: boolean=false;
  self_destruction: boolean=false;
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

  constructor(public api:ApiService,
              public user:UserService,
              public config:ConfigService,
              public ipfs:IpfsService,
              public _location:Location,
              public dialog:MatDialog,
              public toast:MatSnackBar,
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
      });
    },this,"La création d'un NFT requiert votre clé",()=>{
      this._location.back();
    });



    this.api.getyaml("tokens").subscribe((r:any)=>{
      this.tokens=[];
      for(let token of r.content){
        token.tuto_title=token.title.replace("<br>"," ");
        token.tuto=token.tuto+"<br><br><small>Le cout de fabrication est d'environ "+token.fee+" + "+token.transac+" xEgld de frais de réseau</small>";
        this.tokens.push(token);
      }
    });
    if(this.user.pseudo.length==0){
      showMessage(this,"Vous pouvez créer un NFT anonynement mais il est préférable de se donner un pseudo à minima");
    }
  }

  //Gestion des tags
  solde_user: number;
  extensions: string="*";
  uploadProgress: number;
  selected_tab = 0;


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
    this.filename=_file.name;
  }


  tokenizer(fee=0,func=null,func_error=null,simulate=false) {
    //properties est stoké sur 8 bits : 00000<vente directe possible><le propriétaire peut vendre><le propriétaire peut offrir>
    if(this.min_price<0 || this.max_price<0 || this.price<0){
      showMessage(this,"Données incorrectes");
      if(func_error)func_error();
      return;
    }

    let properties:number=0b00000000;
    if(this.owner_can_transfer)properties=properties+0b00000001;
    if(this.owner_can_sell)properties=properties    +0b00000010;
    if(this.direct_sell)properties=properties       +0b00000100;
    if(this.self_destruction)properties=properties  +0b00001000;
    if(this.find_secret)properties=properties       +0b00010000; //L'utilisateur doit fournir le secret dans l'open pour recevoir le cadeau
    if(this.opt_gift)properties=properties          +0b00100000; //On affiche l'option d'ouverture même si aucun secret
    if(this.transparent)properties=properties       +0b01000000; //on affiche un cadre autour de l'image ou pas

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
          signature: this.title,
          secret: this.secret,
          price: this.price,
          fee: fee,
          tags: this.tags,
          description: this.desc,
          gift: this.gift,
          fullscreen: false,
          find_secret: this.find_secret,
          max_markup: this.max_price,
          min_markup: this.min_price,
          dealers: this.dataSource.data,
          properties: properties,
          opt_lot: Number(this.opt_gift),
          direct_sell: this.direct_sell,
          miner_ratio: this.miner_ratio,
          money: this.selected_money.identifier
        };

        $$("Création du token ", obj);

        this.message = "Enregistrement dans la blockchain";
        window.scrollTo(0, 0);
        this.show_zone_upload = false;
        this.api._post("mint/" + this.count, "simulate="+simulate, obj).subscribe((r: any) => {
          if(!simulate){
            $$("Enregistrement dans la blockchain");
            if (r) {
              this.message = "";
              showMessage(this, "Fichier tokeniser pour " + r.cost + " xEgld");
              this.user.refresh_balance(() => {
                this.router.navigate(["nfts-perso"], {queryParams: {index: 2}});
              });
              if (func) func();
            }
          }

        }, (err) => {
          $$("!Erreur de création");
          this.message = "";
          showMessage(this, err.error);
          if (func_error) func_error();
        });
      });
    });
  }


  create_preview(){
    this.nfts_preview=[
      {
        title:this.title,
        description:this.desc,
        secret:this.secret,
        visual:this.visual,
        miner:"0x1",
        owner:"0x2",
        state:0,
        isDealer:false,
        message:"",
        price:this.price
      }
    ]
  }


  add_visual(func=null,title="",width=200,height=200,square=true,can_be_null:boolean=true,bank=true,subtitle="") {
    this.dialog.open(ImageSelectorComponent, {position:{left: '10vw', top: '10vh'},
      maxWidth: 900, maxHeight: 900, width: '80vw', height: 'auto', data:
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

  add_seller() {
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


  ask_for_price(question="",func:Function=null,fee=0){
    this.dialog.open(PromptComponent,{width: '280px',data:
        {
          title: "Prix de vente ?",
          question: question,
          result:0,
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
      type: _type, max: _max,
      onlyConfirm: false,
      lbl_ok: "Ok",
      lbl_cancel: "Annuler",
      result: placeholder,
      subtitle:subtitle
    }
    if(_type=="number" && _default=="")_default=0;
    if(_type=="date" && _default=="")_default=new Date().toDateString();
    if(_default!="")_data.result=_default;

    this.dialog.open(PromptComponent,{width: '320px',data:_data}).afterClosed().subscribe((rc) => {
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
      }
    },"Télécharger un visuel de votre oeuvre",w,h,true);
  }



  quick_photo(token:any,title="",subtitle="",w=400,h=400,square=true) {
    this.add_visual((result:any)=>{
      debugger
      this.visual=result.img;
      this.picture=result.file;
      if(result.file){
        this.filename=result.file.name;
        this.file_format=result.file.type;
      }
      this.ask_for_text("Titre","Donner un titre à votre NFC",(title)=>{
        if(title && title.length>0){
          this.ask_for_text("Présentation","Rédigez une présentation rapide de votre photo pour la marketplace",(legende)=>{
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

  quick_secret(token,lib_secret="Saisissez votre secret, mot de passe ...",_default=""){
    this.ask_for_text("Contenu embarqué",lib_secret,(secret)=>{
      if(secret){
        this.secret=secret;
        this.ask_for_text("Un titre","Entrez un titre pour votre NFT",(title)=> {
          if(title)
            this.ask_for_text("Description","Ecrivez une breve description",(description)=>{
              if(description){
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
                    this.ask_for_price("Quel prix pour votre secret",null,token.fee);
                  });
                },"Ajouter un visuel si vous le souhaitez")
              }
            },"","memo")
        });
      }
    },"ce lien ne sera visible qu'au propriétaire du NFT","url",0,"",_default);
  }


  quick_game(token){
    this.ask_for_text("La question","Quel est la question du jeu",(question)=>{
      if(question){
        this.desc=question;
        if(!this.desc.endsWith("?"))this.desc=this.desc+" ?";
        this.ask_for_text("Quelle est la réponse","Entrer la réponse (si possible en 1 seul mot) extactement comme le joueur doit la saisir",(secret)=> {
          if(secret)
            this.secret=secret.toLowerCase().trim();
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
      }
    },"Exemple: Combien font 12 x 14 ?");
  }


  quick_loterie(token:any){
    this.add_visual((visual:any)=> {
      if(visual){
        this.filename=visual.file.name;
        this.ask_for_text("Titre de l'événement","",(title)=> {
          this.ask_for_text("Nombre de billet","",(num_billets)=> {
            if(num_billets)
              this.ask_for_text("Montant du billet gagnant","",(gift)=> {
                if(gift)
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
    },"Visuel de vos billets");
  }





  quick_tickets($event:any,token:any){
    this.add_visual((visual:any)=>{
      if(visual){
        this.ask_for_text("Titre de votre évenement","",(title)=> {
          if (title) {
            this.ask_for_text("Adresse","Indiquer l'adresse",(lieu)=> {
              this.ask_for_text("La date","Quel jour à lieu votre événement",(dt)=> {
                this.ask_for_text("Heure","Indiquer L'heure",(hr)=> {
                  this.desc =lieu +" - "+ this.datepipe.transform(dt,"dd/MM/yyyy") +" à "+hr;
                  this.title = title;
                  this.secret = "Billet: @id@";
                  if (token.tags) this.desc = this.desc + " " + token.tags;
                  this.ask_for_price("Prix unitaire du billet", (price) => {
                    this.ask_for_text("Combien de billets", "Indiquer le nombre de billets à fabriquer (maximum 30)", (num) => {
                      this.count = Number(num);
                      if (this.count < 31)
                        this.ask_confirm(token.fee);
                      else {
                        showMessage(this, "Maximum 30 billets en une seule fois");
                      }
                    }, "", "number", 30);
                  })
                },"Exemple: 20:30")
              },"","date")
            },"Exemple: Rendez-vous 12 rue Martel, Paris");
          }
        },"Exemple: Les dessins de Picasso");
      }
    },"Visuel de votre invitation");
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



  quick_file($event: any,token:any,title="Ajouter un visuel",subtitle="Exemple: Manuel de fonctionnement de la TB-303",desc="Exemple: Ce manuel de fonctionnement couvre l'utilisation courante du synthétiseur") {
    this.picture=$event.file;
    this.filename=$event.filename;
    this.extensions="*";

    this.add_visual((visual)=>{
      if(!visual)showMessage(this,"Pas de visuel");
      this.ask_for_text("Titre de votre annonce","",(title)=>{
        if(title) {
          this.ask_for_text("Description","Rédigez une courte phrase pour donner envie de l'acheter",(desc)=>{
            if(desc){
              this.desc=desc;
              if(token.tags)this.desc=this.desc+" "+token.tags;
              this.title=title;
              this.ask_for_price("Quel est votre prix pour ce fichier",null,token.fee);
            }
          },desc,"memo")
        }
      },subtitle);
    },title);

  }


  show_fileupload(redirect: number,prompt:string,token:any,extension="*") {
    this.show_zone_upload=true;
    this.extensions=extension;
    this.prompt=prompt;
    this.redirect=redirect;
  }



  onupload($event: any) {
    if(this.redirect==3)this.quick_file($event,this.tokens[4],"Ajouter la pochette du titre","Exemple: Karma Police","Exemple: Radiohead");
    if(this.redirect==1)this.quick_file($event,this.tokens[3]);
  }


  create_token(token: any) {
    this.selected_token=token;
  }



  open_wizard(token:any){
    if(token.index=="photo")this.quick_photo(token,"Sélectionner la photo","Calibrer l'aperçu présenter sur le NFT pour inciter à la vente",null,null,false);
    if(token.index=="pow")this.quick_pow(token,300,300);
    if(token.index=="music")this.show_fileupload(3,'Téléverser le fichier musical',token,"audio/*");
    if(token.index=="film")this.quick_secret(token,'Indiquer le lien internet de votre film');
    if(token.index=="file")this.show_fileupload(1,'Téléverser le fichier à embarquer dans votre token',token);
    if(token.index=="secret")this.quick_secret(token);
    if(token.index=="game")this.quick_game(token);
    if(token.index=="life_events")this.quick_lifeevents(token);
    if(token.index=="tickets")this.quick_tickets('Téléverser le visuel de votre invitation',token);
    if(token.index=="loterie")this.quick_loterie(token);
    if(token.index=="propriete")this.quick_propriete(token);


  }


  showPreview() {
    this.create_preview();
    this.show_preview=!this.show_preview;
  }


  ask_confirm(fee){
    this.dialog.open(PromptComponent,{width: 'auto',data:
        {
          title: "Construire immédiatement le NFT ou le modifier avant ?",
          question: "",
          options: {},
          lbl_ok:"Construire",
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

  make_token() {
    if(this.tags && this.tags.length>0)
      for(let tag of this.tags)
        if(tag)this.desc=" "+this.desc.trim()+"#"+tag;

    this.tokenizer();
  }

  inc_price(inc: number) {
    this.price=this.price+0.5;
  }

  update_user_solde() {
    this.solde_user=Number(this.user.moneys[this.selected_money.identifier].balance);
  }


  cancelUpload() {

  }
}
