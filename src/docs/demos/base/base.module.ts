import { NgModule } from '@angular/core';
import { NgxGraphModule } from '../../../../projects/swimlane/ngx-graph/src/public_api';
import { CommonModule } from '@angular/common';

@NgModule({
  imports: [NgxGraphModule, CommonModule]
})
export class BaseModule {}
