const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

const transientNodeModulesPatterns = [
  /[/\\]node_modules[/\\]\.fs-extra-[^/\\]+([/\\].*)?$/,
];

const currentBlockList = config.resolver?.blockList;
const blockListPatterns = Array.isArray(currentBlockList)
  ? [...currentBlockList, ...transientNodeModulesPatterns]
  : currentBlockList
    ? [currentBlockList, ...transientNodeModulesPatterns]
    : transientNodeModulesPatterns;

config.resolver = {
  ...config.resolver,
  blockList: blockListPatterns,
};

module.exports = config;
