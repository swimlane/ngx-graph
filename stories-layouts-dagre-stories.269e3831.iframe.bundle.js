"use strict";(self.webpackChunkngx_graph=self.webpackChunkngx_graph||[]).push([[116],{"./projects/swimlane/ngx-graph/src/stories/layouts/dagre.stories.ts":function(__unused_webpack_module,__webpack_exports__,__webpack_require__){__webpack_require__.r(__webpack_exports__),__webpack_require__.d(__webpack_exports__,{Dagre:function(){return Dagre},__namedExportsOrder:function(){return __namedExportsOrder},default:function(){return dagre_stories}});var tslib_es6=__webpack_require__("../../../.yarn/berry/cache/tslib-npm-2.8.1-66590b21b8-10c0.zip/node_modules/tslib/tslib.es6.mjs"),core=__webpack_require__("./.yarn/__virtual__/@angular-core-virtual-5f15f2f29b/4/.yarn/berry/cache/@angular-core-npm-18.1.5-6979b83659-10c0.zip/node_modules/@angular/core/fesm2022/core.mjs"),public_api=__webpack_require__("./projects/swimlane/ngx-graph/src/public_api.ts");let DagreLayoutComponent=class DagreLayoutComponent{};DagreLayoutComponent=(0,tslib_es6.Cg)([(0,core.Component)({selector:"dagre-layout",standalone:!0,imports:[public_api.ut],template:"\n    <ngx-graph\n      [view]=\"[500, 300]\"\n      layout=\"dagre\"\n      [links]=\"[\n        {\n          id: 'a',\n          source: '1',\n          target: '2'\n        },\n        {\n          id: 'b',\n          source: '1',\n          target: '3'\n        },\n        {\n          id: 'c',\n          source: '3',\n          target: '4'\n        },\n        {\n          id: 'd',\n          source: '3',\n          target: '5'\n        },\n        {\n          id: 'e',\n          source: '4',\n          target: '5'\n        },\n        {\n          id: 'f',\n          source: '2',\n          target: '6'\n        }\n      ]\"\n      [nodes]=\"[\n        {\n          id: '1',\n          label: 'Node A'\n        },\n        {\n          id: '2',\n          label: 'Node B'\n        },\n        {\n          id: '3',\n          label: 'Node C'\n        },\n        {\n          id: '4',\n          label: 'Node D'\n        },\n        {\n          id: '5',\n          label: 'Node E'\n        },\n        {\n          id: '6',\n          label: 'Node F'\n        }\n      ]\"\n    ></ngx-graph>\n  "})],DagreLayoutComponent);var dagre_stories={title:"Dagre",component:DagreLayoutComponent,parameters:{layout:"fullscreen"}};const Dagre={parameters:{docs:{source:{code:"\n      <div>\n<ngx-graph\n        [view]=\"[500, 300]\"\n        layout=\"dagre\"\n        [links]=\"[\n          {\n            id: 'a',\n            source: '1',\n            target: '2'\n          }, {\n            id: 'b',\n            source: '1',\n            target: '3'\n          }, {\n            id: 'c',\n            source: '3',\n            target: '4'\n          }, {\n            id: 'd',\n            source: '3',\n            target: '5'\n          }, {\n            id: 'e',\n            source: '4',\n            target: '5'\n          }, {\n            id: 'f',\n            source: '2',\n            target: '6'\n          }\n        ]\"\n        [nodes]=\"[\n          {\n            id: '1',\n            label: 'Node A'\n          }, {\n            id: '2',\n            label: 'Node B'\n          }, {\n            id: '3',\n            label: 'Node C'\n          }, {\n            id: '4',\n            label: 'Node D'\n          }, {\n            id: '5',\n            label: 'Node E'\n          }, {\n            id: '6',\n            label: 'Node F'\n          }\n        ]\"\n      ></ngx-graph>\n      </div>\n       "},language:"html",type:"auto"}},tags:["!dev"]},__namedExportsOrder=["Dagre"];Dagre.parameters={...Dagre.parameters,docs:{...Dagre.parameters?.docs,source:{originalSource:"{}",...Dagre.parameters?.docs?.source}}}}}]);