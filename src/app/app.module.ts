import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import {
  DocspaCoreModule,
  MarkdownModule,
  MarkdownElementsModule,
  RuntimeContentModule,
  DocsifyPluginsModule
} from '@swimlane/docspa-core';
import { DocspaStackblitzModule } from '@swimlane/docspa-stackblitz';
import { config } from '../docspa.config';
import { DemoModule } from 'src/docs/demos/demo.module';
import { NgxGraphModule } from '@swimlane/ngx-graph';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { preset } from '@swimlane/docspa-remark-preset';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';
import { environment } from 'src/environments/environment';
import { AppRoutingModule } from './app-routing.module';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    DocspaCoreModule.forRoot(config, environment),
    DemoModule,
    MarkdownModule.forRoot(preset),
    MarkdownElementsModule.forRoot(),
    LoggerModule.forRoot({ level: NgxLoggerLevel.WARN }),
    RuntimeContentModule.forRoot({
      imports: [NgxGraphModule, NgxChartsModule, DemoModule]
    }),
    DocsifyPluginsModule,
    DocspaStackblitzModule,
    AppRoutingModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
