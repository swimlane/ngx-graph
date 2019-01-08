import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import { DocspaCoreModule } from '@swimlane/docspa-core';
import { config } from '../docspa.config';
import { Location, LocationStrategy, HashLocationStrategy } from '@angular/common';
import { DemoModule } from 'src/docs/demos/demo.module';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, DocspaCoreModule.forRoot(config), DemoModule],
  providers: [Location, { provide: LocationStrategy, useClass: HashLocationStrategy }],
  bootstrap: [AppComponent]
})
export class AppModule {}
