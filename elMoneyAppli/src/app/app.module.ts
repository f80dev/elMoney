import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

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
import {HttpClientModule} from "@angular/common/http";
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
import {QRCodeModule} from "angularx-qrcode";
import {ClipboardModule} from "@angular/cdk/clipboard";

@NgModule({
  declarations: [
    AppComponent,
    AdminComponent,
    HourglassComponent,
    FaqsComponent,
    TutoComponent,
    AboutComponent,
    PromptComponent,
    TransferComponent,
    MainComponent,
    ShareComponent,
    CreateComponent,
    PrivateComponent,
    TransPipe,
    MoneysComponent,
    SettingsComponent
  ],
  imports: [
    BrowserModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatSnackBarModule,
    SocialLoginModule,
    FormsModule,
    HttpClientModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    AppRoutingModule,
    MatInputModule,
    BrowserAnimationsModule,
    ServiceWorkerModule.register('ngsw-worker.js', {enabled: environment.production}),
    QRCodeModule,
    ClipboardModule
  ],
  providers: [
    ApiService,TransPipe,
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
