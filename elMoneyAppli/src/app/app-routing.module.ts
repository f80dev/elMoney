import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {AdminComponent} from './admin/admin.component';
import {MainComponent} from "./main/main.component";
import {TransferComponent} from "./transfer/transfer.component";
import {CreateComponent} from "./create/create.component";
import {PrivateComponent} from "./private/private.component";
import {MoneysComponent} from "./moneys/moneys.component";
import {SettingsComponent} from "./settings/settings.component";
import {AboutComponent} from "./about/about.component";
import {SupportComponent} from "./support/support.component";
import {ContactsComponent} from "./contacts/contacts.component";
import {FaqsComponent} from "./faqs/faqs.component";
import {ImporterComponent} from "./importer/importer.component";
import {NftStoreComponent} from "./nft-store/nft-store.component";
import {FaucetComponent} from "./faucet/faucet.component";
import {ValidateComponent} from "./validate/validate.component";

const routes: Routes = [
   { path: 'admin', component: AdminComponent},
   { path: 'transfer', component: TransferComponent},
   { path: 'create', component: CreateComponent},
   { path: 'private', component: PrivateComponent},
   { path: 'moneys', component: MoneysComponent},
   { path: 'faqs', component: FaqsComponent},
   { path: 'settings', component: SettingsComponent},
   { path: 'about', component: AboutComponent},
  { path: 'validate', component: ValidateComponent},
    { path: 'importer', component: ImporterComponent},
    { path: 'store', component: NftStoreComponent},
   { path: 'faucet', component: FaucetComponent},
   { path: 'support', component: SupportComponent},
    { path: 'main', component: MainComponent},
      { path: 'contacts', component: ContactsComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
