
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
import {NftsPersoComponent} from "./nfts-perso/nfts-perso.component";
import {PromoComponent} from "./promo/promo.component";
import {RouterModule, Routes} from "@angular/router";
import {TransactionsComponent} from "./transactions/transactions.component";
import {MinersComponent} from "./miners/miners.component";
import {PublicMinerComponent} from "./public-miner/public-miner.component";
import {NftBuyComponent} from "./nft-buy/nft-buy.component";
import {NgModule} from "@angular/core";
import {ChartsComponent} from "./charts/charts.component";
import {VotesComponent} from "./votes/votes.component";
import {VisgraphComponent} from "./visgraph/visgraph.component";
import {CollectionsComponent} from "./collections/collections.component";

const routes: Routes = [
  { path: 'admin', component: AdminComponent},
  { path: 'transfer', component: TransferComponent},
  { path: 'create', component: CreateComponent},
  { path: 'private', component: PrivateComponent},
  { path: 'moneys', component: MoneysComponent},
  { path: 'collections', component: CollectionsComponent},
  { path: 'faqs', component: FaqsComponent},
  { path: 'settings', component: SettingsComponent},
  { path: 'about', component: AboutComponent},
  { path: 'validate', component: ValidateComponent},
  { path: 'nfts-perso', component: NftsPersoComponent},
  { path: 'importer', component: ImporterComponent},
  { path: 'visgraph', component: VisgraphComponent},
  { path: 'miners', component: MinersComponent},
  { path: 'store', component: NftStoreComponent},
  { path: 'promo', component: PromoComponent},
  { path: 'faucet', component: FaucetComponent},
  { path: 'refund', component: FaucetComponent},
  { path: 'support', component: SupportComponent},
  { path: 'transactions', component:TransactionsComponent},
  { path: 'votes', component:VotesComponent},
  { path: 'charts', component:ChartsComponent},
  { path: 'log', component:TransactionsComponent},
  { path: 'miner', component:PublicMinerComponent},
  { path: 'main', component: MainComponent},
  { path: 'wallet', component: MainComponent},
  { path: 'nft-buy', component: NftBuyComponent},
  { path: 'contacts', component: ContactsComponent},
  { path: '**', component: NftStoreComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
