const regex = /^test\/(.*)\.(ts|js)/u;
module.exports = (testFile) => testFile.replace(regex, 'build/$1.js');
