import {Component, EventEmitter, Input, OnChanges, OnInit, Output} from '@angular/core';
import {showError, showMessage} from "../tools";
import {environment} from "../../environments/environment";
import {NgNavigatorShareService} from "ng-navigator-share";
import {ClipboardService} from "ngx-clipboard";
import {Router} from "@angular/router";
import {ApiService} from "../api.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {PromptComponent} from "../prompt/prompt.component";
import {MatDialog} from "@angular/material/dialog";
import {SelDealerComponent} from "../sel-dealer/sel-dealer.component";

@Component({
  selector: 'app-nfts',
  templateUrl: './nfts.component.html',
  styleUrls: ['./nfts.component.sass']
})
export class NftsComponent implements OnChanges {

  @Input("user") user:any;
  @Input("art") art:boolean=true;
  @Input("filter") filter:string="*";
  @Input("nfts") nfts:any;
  @Input("fontsize") fontsize:string="normal";
  @Input("with_icon") with_icon:boolean=true;
  @Input("with_actions") with_actions:boolean=true;
  @Input("force_text") force_text:boolean=false;      //Force l'affichage de la description même si l'image en fullscreen
  @Input("width") _w:string="350px";
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
        message:"Acheter ce token",
        title:nft.uri
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
        let mes="Votre token n'est plus en vente";
        if(new_state==0)mes="Votre token est en vente"
        if(r)showMessage(this, mes+". Frais de service " + (r.cost) + " xEgld");
        this.user.refresh_balance(() => {
          this.onrefresh.emit();
        });
      });
    },this);
  }


  give_response(nft:any){
    if ((nft.properties & 0b10000) > 0) {
      this.dialog.open(PromptComponent, {
        data: {
          title: 'Donner la réponse pour gagner (souvent en 1 seul mot ou un seul nombre)',
          question:nft.description,
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
        this.user.refresh_balance(() => {});

        //Indique que le message est programmé pour s'autodétruire
        if((nft.properties & 0b1000) > 0){
          nft.delay=15;
          nft.timer=setInterval(()=>{
            nft.delay=nft.delay-1;
            nft.message="Notez ce message, il s'auto-détruira dans "+nft.delay+" secondes";
            if(nft.delay==0){
              clearInterval(nft.timer);
              this.onrefresh.emit();
            }
          },1000);
        }

      },(err)=>{
        showMessage(this,"Impossible d'ouvrir ce NFT");
      });
    },this,null);
  }



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
          this.api._post("burn/" + nft.token_id + "/", "", this.user.pem).subscribe((r: any) => {
            nft.message = "";
            showMessage(this, "Votre token n'existe plus");
            this.onrefresh.emit();
            this.user.refresh_balance();
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
        let obj={
          pem:this.user.pem.pem,
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

        position:
          {left: '5vw', top: '5vh'},
        maxWidth: 500, width: '90vw', height: 'auto',
        data:{
          title: "Se faire distribuer",
          result:this.user.addr
        }
      }).afterClosed().subscribe((result) => {
        if (result!={} && result.length>0) {
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
    let b=properties & 0b00000010;
    return (b>0);
  }


  is_transparent(properties: number):boolean {
    let b=properties & 0b01000000;
    return (b>0);
  }


  can_transfer(properties: number):boolean {
    let b=properties & 0b00000001;
    return (b>0);
  }


  show_fullscreen(nft: any) {
    open(nft.visual,"fullscreen");
  }
}
