const path = require('path');
const webpack = require('webpack');
const BundleTracker = require('webpack-bundle-tracker');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  context: __dirname,

  // Each page gets its own bundle
  entry: {
    style: './assets/css/style.scss',
    lessons: './assets/js/pages/lessons.page',
    login: './assets/js/pages/login',
    workflows: './assets/js/pages/workflows.page',
    workflow: './assets/js/pages/workflow.page',
    embed: './assets/js/pages/embed.page'
  },

  watchOptions: {
    ignored: /node_modules/,
  },

  output: {
    path: path.resolve('./assets/bundles/'),
    filename: '[name]-[contenthash].js',
  },

  devtool: 'source-map',

  plugins: [
    new BundleTracker({filename: './webpack-stats.json'}),
    new MiniCssExtractPlugin({
      filename: "[name]-[contenthash].css",
    }),
  ],

  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: 'babel-loader', // config is in package.json
        options: {
          cacheDirectory: true,
        },
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
        ],
      },
      {
        test: /\.scss$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'sass-loader',
        ],
      },
      {
        // static files
        test: /\.(png|jpg|gif|woff|woff2)$/,
        loader: 'url-loader',
        options: {
          limit: 40000,
          name: '[name]-[contenthash].[ext]',
        },
      },
    ]
  },

  resolve: {
    modules: ['node_modules'],
    extensions: ['.js', '.jsx']
  },
}
