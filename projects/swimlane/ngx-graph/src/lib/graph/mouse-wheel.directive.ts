import { Directive, Output, HostListener, EventEmitter } from '@angular/core';

/**
 * Mousewheel directive
 * https://github.com/SodhanaLibrary/angular2-examples/blob/master/app/mouseWheelDirective/mousewheel.directive.ts
 *
 * @export
 */
// tslint:disable-next-line: directive-selector
@Directive({ selector: '[mouseWheel]' })
export class MouseWheelDirective {
  @Output()
  mouseWheelUp = new EventEmitter();
  @Output()
  mouseWheelDown = new EventEmitter();

  @HostListener('mousewheel', ['$event'])
  onMouseWheelChrome(event: any): void {
    this.mouseWheelFunc(event);
  }

  @HostListener('DOMMouseScroll', ['$event'])
  onMouseWheelFirefox(event: any): void {
    this.mouseWheelFunc(event);
  }

  @HostListener('wheel', ['$event'])
  onWheel(event: any): void {
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

    const delta: number = Math.max(-1, Math.min(1, event.wheelDelta || -event.detail || event.deltaY || event.deltaX));
    // Firefox don't have native support for wheel event, as a result delta values are reverse
    const isWheelMouseUp: boolean = event.wheelDelta ? delta > 0 : delta < 0;
    const isWheelMouseDown: boolean = event.wheelDelta ? delta < 0 : delta > 0;
    if (isWheelMouseUp) {
      this.mouseWheelUp.emit(event);
    } else if (isWheelMouseDown) {
      this.mouseWheelDown.emit(event);
    }

    // for IE
    event.returnValue = false;

    // for Chrome and Firefox
    if (event.preventDefault) {
      event.preventDefault();
    }
  }
}
