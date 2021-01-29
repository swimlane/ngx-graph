npm run build:lib && \
rm -rf $1/node_modules/@swimlane/ngx-graph && \
cp -r ./projects/dist/ngx-graph $1/node_modules/@swimlane/ngx-graph
