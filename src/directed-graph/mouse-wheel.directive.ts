import { Directive, Output, HostListener, EventEmitter } from '@angular/core';

/**
 * Mousewheel directive
 * https://github.com/SodhanaLibrary/angular2-examples/blob/master/app/mouseWheelDirective/mousewheel.directive.ts
 * 
 * @export
 * @class MouseWheelDirective
 */
@Directive({ selector: '[mouseWheel]' })
export class MouseWheelDirective {

  @Output() mouseWheelUp = new EventEmitter();
  @Output() mouseWheelDown = new EventEmitter();

  @HostListener('mousewheel', ['$event']) 
  onMouseWheelChrome(event: any): void {
    this.mouseWheelFunc(event);
  }

  @HostListener('DOMMouseScroll', ['$event']) 
  onMouseWheelFirefox(event: any): void {
    this.mouseWheelFunc(event);
  }

  @HostListener('onmousewheel', ['$event']) 
  onMouseWheelIE(event: any): void {
    this.mouseWheelFunc(event);
  }

  mouseWheelFunc(event: any): void {
    if (window.event) {
      event = window.event;
    }

    const delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));
    if (delta > 0) {
      this.mouseWheelUp.emit(event);
    } else if(delta < 0) {
      this.mouseWheelDown.emit(event);
    }

    // for IE
    event.returnValue = false;

    // for Chrome and Firefox
    if(event.preventDefault) {
      event.preventDefault();
    }
  }

}
