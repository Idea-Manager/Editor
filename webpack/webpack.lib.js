const path = require('path');
const webpack = require('webpack');

const variablesPath = path.resolve(__dirname, '../src/styles/variables').replace(/\\/g, '/');

const sharedResolve = {
  extensions: ['.ts', '.js'],
  alias: {
    '@core': path.resolve(__dirname, '../packages/core/src'),
    '@text-editor': path.resolve(__dirname, '../packages/text-editor/src'),
    '@graphic-editor': path.resolve(__dirname, '../packages/graphic-editor/src'),
    '@ui': path.resolve(__dirname, '../packages/ui/src'),
    '@shared': path.resolve(__dirname, '../shared'),
  },
};

const sharedModule = {
  rules: [
    { test: /\.html$/, resourceQuery: /raw/, type: 'asset/source' },
    {
      test: /\.ts$/,
      use: {
        loader: 'ts-loader',
        options: {
          compilerOptions: {
            declaration: false,
            declarationMap: false,
          },
        },
      },
      exclude: /node_modules/,
    },
    {
      test: /\.scss$/,
      resourceQuery: /inline/,
      use: [
        'to-string-loader',
        'css-loader',
        {
          loader: 'sass-loader',
          options: {
            additionalData: `@use "${variablesPath}" as *;`,
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
};

function createLibConfig({ filename, library }) {
  return {
    entry: './src/sdk/index.ts',
    output: {
      path: path.resolve(__dirname, '../dist'),
      filename,
      clean: false,
      library,
      globalObject: 'this',
    },
    resolve: sharedResolve,
    module: sharedModule,
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
    ],
    mode: 'production',
    devtool: 'source-map',
    optimization: {
      minimize: true,
    },
  };
}

module.exports = [
  {
    ...createLibConfig({
      filename: 'idea-editor.esm.js',
      library: { type: 'module' },
    }),
    output: {
      ...createLibConfig({
        filename: 'idea-editor.esm.js',
        library: { type: 'module' },
      }).output,
      clean: true,
    },
    experiments: { outputModule: true },
  },
  {
    ...createLibConfig({
      filename: 'idea-editor.umd.cjs',
      library: { name: 'IdeaEditor', type: 'umd', export: 'default' },
    }),
    experiments: { outputModule: false },
  },
];
