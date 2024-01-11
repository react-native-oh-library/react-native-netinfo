/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

module.exports = {
  extends: [
    // '@react-native', // FIXME: 'Environment key "jest/globals" is unknown'
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      // Apply the recommended Typescript defaults and the prettier overrides to all Typescript files
      rules: {
        '@typescript-eslint/explicit-member-accessibility': 'off',
      },
    }
  ],
};
