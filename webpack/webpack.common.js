const HtmlWebpackPlugin = require('html-webpack-plugin');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const path = require('path');
const Dotenv = require('dotenv-webpack');

const config = {
  entry: {
    main: './src/main.ts',
  },
  output: {
    clean: true,
    publicPath: '/',
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@core':           path.resolve(__dirname, '../packages/core/src'),
      '@text-editor':    path.resolve(__dirname, '../packages/text-editor/src'),
      '@graphic-editor': path.resolve(__dirname, '../packages/graphic-editor/src'),
      '@ui':             path.resolve(__dirname, '../packages/ui/src'),
    },
  },
  module: {
    rules: [
      { test: /\.html$/, resourceQuery: /raw/, type: 'asset/source' },
      { test: /\.html$/, resourceQuery: { not: [/raw/] }, use: ['html-loader'] },
      { test: /\.ts$/, use: 'ts-loader', exclude: /node_modules/ },
      {
        test: /\.scss$/,
        resourceQuery: /inline/,
        use: [
          'to-string-loader',
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              additionalData: `@use "${path.resolve(__dirname, '../src/styles/variables').replace(/\\/g, '/')}" as *;`,
            },
          },
        ],
      },
      {
        test: /\.scss$/,
        resourceQuery: { not: [/inline/] },
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              additionalData: (content, loaderContext) => {
                if (loaderContext.resourcePath.endsWith('_base.scss')) {
                  const variablesPath = path.resolve(__dirname, '../src/styles/variables').replace(/\\/g, '/');
                  return `@use "${variablesPath}" as *;\n${content}`;
                }
                return content;
              },
            },
          },
        ],
      },
      { test: /\.(woff|woff2|eot|ttf|otf)$/i, type: 'asset/resource' },
      { test: /\.catalog\.json$/, type: 'json' },
    ],
  },
  plugins: [
    new Dotenv({ silent: true }),
    new CopyPlugin({
      patterns: [
        { from: 'src/locales', to: 'locales/[name][ext]', noErrorOnMissing: true },
        { from: 'packages/graphic-editor/src/catalog', to: 'catalog/[name][ext]', noErrorOnMissing: true },
      ],
    }),
    new FaviconsWebpackPlugin({
      logo: './src/assets/images/logo.svg',
      mode: 'webapp',
      devMode: 'webapp',
      favicons: {
        appName: 'IdeaEditor',
        background: '#ffffff',
        theme_color: '#000000',
        icons: {
          android: false, appleIcon: false, appleStartup: false,
          windows: false, coast: false, yandex: false,
        },
      },
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      chunks: ['main'],
      template: 'src/index.html',
    }),
  ],
};

module.exports = config;
