(() => {
  'use strict';

  const config=Object.freeze({
    publisherId:'pub-7605193583747751',
    clientId:'ca-pub-7605193583747751',
    site:'https://savingio.com/',
    adsTxtLine:'google.com, pub-7605193583747751, DIRECT, f08c47fec0942fa0'
  });

  if(window.SavingioV2AdSenseConfig)throw new Error('AdSense Config already exists');
  Object.defineProperty(window,'SavingioV2AdSenseConfig',{value:config,writable:false,configurable:false,enumerable:true});
})();
