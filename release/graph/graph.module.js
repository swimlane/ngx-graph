import { NgModule } from '@angular/core';
import { GraphComponent } from './graph.component';
import { ChartCommonModule } from '@swimlane/ngx-charts';
import { MouseWheelDirective } from './mouse-wheel.directive';
export { GraphComponent };
var GraphModule = (function () {
    function GraphModule() {
    }
    GraphModule.decorators = [
        { type: NgModule, args: [{
                    imports: [ChartCommonModule],
                    declarations: [
                        GraphComponent,
                        MouseWheelDirective
                    ],
                    exports: [
                        GraphComponent,
                        MouseWheelDirective
                    ]
                },] },
    ];
    /** @nocollapse */
    GraphModule.ctorParameters = function () { return []; };
    return GraphModule;
}());
export { GraphModule };
//# sourceMappingURL=graph.module.js.map