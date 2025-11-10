const webpack = require('webpack');

module.exports = {
  resolve: {
    fallback: {
      fs: false,
      path: false
    }
  },
  experiments: {
    asyncWebAssembly: true
  },
  module: {
    rules: [
      {
        test: /\.wasm$/,
        type: 'asset/resource'
      }
    ]
  }
};
