"use strict";
var core_1 = require('@angular/core');
var directed_graph_component_1 = require('./directed-graph.component');
exports.DirectedGraphComponent = directed_graph_component_1.DirectedGraphComponent;
var ngx_charts_1 = require('@swimlane/ngx-charts');
var mouse_wheel_directive_1 = require('./mouse-wheel.directive');
var DirectedGraphModule = (function () {
    function DirectedGraphModule() {
    }
    DirectedGraphModule.decorators = [
        { type: core_1.NgModule, args: [{
                    imports: [ngx_charts_1.ChartCommonModule],
                    declarations: [
                        directed_graph_component_1.DirectedGraphComponent,
                        mouse_wheel_directive_1.MouseWheelDirective
                    ],
                    exports: [
                        directed_graph_component_1.DirectedGraphComponent,
                        mouse_wheel_directive_1.MouseWheelDirective
                    ]
                },] },
    ];
    /** @nocollapse */
    DirectedGraphModule.ctorParameters = function () { return []; };
    return DirectedGraphModule;
}());
exports.DirectedGraphModule = DirectedGraphModule;
//# sourceMappingURL=directed-graph.module.js.map