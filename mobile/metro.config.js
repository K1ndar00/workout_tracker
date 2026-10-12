// Metro config: lets the app import code from ../shared (types, sync engine and the data hook used by the
// web app too). Files in ../shared must not pick up the web app's React (../node_modules), or the app would
// bundle two copies of React, so bare imports from there are resolved as if they came from this project.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const sharedDir = path.resolve(projectRoot, '../shared');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [sharedDir];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const fromShared = context.originModulePath.startsWith(sharedDir + path.sep);
  const isBare = !moduleName.startsWith('.') && !path.isAbsolute(moduleName);
  if (fromShared && isBare) {
    return context.resolveRequest(
      { ...context, originModulePath: path.join(projectRoot, 'index.ts') },
      moduleName,
      platform
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
