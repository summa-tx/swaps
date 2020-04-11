/* global artifacts */

const nets = require('./networkInfo');

const callbacks = [
  'CallbackSwapEth',
  'CallbackSwap20',
  'CallbackSwap721',
].map(s => artifacts.require(s));

function sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

module.exports = async (deployer, network) => {
  if (['test', 'development', 'coverage'].includes(network)) {
    // never run deployments on development. We deploy in tests
    return;
  }

  // dry runs are postfixed with '-fork'
  const strippedNetwork = network.split('-')[0];
  const deployInfo = nets[strippedNetwork];
  const { developer, relay } = deployInfo;

  /* eslint-disable */
  console.log('');
  console.log(`developer is ${developer}`);
  console.log(`relay is ${relay}`);
  console.log('Press Ctrl+C to cancel');
  console.log('');
  await sleep(7500);

  for (let i = 0; i < callbacks.length; i += 1) {
    await deployer.deploy(callbacks[i], developer, relay);
  }

  callbacks.forEach(c => console.log(`${c.contractName} deployed at ${c.address}`));
};
