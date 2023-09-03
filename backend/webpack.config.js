const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const CircularDependencyPlugin = require('circular-dependency-plugin');

module.exports = {
  entry: './ts/index.ts',
  devtool: 'inline-source-map',
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
    fallback:{
      fs:false,
    },
  },
  node: {
    __dirname: false,
    // fs:'empty'
  },
  plugins: [
    new CircularDependencyPlugin({
      // exclude detection of files based on a RegExp
      exclude: /a\.js|node_modules/,
      // add errors to webpack instead of warnings
      failOnError: false,
      // allow import cycles that include an asyncronous import,
      // e.g. via import(/* webpackMode: "weak" */ './file.js')
      allowAsyncCycles: false,
      // set the current working directory for displaying module paths
      cwd: process.cwd(),
    })
  ],
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
      terserOptions: {
       output: {
          ascii_only: true
        }
      }
    })]
  },
  mode: 'production',
  output: {
    filename: 'pdf2charinfo.js',
    library: 'pdf2charinfo',
    libraryTarget: 'umd',
    globalObject: 'this',
    path: path.resolve(__dirname, 'dist')
  },
};

