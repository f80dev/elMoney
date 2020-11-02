import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {AdminComponent} from './admin/admin.component';
import {MainComponent} from "./main/main.component";
import {TransferComponent} from "./transfer/transfer.component";

const routes: Routes = [
   { path: 'admin', component: AdminComponent},
   { path: 'transfer', component: TransferComponent},
   { path: '', component: MainComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
