/* eslint-disable */

exports.ADDR0 = '0x0000000000000000000000000000000000000000';

exports.GOOD = { // This is a real on-chain tx and real headers
  PARTIAL_TX: '0x010000000001011746bd867400f3494b8f44c24b83e1aa58c4f0ff25b4a61cffeffd4bc0f9ba300000000000ffffffff',
  OP_RETURN_TX: '0x010000000001011746bd867400f3494b8f44c24b83e1aa58c4f0ff25b4a61cffeffd4bc0f9ba300000000000ffffffff024897070000000000220020a4333e5612ab1a1043b25755c89b16d55184a42f81799e623e6bc39db8539c180000000000000000166a14edb1b5c2f39af0fec151732585b1049b07895211024730440220276e0ec78028582054d86614c65bc4bf85ff5710b9d3a248ca28dd311eb2fa6802202ec950dd2a8c9435ff2d400cc45d7a4854ae085f49e05cc3f503834546d410de012103732783eef3af7e04d3af444430a629b16a9261e4025f52bf4d6d026299c37c7400000000',
  TX_ID: 'd60033c5cf5c199208a9c656a29967810c4e428c22efb492fdd816e6a0a1e548',
  HEADER_CHAIN: '0x0000002073bd2184edd9c4fc76642ea6754ee40136970efc10c4190000000000000000000296ef123ea96da5cf695f22bf7d94be87d49db1ad7ac371ac43c4da4161c8c216349c5ba11928170d38782b00000020fe70e48339d6b17fbbf1340d245338f57336e97767cc240000000000000000005af53b865c27c6e9b5e5db4c3ea8e024f8329178a79ddb39f7727ea2fe6e6825d1349c5ba1192817e2d9515900000020baaea6746f4c16ccb7cd961655b636d39b5fe1519b8f15000000000000000000c63a8848a448a43c9e4402bd893f701cd11856e14cbbe026699e8fdc445b35a8d93c9c5ba1192817b945dc6c00000020f402c0b551b944665332466753f1eebb846a64ef24c71700000000000000000033fc68e070964e908d961cd11033896fa6c9b8b76f64a2db7ea928afa7e304257d3f9c5ba11928176164145d0000ff3f63d40efa46403afd71a254b54f2b495b7b0164991c2d22000000000000000000f046dc1b71560b7d0786cfbdb25ae320bd9644c98d5c7c77bf9df05cbe96212758419c5ba1192817a2bb2caa00000020e2d4f0edd5edd80bdcb880535443747c6b22b48fb6200d0000000000000000001d3799aa3eb8d18916f46bf2cf807cb89a9b1b4c56c3f2693711bf1064d9a32435429c5ba1192817752e49ae0000002022dba41dff28b337ee3463bf1ab1acf0e57443e0f7ab1d000000000000000000c3aadcc8def003ecbd1ba514592a18baddddcd3a287ccf74f584b04c5c10044e97479c5ba1192817c341f595',
  PROOF_INDEX: 282,
  PROOF: '0x48e5a1a0e616d8fd92b4ef228c424e0c816799a256c6a90892195ccfc53300d6e35a0d6de94b656694589964a252957e4673a9fb1d2f8b4a92e3f0a7bb654fddb94e5a1e6d7f7f499fd1be5dd30a73bf5584bf137da5fdd77cc21aeb95b9e35788894be019284bd4fbed6dd6118ac2cb6d26bc4be4e423f55a3a48f2874d8d02a65d9c87d07de21d4dfe7b0a9f4a23cc9a58373e9e6931fefdb5afade5df54c91104048df1ee999240617984e18b6f931e2373673d0195b8c6987d7ff7650d5ce53bcec46e13ab4f2da1146a7fc621ee672f62bc22742486392d75e55e67b09960c3386a0b49e75f1723d6ab28ac9a2028a0c72866e2111d79d4817b88e17c821937847768d92837bae3832bb8e5a4ab4434b97e00a6c10182f211f592409068d6f5652400d9a3d1cc150a7fb692e874cc42d76bdafc842f2fe0f835a7c24d2d60c109b187d64571efbaa8047be85821f8e67e0e85f2f5894bc63d00c2ed9d640296ef123ea96da5cf695f22bf7d94be87d49db1ad7ac371ac43c4da4161c8c2',
  BIDDER: '0xedb1b5c2f39af0fec151732585b1049b07895211',
};

exports.OP_RETURN_WRONG = {
  // Barney
  // unsigned_wit_tx with op_return in wrong position
  REQ_DIFF: 0,
  PARTIAL_TX: '0x010000000001029746474a9f9dc19f567ae0462fe7f03e18444ff08a544f1501743b81f49a8c9d0000000000feffffffae84f5d593339f710b25b561dd1a20d2fcfbbcdbc879cf4b9cfb6b191cf99e8b0000000000',
  OP_RETURN_TX: '0x010000000001029746474a9f9dc19f567ae0462fe7f03e18444ff08a544f1501743b81f49a8c9d0000000000feffffffae84f5d593339f710b25b561dd1a20d2fcfbbcdbc879cf4b9cfb6b191cf99e8b0000000000feffffff030000000000000000166a1423d81b160cb51f763e7bf9b373a34f5ddb75fcbbe8cd9a3b000000001600147849e6bf5e4b1ba7235572d1b0cbc094f0213e6c7b000000000000001600140bd9d9f93c30beb1ee38820f6d91d89831cafa3a000000000000',
  TX_ID: 'c20823f9a119b7747d973f009e9e5893b4fd5cc8d5511aec27b4c6ecb96d2b4a',
  HEADER_CHAIN: '0xbbbbbbbb7777777777777777777777777777777777777777777777777777777777777777c20823f9a119b7747d973f009e9e5893b4fd5cc8d5511aec27b4c6ecb96d2b4accccccccffff001f87240000bbbbbbbbf3c2f5dcb6427a3311fa05827d42b068d0dfa00daa23302a56090c7022a300008888888888888888888888888888888888888888888888888888888888888888ccccccccffff001fae5e0000bbbbbbbbee496b970cc0130866075d6c2f057a7b36b5a1d3798a31b0e1a60520bd9d00008888888888888888888888888888888888888888888888888888888888888888ccccccccffff001f348e0000',
  PROOF_INDEX: 0,
  PROOF: '0x4a2b6db9ecc6b427ec1a51d5c85cfdb493589e9e003f977d74b719a1f92308c2',
  // BIDDER:  // it's broken
};

exports.WORK_TOO_LOW = {
  PARTIAL_TX: '0x010000000001012746bd867400f3494b8f44c24b83e1aa58c4f0ff25b4a61cffeffd4bc0f9ba300000000000ffffffff',
  OP_RETURN_TX: '0x010000000001012746bd867400f3494b8f44c24b83e1aa58c4f0ff25b4a61cffeffd4bc0f9ba300000000000ffffffff024897070000000000220020a4333e5612ab1a1043b25755c89b16d55184a42f81799e623e6bc39db8539c180000000000000000166a14edb1b5c2f39af0fec151732585b1049b07895211024730440220276e0ec78028582054d86614c65bc4bf85ff5710b9d3a248ca28dd311eb2fa6802202ec950dd2a8c9435ff2d400cc45d7a4854ae085f49e05cc3f503834546d410de012103732783eef3af7e04d3af444430a629b16a9261e4025f52bf4d6d026299c37c7400000000',
  TX_ID: '94ef67eb3406ed0ef0caa9984d3e252b79499d8afc93712239100efa804e53ab',
  HEADER_CHAIN: '0xbbbbbbbb7777777777777777777777777777777777777777777777777777777777777777e0e333d0fd648162d344c1a760a319f2184ab2dce1335353f36da2eea155f97fccccccccffff001fe85f0000bbbbbbbbcbee0f1f713bdfca4aa550474f7f252581268935ef8948f18d48ec0a2b4800008888888888888888888888888888888888888888888888888888888888888888ccccccccffff001f01440000bbbbbbbbfe6c72f9b42e11c339a9cbe1185b2e16b74acce90c8316f4a5c8a6c0a10f00008888888888888888888888888888888888888888888888888888888888888888ccccccccffff001f30340000',
  PROOF_INDEX: 0,
  PROOF: '0xab534e80fa0e1039227193fc8a9d49792b253e4d98a9caf00eed0634eb67ef94',
  BIDDER: '0xedb1b5c2f39af0fec151732585b1049b07895211',
};

exports.FEW_OUTPUTS = {
  PARTIAL_TX: '0x010000000001014e35f7fe339956b6c4f8e2d87d0b2df489098d8f9b19325829fd7c5553c43c0b0000000000feffffff01e8cd9a3b000000001600147849e6bf5e4b1ba7235572d1b0cbc094f0213e6c0000000000',
  OP_RETURN_TX: '0x010000000001014e35f7fe339956b6c4f8e2d87d0b2df489098d8f9b19325829fd7c5553c43c0b0000000000feffffff01e8cd9a3b000000001600147849e6bf5e4b1ba7235572d1b0cbc094f0213e6c0000000000',
  TX_ID: 'e926eb39ff0d76ef45df6533631adcc95ff1fbbb5f300755ed34a4450417955a',
  HEADER_CHAIN: '0xbbbbbbbb7777777777777777777777777777777777777777777777777777777777777777e926eb39ff0d76ef45df6533631adcc95ff1fbbb5f300755ed34a4450417955accccccccffff001fd1600000bbbbbbbb392b56e2a182f42d9cec4f6544501f8a069921f08fb5646257b15f753f2900008888888888888888888888888888888888888888888888888888888888888888ccccccccffff001f102c0100bbbbbbbba84ef4b9b8cadf916f5993f334164e04e8fff9e3dc6cf960b42445b5cc0f00008888888888888888888888888888888888888888888888888888888888888888ccccccccffff001fd0840300',
  PROOF_INDEX: 0,
  PROOF: '0x5a95170445a434ed5507305fbbfbf15fc9dc1a633365df45ef760dff39eb26e9',
  BIDDER: '0x7849e6bf5e4b1ba7235572d1b0cbc094f0213e6c',
};

// unsigned_wit_tx, no bidder input (Mr. Wind-Up Bird)
// 01000000000101b024559b3b6b43df1fd4f3f217861f443dd3c3f897453b2b7518564ac41763850000000000feffffff03e8cd9a3b000000001600147849e6bf5e4b1ba7235572d1b0cbc094f0213e6c0000000000000000166a1423d81b160cb51f763e7bf9b373a34f5ddb75fcbb7b00000000000000160014bb4de20c5c49cc739d17f2527d51e8f99c707b130000000000
//
// unsigned_wit_tx, 3 inputs (Owen)
// 010000000001034b7900f26f7c401601f87ea1714b4455ff5f76f409018ec98e0b36e53f2228b20000000000feffffffa0414e265dedd1ad0a661598172ef4b8a1c21f8f0638ab0845be829e118485990000000000feffffff77a2e6ad4f4a169514160671516230650f39e1beb930f1a6e633cbbe58f3736f0000000000feffffff03e8cd9a3b000000001600147849e6bf5e4b1ba7235572d1b0cbc094f0213e6c0000000000000000166a1423d81b160cb51f763e7bf9b373a34f5ddb75fcbb7b0000000000000016001456a7fd481dc74897f63f77ea52b8f07f9e5c18da00000000000000
//
// unsigned_wit_tx, killed change output (Luke)
// 010000000001027ab3b57672332e8e9c62e331d2494bfd0044a1f72932544c31895cd9894dc9160000000000feffffff6d5c177714032f20ef42c2c1fc89b45b1a0ba8f3c72f5d34e0afc1beb8e3282c0000000000feffffff02e8cd9a3b000000001600147849e6bf5e4b1ba7235572d1b0cbc094f0213e6c0000000000000000166a1423d81b160cb51f763e7bf9b373a34f5ddb75fcbb000000000000
// signed_wit_tx, killed change output (Guido)
// 010000000001027ab3b57672332e8e9c62e331d2494bfd0044a1f72932544c31895cd9894dc9160000000000feffffff6d5c177714032f20ef42c2c1fc89b45b1a0ba8f3c72f5d34e0afc1beb8e3282c0000000000feffffff02e8cd9a3b000000001600147849e6bf5e4b1ba7235572d1b0cbc094f0213e6c0000000000000000166a1423d81b160cb51f763e7bf9b373a34f5ddb75fcbb0247304402200f8fa7eda4155d8a4440f731a100e6e8bf411d7d1cc7c3eb6ce96eb35e4342ce02202405ab0dc9e847b8267fcfc62714b40e0dd483efc22945d85d0847acc6c987b7832102a004b949e4769ed341064829137b18992be884da5932c755e48f9465c1069dc2024730440220611e5b9a3948ad19c44b7661c531d8035137c8647483e4e5668a8256fba6b4dd022055ecca2b835392c543b5a6346e14798b0d20c7e6dd26be102e52ed2f4c00240c012102ebc42e14245d561bb79a4839d95aaec3b79b34ad31aafd709e9347f0d8a331eb00000000
//
// unsigned_wit_tx -- killed op_return_output (Emilio)
// 01000000000102d7bf72dd33b69c882a1e09f1658cc2389b06ee943f07b52088b25ca0ee6171960000000000feffffffa01f566b5bc76c6354f685b69addba402a8a911ab588651fe26f32007735b4470000000000feffffff02e8cd9a3b000000001600147849e6bf5e4b1ba7235572d1b0cbc094f0213e6c7b00000000000000160014e4392b75b5feaab1ad8a90e47da6e29aad8a3b62000000000000
// signed_wit_tx -- killed op_return_output (Ted)
// 01000000000102d7bf72dd33b69c882a1e09f1658cc2389b06ee943f07b52088b25ca0ee6171960000000000feffffffa01f566b5bc76c6354f685b69addba402a8a911ab588651fe26f32007735b4470000000000feffffff02e8cd9a3b000000001600147849e6bf5e4b1ba7235572d1b0cbc094f0213e6c7b00000000000000160014e4392b75b5feaab1ad8a90e47da6e29aad8a3b620247304402207e025c40f1569aab243c327dac79b839cff740521435c55a68f3c59a8664baf0022014b5ba1cb2b1f5820a65b4b195af7f7591c85d725b40ce3bfcd9ba8aae82b306832102a004b949e4769ed341064829137b18992be884da5932c755e48f9465c1069dc202483045022100ec137eb1bcf483469e8004b04d82275ebbb87ebeb632475f0da3b6df762a274102206d4d252b9f92e12f127542099e3cfb03e0a04ce7374361544a464b3a03c4b6c6012103cd51750b586f6fb89104b7471a76e63b20659d22280beb19a16689b1bbfcdefd00000000
//
// unsigned_wit_tx with op_return in wrong position (Barney)
// 010000000001029746474a9f9dc19f567ae0462fe7f03e18444ff08a544f1501743b81f49a8c9d0000000000feffffffae84f5d593339f710b25b561dd1a20d2fcfbbcdbc879cf4b9cfb6b191cf99e8b0000000000feffffff030000000000000000166a1423d81b160cb51f763e7bf9b373a34f5ddb75fcbbe8cd9a3b000000001600147849e6bf5e4b1ba7235572d1b0cbc094f0213e6c7b000000000000001600140bd9d9f93c30beb1ee38820f6d91d89831cafa3a000000000000
// signed_wit_tx with op_return in wrong position (Ross)
// 010000000001029746474a9f9dc19f567ae0462fe7f03e18444ff08a544f1501743b81f49a8c9d0000000000feffffffae84f5d593339f710b25b561dd1a20d2fcfbbcdbc879cf4b9cfb6b191cf99e8b0000000000feffffff030000000000000000166a1423d81b160cb51f763e7bf9b373a34f5ddb75fcbbe8cd9a3b000000001600147849e6bf5e4b1ba7235572d1b0cbc094f0213e6c7b000000000000001600140bd9d9f93c30beb1ee38820f6d91d89831cafa3a0247304402202b6ca6baa0c65c54e528dee8bec26ca66432e04c6d925ffe0fa1a4746d610be70220054d67967008e6edd0cbfc43958ac30e061e12dbd948b667b363a83b444bb3b5832102a004b949e4769ed341064829137b18992be884da5932c755e48f9465c1069dc202483045022100bb6742a5159ecdca8a70d259caa11c5c5f7f0cc77b755e25e2487a2f9aeaba13022059ea38f07a0baac7ba74068ac18bffb64b4b6d5838b1f0e588b6e8e7405a862c012102447418612e8d57a8f3e0bf02297a9508e64a5a8e1a159b5a5c7c4dbdd8685b2f00000000
//
// unsigned_wit_tx with 3 outs but no OP_RETURN output (Rachel)
// 01000000000102c93a8841546251348a7473d88c82cfc0bf4fd8644945269ce0f507aa548b71570000000000feffffff0c3f2c78bf39ad77197b031a82bcbc66a50c1da41b6952716209dbe6b0a12ec20000000000feffffff03e8cd9a3b000000001600147849e6bf5e4b1ba7235572d1b0cbc094f0213e6ce8cd9a3b000000001600142daa0f6d60faf6c49605504a567a8bca3b9bf5027b0000000000000016001461523346362da430c795042b4cf388699e9bf8fd000000000000
// signed_wit_tx with 3 outs but no OP_RETURN output (Monica)
// 01000000000102c93a8841546251348a7473d88c82cfc0bf4fd8644945269ce0f507aa548b71570000000000feffffff0c3f2c78bf39ad77197b031a82bcbc66a50c1da41b6952716209dbe6b0a12ec20000000000feffffff03e8cd9a3b000000001600147849e6bf5e4b1ba7235572d1b0cbc094f0213e6ce8cd9a3b000000001600142daa0f6d60faf6c49605504a567a8bca3b9bf5027b0000000000000016001461523346362da430c795042b4cf388699e9bf8fd0247304402202e7612a8249feb2500c5723494bdefed30ea3a6ae57207745db445f17b04415f02205b8dcc817d116029a18bf16483715bc9aaa765569892b51da233f0dee8cd873a832102a004b949e4769ed341064829137b18992be884da5932c755e48f9465c1069dc2024730440220491d5cf69c6bd0aebdb1850a7ddcad47f3f551497209c54f664b5eef1c73dfbf02204163478290c9360792361cfbf2daac569a554a6ced99c113377014ca3fe8a4f5012102ea2f2dc5d55b67bab212ccb9b16a4b4a6e74fea16b10cc15bb618e5e6507409b00000000
//
// unsigned_wit_tx with op_return to random hex address (fails checksum) (Joey)
// 01000000000102bc7d691de7224bdce3d942bf653894577f1360c60a7ecc6f7343468f628f6d6a0000000000feffffff7a8f17bbae730451b0d305410197a45cc0ade4c8b10c4dc996044aefce36151f0000000000feffffff03e8cd9a3b000000001600147849e6bf5e4b1ba7235572d1b0cbc094f0213e6c0000000000000000166a14985bbaa4ffa37bec575e5660d7370a493f44194a7b0000000000000016001499d060056059f089b54ada2c970bd0ddc1417f21000000000000
// signed_wit_tx with op_return to random hex address (fails checksum) (Chandler)
// 01000000000102bc7d691de7224bdce3d942bf653894577f1360c60a7ecc6f7343468f628f6d6a0000000000feffffff7a8f17bbae730451b0d305410197a45cc0ade4c8b10c4dc996044aefce36151f0000000000feffffff03e8cd9a3b000000001600147849e6bf5e4b1ba7235572d1b0cbc094f0213e6c0000000000000000166a14985bbaa4ffa37bec575e5660d7370a493f44194a7b0000000000000016001499d060056059f089b54ada2c970bd0ddc1417f2102483045022100be1553a6b0a4ee2c380370a06f099f5e8d1d685b58fbade8c64e35cc19a001ac0220100f3f0b9f466518541b9bd36fc41392584f79a95ecaaa6c5f20b59d34f7ad1e832102a004b949e4769ed341064829137b18992be884da5932c755e48f9465c1069dc202483045022100a2c576cbcda4e42a87aacad5ca33b4fb18c0e6fa39a1a8bd0e9f3d3ea7ed7d8f022010f759b87d08b9e9e27a3c09b758f333b463df9b9feb15d217c64198ad744b8d0121025e6c72a58f2d3b6b2d87966631dead2134985af0e9c099718443e8ad5a74b5b400000000
//
// unsigned_wit_tx with op_return confirmed invalid address (Phoebe)
// 010000000001026fa160dbd05ca476d786d73b319d22daa7ca17f72baa880117433059d1b659a60000000000feffffff61f1e7c36c1bcc50da5f3ba1e8a82c8f17d5d368f448fc51b51835db0f30af190000000000feffffff03e8cd9a3b000000001600147849e6bf5e4b1ba7235572d1b0cbc094f0213e6c0000000000000000166a148af1c1357ceb552eabe834f93d27097d3103c2b47b00000000000000160014b12c6eb58f2d2aa2e8e1d3a5fd43248fa6a4e753000000000000
// signed_wit_tx with op_return confirmed invalid address (Gunther)
// 010000000001026fa160dbd05ca476d786d73b319d22daa7ca17f72baa880117433059d1b659a60000000000feffffff61f1e7c36c1bcc50da5f3ba1e8a82c8f17d5d368f448fc51b51835db0f30af190000000000feffffff03e8cd9a3b000000001600147849e6bf5e4b1ba7235572d1b0cbc094f0213e6c0000000000000000166a148af1c1357ceb552eabe834f93d27097d3103c2b47b00000000000000160014b12c6eb58f2d2aa2e8e1d3a5fd43248fa6a4e7530247304402206035a8526aa701d8819dcbae862d6ecf453580b271a5702b0d436dde26c689ae022054652c23280a4af86b171471628edcd87e7f5ba3654eac52c3b8dfcc8978f11e832102a004b949e4769ed341064829137b18992be884da5932c755e48f9465c1069dc202483045022100d2d38c43d57f44553fd6ea75c319cd9903241636175ee455537d9a563d582c9f02204c31a289578c39376d19d30804e854a7b0db2f9be25c8a21b6aebe0d1b21804a012102ed431feb193d77f61f52891426c90a9a78859e7d74a5600c587db4a70b69445500000000
