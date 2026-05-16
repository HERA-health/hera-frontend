const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/private/defaults/exclusionList');

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
  blockList: exclusionList(blockListPatterns),
};

module.exports = config;
