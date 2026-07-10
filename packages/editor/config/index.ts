import { defineConfig } from "@tarojs/cli";
import devConfig from "./dev";
import prodConfig from "./prod";

// https://taro-docs.jd.com/docs/next/config#defineconfig-辅助函数
export default defineConfig(async (merge) => {
  const base = {
    projectName: "lagrange-editor",
    date: "2026-7-2",
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      828: 1.81 / 2
    },
    sourceRoot: "src",
    outputRoot: "dist",
    plugins: [],
    defineConstants: {},
    copy: {
      patterns: [
        // 图标资源: 把 data/client/icons 复制到 dist/icons (H5可直接访问)
        {
          from: "../../data/client/icons/",
          to: "dist/icons/",
          ignore: ["*.json", "_*.py"]
        },
        // manifest.json 单独复制 (供 loadIconManifest 读取)
        {
          from: "../../data/client/icons/manifest.json",
          to: "dist/icons/manifest.json"
        },
        // ship_thumb_map.json 单独复制 (icons/ 的 *.json 被 ignore 排除)
        {
          from: "../../data/client/icons/ship_thumb_map.json",
          to: "dist/icons/ship_thumb_map.json"
        },
        // company_map.json 单独复制 (shipId → 公司徽章映射)
        {
          from: "../../data/client/icons/company_map.json",
          to: "dist/icons/company_map.json"
        },
        // 配置表: 复制到 dist/config (供 loadStore 用 fetch 读取)
        {
          from: "../../data/client/config/",
          to: "dist/config/"
        }
      ],
      options: {}
    },
    framework: "react",
    // prebundle 必须挂在 compiler 对象上才会被 getPrebundleOptions 读取。
    // 顶层 prebundle 字段不被 Taro 读取 (webpack5-runner/Combination.js: getPrebundleOptions)。
    // prebundle 与 webpack 5.78 的 webpack-virtual-modules@0.5.0 不兼容
    // (virtual-modules 调用 _writeVirtualFile，该方法在 5.78 的 InputFileSystem 上不存在)。
    compiler: {
      type: "webpack5",
      prebundle: { enable: false }
    },
    cache: {
      enable: false
    },
    mini: {
      postcss: {
        pxtransform: { enable: true, config: {} },
        cssModules: {
          enable: false,
          config: {
            namingPattern: "module",
            generateScopedName: "[name]__[local]___[hash:base64:5]"
          }
        }
      }
    },
    h5: {
      publicPath: "/",
      staticDirectory: "static",
      output: { filename: "js/[name].[hash:8].js", chunkFilename: "js/[name].[chunkhash:8].js" },
      miniCssExtractPluginOption: {
        ignoreOrder: true,
        filename: "css/[name].[hash].css",
        chunkFilename: "css/[name].[chunkhash].css"
      },
      postcss: {
        autoprefixer: { enable: true, config: {} },
        cssModules: {
          enable: false,
          config: {
            namingPattern: "module",
            generateScopedName: "[name]__[local]___[hash:base64:5]"
          }
        }
      },
      // engine 数据层 (editor/src/engine/data) 用 TS ESM 风格导入 './xxx.js'，
      // 但实际文件是 .ts。tsc/moduleResolution:Bundler 能解析，webpack 5.78 默认不能。
      // extensionAlias 让 './xxx.js' 解析到 './xxx.ts'，保持 engine/editor 两份数据层一致。
      webpackChain(chain) {
        chain.resolve.merge({
          extensionAlias: {
            ".js": [".ts", ".js"],
            ".jsx": [".tsx", ".jsx"]
          }
        });
      }
    },
    rn: { appName: "taroDemo", postcss: { cssModules: { enable: false } } }
  };
  return merge({}, base, process.env.NODE_ENV === "development" ? devConfig : prodConfig);
});
