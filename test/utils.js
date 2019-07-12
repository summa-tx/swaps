// eslint-disable-next-line camelcase
async function deploySystem(deployList) {
  const deployed = {}; // name: contract object
  const linkable = {}; // name: linkable address

  for (let i = 0; i < deployList.length; i += 1) {
    let { args } = deployList[i];
    if (!args) {
      args = [];
    }

    // eslint-disable-next-line no-await-in-loop
    await deployList[i].contract.link(linkable);

    // eslint-disable-next-line no-await-in-loop
    const contract = await deployList[i].contract.new(...args);
    linkable[deployList[i].name] = contract.address;
    deployed[deployList[i].name] = contract;
  }
  return deployed;
}

module.exports = {
  deploySystem
};


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
