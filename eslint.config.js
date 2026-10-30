import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

/**
 * GĐ1: ESLint flat config. Hai quy tắc react-hooks là bài học từ 2 sự
 * cố màn hình đen (2026-10-27): hook import thiếu (rules-of-hooks chặn
 * loại bug khác cùng lớp) và deps sai (exhaustive-deps). assets.js là
 * một dòng base64 ~288KB — bỏ qua để lint không đọc cả khối đó.
 */
export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'src/data/assets.js'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 2022,
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]
