/**
 * Custom Metro transformer — patch import.meta.env -> process.env
 * Necessite car zustand utilise import.meta.env,
 * invalide dans les scripts classiques generes par Metro/Expo web.
 */
const upstreamTransformer = require('metro-babel-transformer');

module.exports = {
  transform(opts) {
    if (opts.src && opts.src.includes('import.meta')) {
      opts = {
        ...opts,
        src: opts.src.replace(/import\.meta\.env/g, 'process.env'),
      };
    }
    return upstreamTransformer.transform(opts);
  },
};
