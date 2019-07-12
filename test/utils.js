const assert = require('assert');
const createHash = require('create-hash')
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());


// eslint-disable-next-line camelcase
async function deploySystem(deploy_list) {
  const deployed = {}; // name: contract object
  const linkable = {}; // name: linkable address

  // eslint-disable-next-line camelcase,guard-for-in
  for (const i in deploy_list) {
    let args = deploy_list[i].args;
    if (!args) {
      args = [];
    }
    await deploy_list[i].contract.link(linkable);
    const contract = await deploy_list[i].contract.new( ...args );
    linkable[deploy_list[i].name] = contract.address;
    deployed[deploy_list[i].name] = contract;
  }
  return deployed;
}

module.exports = {
    deploySystem: deploySystem,

    latestTime: latestTime = async () => {
        let blockNumber = await web3.eth.getBlock('latest');
        return blockNumber.timestamp;
    },
 
    getPreimageAndHash: function* getPreimageAndHash() {
        var buff = Buffer(32)
            for (var j=31; j>=0; j--) {
                for (var i=1; i<256; i++) {
                    hexString = buff.toString('hex')
                        digest = this.sha256(hexString)
                            hexString = '0x' + hexString
                                buff[j] = i
                                    yield [hexString, digest]
                }
            }
    },

    hash160: function hash160 (hexString) {
        let buffer = Buffer.from(hexString, 'hex')
            var t = createHash('sha256').update(buffer).digest()
                var u = createHash('rmd160').update(t).digest()
                    return '0x' + u.toString('hex')
    },

    sha256: function sha256 (hexString) {
        let buffer = Buffer.from(hexString, 'hex')
            var t = createHash('sha256').update(buffer).digest()
                return '0x' + t.toString('hex')
    },

    duration: {
        seconds: function(val) { return val},
        minutes: function(val) { return val * this.seconds(60) },
        hours:   function(val) { return val * this.minutes(60) },
        days:    function(val) { return val * this.hours(24) },
        weeks:   function(val) { return val * this.days(7) },
        years:   function(val) { return val * this.days(365)}
    }
}


// The MIT License (MIT)
//
// Copyright (c) 2016 Smart Contract Solutions, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
// IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
// CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
// TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
