// https://github.com/SodhanaLibrary/angular2-examples/blob/master/app/mouseWheelDirective/mousewheel.directive.ts
"use strict";
var core_1 = require('@angular/core');
var MouseWheelDirective = (function () {
    function MouseWheelDirective() {
        this.mouseWheelUp = new core_1.EventEmitter();
        this.mouseWheelDown = new core_1.EventEmitter();
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
        { type: core_1.Directive, args: [{ selector: '[mouse-wheel]' },] },
    ];
    /** @nocollapse */
    MouseWheelDirective.ctorParameters = function () { return []; };
    MouseWheelDirective.propDecorators = {
        'mouseWheelUp': [{ type: core_1.Output },],
        'mouseWheelDown': [{ type: core_1.Output },],
        'onMouseWheelChrome': [{ type: core_1.HostListener, args: ['mousewheel', ['$event'],] },],
        'onMouseWheelFirefox': [{ type: core_1.HostListener, args: ['DOMMouseScroll', ['$event'],] },],
        'onMouseWheelIE': [{ type: core_1.HostListener, args: ['onmousewheel', ['$event'],] },],
    };
    return MouseWheelDirective;
}());
exports.MouseWheelDirective = MouseWheelDirective;
//# sourceMappingURL=mouse-wheel.directive.js.map