import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {AdminComponent} from './admin/admin.component';
import {MainComponent} from "./main/main.component";
import {TransferComponent} from "./transfer/transfer.component";
import {CreateComponent} from "./create/create.component";
import {PrivateComponent} from "./private/private.component";

const routes: Routes = [
   { path: 'admin', component: AdminComponent},
   { path: 'transfer', component: TransferComponent},
   { path: 'create', component: CreateComponent},
   { path: 'private', component: PrivateComponent},
   { path: '', component: MainComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
