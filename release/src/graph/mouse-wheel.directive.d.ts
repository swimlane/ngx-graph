import { EventEmitter } from '@angular/core';
/**
 * Mousewheel directive
 * https://github.com/SodhanaLibrary/angular2-examples/blob/master/app/mouseWheelDirective/mousewheel.directive.ts
 *
 * @export
 * @class MouseWheelDirective
 */
export declare class MouseWheelDirective {
    mouseWheelUp: EventEmitter<{}>;
    mouseWheelDown: EventEmitter<{}>;
    onMouseWheelChrome(event: any): void;
    onMouseWheelFirefox(event: any): void;
    onMouseWheelIE(event: any): void;
    mouseWheelFunc(event: any): void;
}
