import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {
  Location,
  LocationStrategy,
  PathLocationStrategy
} from '@angular/common';
import { DocSPACoreComponent } from '@swimlane/docspa-core';

const routes: Routes = [
  { path: '**', component: DocSPACoreComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: [
    Location,
    { provide: LocationStrategy, useClass: PathLocationStrategy }
  ]
})
export class AppRoutingModule { }