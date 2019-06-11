import { Injectable } from '@angular/core';
import { TooltipContentComponent } from '../graph/tooltip/tooltip.component';
import { InjectionRegistery } from './injection-registery.service';
import { InjectionService } from './injection.service';

@Injectable()
export class TooltipService extends InjectionRegistery {

  type: any = TooltipContentComponent;

  constructor(public injectionService: InjectionService) {
    super(injectionService);
  }

}