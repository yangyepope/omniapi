import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import zhCN from "./locales/zh-CN/translation.json";
import enUS from "./locales/en-US/translation.json";

const resources = {
  "zh-CN": {
    translation: zhCN,
  },
  "en-US": {
    translation: enUS,
  },
};

i18n
  .use(initReactI18next) // 将 i18n 实例传递给 react-i18next
  .init({
    resources,
    lng: "zh-CN", // 默认语言
    fallbackLng: "en-US", // 降级语言
    interpolation: {
      escapeValue: false, // react 已经默认防 XSS 注入了
    },
  });

export default i18n;
