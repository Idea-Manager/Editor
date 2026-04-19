const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

const config = merge(common, {
  mode: 'production',
  devtool: 'source-map',
  output: {
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].chunk.js',
  },
});

if (process.env.ANALYZE) {
  config.plugins.push(new BundleAnalyzerPlugin());
}

module.exports = config;
