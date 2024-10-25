import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';

import { DemoModule } from 'src/docs/demos/demo.module';
import { AppRoutingModule } from './app-routing.module';
import { CommonModule } from '@angular/common';

@NgModule({
  declarations: [AppComponent],
  imports: [CommonModule, BrowserModule, DemoModule, AppRoutingModule],
  bootstrap: [AppComponent]
})
export class AppModule {}
