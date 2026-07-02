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
        // 配置表: 复制到 dist/config (供 loadStore 用 fetch 读取)
        {
          from: "../../data/client/config/",
          to: "dist/config/"
        }
      ],
      options: {}
    },
    framework: "react",
    compiler: "webpack5",
    cache: {
      enable: false
    },
    // 禁用 prebundle (与 webpack 5.78 的 virtual-modules 不兼容)
    prebundle: { enable: false },
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
      }
    },
    rn: { appName: "taroDemo", postcss: { cssModules: { enable: false } } }
  };
  return merge({}, base, process.env.NODE_ENV === "development" ? devConfig : prodConfig);
});
