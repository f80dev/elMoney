import {Component, EventEmitter, Input, OnChanges, OnInit, Output} from '@angular/core';
import {
  $$,
  CAN_RESELL,
  CAN_TRANSFERT,
  FIND_SECRET,
  removeHTML, RENT,
  SELF_DESTRUCTION,
  showError,
  showMessage,
  TRANSPARENT
} from "../tools";
import {environment} from "../../environments/environment";
import {NgNavigatorShareService} from "ng-navigator-share";
import {ClipboardService} from "ngx-clipboard";
import {Router} from "@angular/router";
import {ApiService} from "../api.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {PromptComponent} from "../prompt/prompt.component";
import {MatDialog} from "@angular/material/dialog";
import {SelDealerComponent} from "../sel-dealer/sel-dealer.component";
import {animate, state, style, transition, trigger} from "@angular/animations";

@Component({
  selector: 'app-nfts',
  templateUrl: './nfts.component.html',
  styleUrls: ['./nfts.component.sass'],
  animations:[
    trigger('burn',[
      state('normal',style({opacity:1,margin: '0px',padding:0,width:'99%','text-align': 'center'})),
      state('burned',style({opacity:0,margin: '0px',padding:0,width:'99%','text-align': 'center'})),
      transition("normal => burned",[animate('2s')])
    ])
  ]
})
export class NftsComponent implements OnChanges {

  @Input("user") user:any;
  @Input("art") art:boolean=true;
  @Input("filter") filter:string="*";
  @Input("nfts") nfts:any;
  @Input("fontsize") fontsize:string="medium";
  @Input("with_icon") with_icon:boolean=true;
  @Input("with_actions") with_actions:boolean=true;
  @Input("force_text") force_text:boolean=false;      //Force l'affichage de la description même si l'image en fullscreen
  @Input("maxwidth") max_w:string="500px";
  @Input("height") _h:string="auto"
  @Input("preview") preview=false;
  @Input("seller") seller:string="0x0000000000000000000000000000000000000000000000000000000000000000";
  @Output("refresh") onrefresh:EventEmitter<any>=new EventEmitter();
  @Output("buy") onbuy:EventEmitter<any>=new EventEmitter();
  @Output("transfer") ontransfer:EventEmitter<any>=new EventEmitter();

  constructor(
    public ngNavigatorShareService:NgNavigatorShareService,
    public _clipboardService:ClipboardService,
    public toast:MatSnackBar,
    public api:ApiService,
    public dialog:MatDialog,
    public router:Router,
  ) {
  }



  ngOnChanges(): void {
    // if(this.nfts){
    //   for(let nft of this.nfts){
    //     nft.visibility='visible';
    //     if(this.filter.length>0){
    //       for(let k of Object.keys(this.filter)){
    //       if(nft[k] && typeof nft[k]=="string" && nft[k].indexOf(this.filter[k])==-1){
    //         nft.visibility='hidden';
    //         break;
    //       }
    //     }
    //     }
    //
    //   }
    // }
  }


  share(nft){
    this.router.navigate(["promo"],{queryParams:{
        url:environment.domain_appli+"/?filter="+nft.token_id,
        visual:nft.visual,
        message:removeHTML(nft.description),
        title:nft.title,
        premium:nft.premium
      }});
  }


  buy(nft: any) {
    if(this.preview)return;
    this.onbuy.emit(nft);
  }


  setstate(nft: any, new_state, message) {
    this.user.check_pem(()=>{
      nft.message = message;
      this.api._post("state_nft/" + nft.token_id + "/" + new_state, "", {pem:this.user.pem}).subscribe((r: any) => {
        nft.message = "";
        let mes="Votre NFT n'est plus en vente";
        if(new_state==0)mes="Votre NFT est en vente"
        if(r)showMessage(this, mes+". Frais de service " + (r.cost) + " xEgld");
        this.onrefresh.emit("update");
      });
    },this);
  }


  give_response(nft:any){
    if ((nft.properties & FIND_SECRET) > 0) {
      this.dialog.open(PromptComponent, {
        data: {
          title:"Répondez pour gagner !",
          subtitle: 'Donner la réponse pour gagner (souvent en 1 seul mot ou un seul nombre)',
          question:"html:"+nft.description,
          onlyConfirm: false,
          lbl_ok: 'Répondre',
          lbl_cancel: 'Abandonner'
        }}).afterClosed().subscribe((result:any) => {
        if (result) {
          this.open(nft,result.toLowerCase());
        }
      });
    } else
      this.open(nft);
  }


  open(nft: any,reponse="") {
    this.user.check_pem(()=>{
      showMessage(this,"Vous allez pouvoir accéder au contenu de votre NFT dans quelques instants");
      nft.message = "En cours d'ouverture";
      this.api._post("open_nft/" + nft.token_id + "/", "", {pem:this.user.pem,response:reponse}).subscribe((r: any) => {
        nft.message = "";
        nft.open = r.response;
        if(nft.open.length==46)nft.open="https://ipfs.io/ipfs/"+nft.open;

        if((nft.properties & SELF_DESTRUCTION || nft.properties & RENT) > 0){
          $$("Ce NFT est programmé pour s'autodétruire");
          nft.delay=15;
          nft.timer=setInterval(()=>{
            nft.delay=nft.delay-1;
            nft.message="Notez ce message, Vous n'y aurez plus accès dans "+nft.delay+" secondes";
            if(nft.delay<=0){
              clearInterval(nft.timer);
              this.onrefresh.emit("burn");
            }
          },1000);
        } else {
          this.onrefresh.emit("open");
        }
      },(err)=>{
        showError(this,"Impossible d'ouvrir ce NFT");
      });
    },this,null);
  }


  burnState="normal";
  burn(nft: any) {
    this.dialog.open(PromptComponent, {
      data: {
        title: 'Confirmation',
        question: 'Souhaitez-vous vraiment détruire ce NFT ?',
        onlyConfirm: true,
        lbl_ok: 'Oui',
        lbl_cancel: 'Non'
      }}).afterClosed().subscribe((result:any) => {
      if (result=="yes") {
        this.user.check_pem(()=>{
          nft.message = "En cours de destruction";
          this.burnState="burn";
          this.api._post("burn/" + nft.token_id + "/", "", this.user.pem).subscribe((r: any) => {
            nft.message = "";
            showMessage(this, "Votre NFT n'existe plus");
            this.onrefresh.emit("burn");
          },(err)=>{
            showError(this,err);
            nft.message="";
          });
        },this);
      }
    });
  }



  transfer(nft: any) {
    this.ontransfer.emit(nft);
  }


  //Changer le prix de vente en ajoutant la commision du distributeur
  update_markup(nft: any) {
    this.dialog.open(PromptComponent, {
      data: {
        title: 'Marge vendeur',
        question: 'Indiquer votre commission entre '+nft.min_markup+" et "+nft.max_markup,
        result:Math.round(nft.price*0.2*100)/100,
        onlyConfirm: false,
        min:nft.min_markup,
        max:nft.max_markup,
        type:"number",
        lbl_ok: 'Oui',
        lbl_cancel: 'Non'
      }}).afterClosed().subscribe((result:any) => {
      if(result){
        debugger
        let obj={
          pem:this.user.pem,
          price:Number(result),
        };
        nft.message="Mise à jour du prix";
        this.api._post("update_price/"+nft.token_id+"/","",obj).subscribe((r:any)=>{
          nft.message="";
          let message=r.scResults[0].returnMessage;
          if(r.status=="success"){
            this.onrefresh.emit();
            message="Votre commision est fixée à "+result;
          }
          showMessage(this,message);
        },(err)=>{
          showError(this,err);
        });
      }
    });
  }


  add_dealer(nft: any) {
    this.user.check_pem(()=>{
      this.dialog.open(SelDealerComponent, {
        backdropClass:"removeBackground",
        position: {left: '5vw', top: '5vh'},
        maxWidth: 500, width: '90vw', height: 'auto',minWidth:300,
        data:{
          title: "Choisissez un distributeur pour votre NFT",
          result:this.user.addr
        }
      }).afterClosed().subscribe((result) => {
        if (result!={} && result && result.length>0) {
          let obj:any={
            dealers:result,
            pem:this.user.pem
          };
          nft.message="Ajout du distributeur en cours";

          this.api._post("add_dealer/"+nft.token_id+"/","",obj).subscribe((r:any)=>{
            nft.message="";
            if(r.status!="fail"){
              showMessage(this,"Distributeur ajouté");
              this.onrefresh.emit();
            } else {
              showMessage(this,r.scResults[0].returnMessage);
            }
          },(err)=>{
            nft.message="";
            showError(this,err);
          });
        }
      });
    });

  }

  can_sell(properties: number):boolean {
    let b=properties & CAN_RESELL;
    return (b>0);
  }


  is_transparent(properties: number):boolean {
    let b=properties & TRANSPARENT;
    return (b>0);
  }


  can_transfer(properties: number):boolean {
    let b=properties & CAN_TRANSFERT;
    return (b>0);
  }


  show_fullscreen(nft: any) {
    open(nft.visual,"fullscreen");
  }

  edit_field(nft: any, field_name: string) {
    if(nft.owner==nft.miner && nft.owner==this.user.addr && nft.state==1){
      this.user.check_pem(()=>{
        this.dialog.open(PromptComponent, {
          data: {
            title:"Nouveau contenu",
            default: nft[field_name],
            onlyConfirm: false,
            lbl_ok: 'Modifier',
            lbl_cancel: 'Abandonner'
          }}).afterClosed().subscribe((result:any) => {
          if (result) {
            nft.message="Modification du NFT";
            this.api._post("update_field/"+nft.token_id+"/"+field_name+"/","",{pem:this.user.pem,new_value:result}).subscribe(()=>{
              nft.message="";
              nft[field_name]=result;
              this.onrefresh.emit("update");
            })
          }
        });
      },this);
    } else {
      showMessage(this,"Vous devez à la fois être le propriétaire et le créateur d'un NFT pour pouvoir le modifier et celui-ci ne doit pas être en vente");
    }


  }

  answer(nft: any) {
    this.user.check_pem(()=>{
      this.dialog.open(PromptComponent, {
        data: {
          title:"Donner votre réponse",
          onlyConfirm: false,
          type:"number",
          min:1,
          max:10,
          lbl_ok: 'Modifier',
          lbl_cancel: 'Abandonner'
        }}).afterClosed().subscribe((result:any) => {
        if (result) {
          nft.message="Transfert de votre réponse dans le NFT";
          this.api._post("answer/"+nft.token_id+"/","",{pem:this.user.pem,resp:result}).subscribe(()=>{
            nft.message="";
            showMessage(this,"Votre réponse est bien enregistrée, elle reste modifiable tant que vous rester propriétaire du NFT");
          },(err)=>{showError(this,err);})
        }
      });
    },this);

  }
}
