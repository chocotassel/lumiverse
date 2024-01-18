import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import typescript from '@rollup/plugin-typescript';
import server from 'rollup-plugin-server';

export default function(commmandLineArgs) {
  const ret = {
    input: 'test/index.ts', // 你的入口文件
    output: {
      file: 'test/dist/bundle.js', // 输出的文件
      format: 'esm', // 输出格式，这里使用 CommonJS，你也可以选择其他格式，如 'esm'（ES模块）
      sourcemap: true
    },
    plugins: [
      resolve(), // 用于加载 node_modules 中的模块
      commonjs(), // 将 CommonJS 模块转换为 ES6，以便 Rollup 可以处理
      babel({ 
        babelHelpers: 'bundled',
        presets: ['@babel/preset-env'] // 使用最新的 JavaScript 语法
      }),
      typescript(),
      server({
        open: true,
        port: 3000,
        host: 'localhost',
        contentBase: 'test'
      })
    ],
    watch: {
      include: ['test/**', 'src/**']
    },
    sourcemap: true
  }

  console.log('server start at:http://localhost:3000/');

  return ret;
}
