import { Directive, Output, HostListener, EventEmitter } from '@angular/core';
/**
 * Mousewheel directive
 * https://github.com/SodhanaLibrary/angular2-examples/blob/master/app/mouseWheelDirective/mousewheel.directive.ts
 *
 * @export
 * @class MouseWheelDirective
 */
var MouseWheelDirective = (function () {
    function MouseWheelDirective() {
        this.mouseWheelUp = new EventEmitter();
        this.mouseWheelDown = new EventEmitter();
    }
    MouseWheelDirective.prototype.onMouseWheelChrome = function (event) {
        this.mouseWheelFunc(event);
    };
    MouseWheelDirective.prototype.onMouseWheelFirefox = function (event) {
        this.mouseWheelFunc(event);
    };
    MouseWheelDirective.prototype.onMouseWheelIE = function (event) {
        this.mouseWheelFunc(event);
    };
    MouseWheelDirective.prototype.mouseWheelFunc = function (event) {
        if (window.event) {
            event = window.event;
        }
        var delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));
        if (delta > 0) {
            this.mouseWheelUp.emit(event);
        }
        else if (delta < 0) {
            this.mouseWheelDown.emit(event);
        }
        // for IE
        event.returnValue = false;
        // for Chrome and Firefox
        if (event.preventDefault) {
            event.preventDefault();
        }
    };
    MouseWheelDirective.decorators = [
        { type: Directive, args: [{ selector: '[mouseWheel]' },] },
    ];
    /** @nocollapse */
    MouseWheelDirective.ctorParameters = function () { return []; };
    MouseWheelDirective.propDecorators = {
        'mouseWheelUp': [{ type: Output },],
        'mouseWheelDown': [{ type: Output },],
        'onMouseWheelChrome': [{ type: HostListener, args: ['mousewheel', ['$event'],] },],
        'onMouseWheelFirefox': [{ type: HostListener, args: ['DOMMouseScroll', ['$event'],] },],
        'onMouseWheelIE': [{ type: HostListener, args: ['onmousewheel', ['$event'],] },],
    };
    return MouseWheelDirective;
}());
export { MouseWheelDirective };
//# sourceMappingURL=mouse-wheel.directive.js.map