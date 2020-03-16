## Integral Swaps

This repo contains examples of two SPV-based cross-chain trades, as well as
some helpful Python utilites for interacting with them. **This is
unaudited code** and we have not provided usage instructions. This code is
presented without license. It is a complex cryptoeconomic system. If you're
interested in using or deploying this code, please reach out to us directly via
[our website](https://summa.one).

**Stateless Swaps** use
[Stateless SPV](https://medium.com/summa-technology/summa-auction-bitcoin-technical-7344096498f2)
to establish Bitcoin payments.

**Callback Swaps** use a full Bitcoin Relay with
[SPV proof callbacks](https://github.com/summa-tx/relays/blob/master/solidity/contracts/OnDemandSPV.sol).
These are the preferred method.

Each have been abstracted to work with multiple asset types, including
`NoFun`, a wrapper intended to manage the complexities of revocable
centrally managed tokens.

### Building and testing contracts
```
npm i
truffle compile
truffle test
```

### Linting

```
npm run lint
```

### Python Setup

- Install `pyenv`: [link](https://https://github.com/pyenv/pyenv-installer)
- Install `pipenv`:
[link](https://pipenv-fork.readthedocs.io/en/latest/install.html#installing-pipenv)

Then run: the following to set up the virtual environment:
```
$ pyenv install 3.7.0
$ pipenv install
```

Then interact with the scripts via interpreter

```
$ pipenv run ipython
```
