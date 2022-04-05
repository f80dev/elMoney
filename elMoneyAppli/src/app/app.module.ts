import { NgModule } from '@angular/core';
import {MatTableModule} from '@angular/material/table';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { AdminComponent } from './admin/admin.component';
import { HourglassComponent } from './hourglass/hourglass.component';
import { FaqsComponent } from './faqs/faqs.component';
import { TutoComponent } from './tuto/tuto.component';
import { AboutComponent } from './about/about.component';
import { PromptComponent } from './prompt/prompt.component';
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {GoogleLoginProvider, SocialAuthServiceConfig, SocialLoginModule} from "angularx-social-login";
import {FormsModule} from "@angular/forms";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {HttpClientModule} from '@angular/common/http';
import {ApiService} from "./api.service";
import {MAT_DIALOG_DATA, MatDialogModule} from "@angular/material/dialog";
import {MatInputModule} from "@angular/material/input";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import { TransferComponent } from './transfer/transfer.component';
import { MainComponent } from './main/main.component';
import { ShareComponent } from './share/share.component';
import { CreateComponent } from './create/create.component';
import { PrivateComponent } from './private/private.component';
import { TransPipe } from './trans.pipe';
import { MoneysComponent } from './moneys/moneys.component';
import { SettingsComponent } from './settings/settings.component';
import {ClipboardModule} from "@angular/cdk/clipboard";
import { SupportComponent } from './support/support.component';
import { AccountComponent } from './account/account.component';
import {SocketIoConfig, SocketIoModule} from "ngx-socket-io";
import { ContactsComponent } from './contacts/contacts.component';
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MatToolbarModule} from "@angular/material/toolbar";
import { SidemenuComponent } from './sidemenu/sidemenu.component';
import {MatSidenavModule} from "@angular/material/sidenav";
import {MatListModule} from "@angular/material/list";
import { NewContactComponent } from './new-contact/new-contact.component';
import { ElrondAddrComponent } from './elrond-addr/elrond-addr.component';
import { ScannerComponent } from './scanner/scanner.component';
import {WebcamModule} from "ngx-webcam";
import {MatSliderModule} from "@angular/material/slider";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatSelectModule} from "@angular/material/select";
import { ImporterComponent } from './importer/importer.component';
import { NftStoreComponent } from './nft-store/nft-store.component';
import {MatCardModule} from "@angular/material/card";
import { FaucetComponent } from './faucet/faucet.component';
import { FilterPipe } from './filter.pipe';
import { ValidateComponent } from './validate/validate.component';
import { NftsComponent } from './nfts/nfts.component';
import { TokenComponent } from './token/token.component';
import { NftsPersoComponent } from './nfts-perso/nfts-perso.component';
import {MatTabsModule} from "@angular/material/tabs";
import { PromoComponent } from './promo/promo.component';
import {MatStepperModule} from "@angular/material/stepper";
import { ImageSelectorComponent } from './image-selector/image-selector.component';
import {MatGridListModule} from "@angular/material/grid-list";
import {ImageCropperModule} from "ngx-image-cropper";
import { SafePipe } from './safe.pipe';
import { NewDealerComponent } from './new-dealer/new-dealer.component';
import { TransactionsComponent } from './transactions/transactions.component';
import { UploadFileComponent } from './upload-file/upload-file.component';
import { MinersComponent } from './miners/miners.component';
import { PublicMinerComponent } from './public-miner/public-miner.component';
import { SelDealerComponent } from './sel-dealer/sel-dealer.component';
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {MatChipsModule} from "@angular/material/chips";
import {CommonModule, DatePipe} from "@angular/common";
import { NftBuyComponent } from './nft-buy/nft-buy.component';
import { SavekeyComponent } from './savekey/savekey.component';
import { AuthentComponent } from './authent/authent.component';
import {WalletconnectService} from "./walletconnect.service";
import {MatButtonToggleModule} from "@angular/material/button-toggle";
import { UnityComponent } from './unity/unity.component';
import { ImageComponent } from './image/image.component';
import {MatProgressBarModule} from "@angular/material/progress-bar";
import { ChartsComponent } from './charts/charts.component';
import { NftConfirmComponent } from './nft-confirm/nft-confirm.component';
import { MinicontactsComponent } from './minicontacts/minicontacts.component';
import {ShareButtonsModule} from "ngx-sharebuttons/buttons";
import {ShareIconsModule} from "ngx-sharebuttons/icons";
import {QRCodeModule} from "angularx-qrcode";
import { VotesComponent } from './votes/votes.component';
import {GoogleChartsModule} from 'angular-google-charts';
import {VisgraphComponent} from "./visgraph/visgraph.component";
import { CollectionsComponent } from './collections/collections.component';


const config: SocketIoConfig = {
  url: environment.domain_server,
  options: {}
};

@NgModule({
  declarations: [
    AppComponent,
    AdminComponent,
    HourglassComponent,
    FaqsComponent,
    TutoComponent,
    VisgraphComponent,
    AboutComponent,
    PromptComponent,
    TransferComponent,
    MainComponent,
    ShareComponent,
    CreateComponent,
    PrivateComponent,
    TransPipe,
    MoneysComponent,
    SettingsComponent,
    SupportComponent,
    AccountComponent,
    ContactsComponent,
    SidemenuComponent,
    NewContactComponent,
    ElrondAddrComponent,
    ScannerComponent,
    ImporterComponent,
    NftStoreComponent,
    FaucetComponent,
    FilterPipe,
    ValidateComponent,
    NftsComponent,
    TokenComponent,
    NftsPersoComponent,
    PromoComponent,
    ImageSelectorComponent,
    SafePipe,
    NewDealerComponent,
    TransactionsComponent,
    UploadFileComponent,
    MinersComponent,
    PublicMinerComponent,
    SelDealerComponent,
    NftBuyComponent,
    SavekeyComponent,
    AuthentComponent,
    UnityComponent,
    ImageComponent,
    ChartsComponent,
    NftConfirmComponent,
    MinicontactsComponent,
    VotesComponent,
    CollectionsComponent
  ],
    imports: [
        MatButtonModule,
        MatButtonToggleModule,
        MatDialogModule,
        MatIconModule,
        MatAutocompleteModule,
        MatSnackBarModule,
        SocialLoginModule,
        SocketIoModule.forRoot(config),
        FormsModule,
        MatTableModule,
        HttpClientModule,
        MatCheckboxModule,
        WebcamModule,
        MatProgressSpinnerModule,
        MatProgressBarModule,
        AppRoutingModule,
        MatInputModule,
        BrowserAnimationsModule,
        ServiceWorkerModule.register('ngsw-worker.js', {enabled: environment.production}),
        QRCodeModule,
        MatSlideToggleModule,
        MatToolbarModule,
        MatSidenavModule,
        MatListModule,
        MatSliderModule,
        MatExpansionModule,
        MatSelectModule,
        ClipboardModule,
        MatCardModule,
        MatTabsModule,
        MatStepperModule,
        MatGridListModule,
        ImageCropperModule,
        MatChipsModule,
        CommonModule,
        ShareButtonsModule,
        ShareIconsModule,
        CommonModule,
        QRCodeModule,
        GoogleChartsModule
    ],
  providers: [
    ApiService,
    WalletconnectService,
    TransPipe,
    SafePipe,
    DatePipe,
    {
      provide: 'SocialAuthServiceConfig',
      useValue: {
        autoLogin: false,
        providers: [
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            provider: new GoogleLoginProvider('794055474370-qrdn0gb051k774mtetvo7lifcslmlpgg.apps.googleusercontent.com'),
          },
        ],
      } as SocialAuthServiceConfig,
    },
    {provide: MAT_DIALOG_DATA, useValue: {hasBackdrop: false}}

  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
