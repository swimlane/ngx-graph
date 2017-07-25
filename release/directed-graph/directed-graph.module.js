import { NgModule } from '@angular/core';
import { DirectedGraphComponent } from './directed-graph.component';
import { ChartCommonModule } from '@swimlane/ngx-charts';
import { MouseWheelDirective } from './mouse-wheel.directive';
export { DirectedGraphComponent };
var DirectedGraphModule = (function () {
    function DirectedGraphModule() {
    }
    DirectedGraphModule.decorators = [
        { type: NgModule, args: [{
                    imports: [ChartCommonModule],
                    declarations: [
                        DirectedGraphComponent,
                        MouseWheelDirective
                    ],
                    exports: [
                        DirectedGraphComponent,
                        MouseWheelDirective
                    ]
                },] },
    ];
    /** @nocollapse */
    DirectedGraphModule.ctorParameters = function () { return []; };
    return DirectedGraphModule;
}());
export { DirectedGraphModule };
//# sourceMappingURL=directed-graph.module.js.map