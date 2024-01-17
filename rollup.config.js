import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';

export default {
  input: 'src/main.js', // 你的入口文件
  output: {
    file: 'bundle.js', // 输出的文件
    format: 'cjs', // 输出格式，这里使用 CommonJS，你也可以选择其他格式，如 'esm'（ES模块）
  },
  plugins: [
    resolve(), // 用于加载 node_modules 中的模块
    commonjs(), // 将 CommonJS 模块转换为 ES6，以便 Rollup 可以处理
    babel({ 
      babelHelpers: 'bundled',
      presets: ['@babel/preset-env'] // 使用最新的 JavaScript 语法
    })
  ]
};
