"use strict";
var core_1 = require('@angular/core');
var directed_graph_module_1 = require('./directed-graph/directed-graph.module');
var NgxChartsDagModule = (function () {
    function NgxChartsDagModule() {
    }
    NgxChartsDagModule.decorators = [
        { type: core_1.NgModule, args: [{
                    exports: [
                        directed_graph_module_1.DirectedGraphModule
                    ]
                },] },
    ];
    /** @nocollapse */
    NgxChartsDagModule.ctorParameters = function () { return []; };
    return NgxChartsDagModule;
}());
exports.NgxChartsDagModule = NgxChartsDagModule;
//# sourceMappingURL=ngx-charts-dag.module.js.map