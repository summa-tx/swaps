import scripts.utils as utils
from riemann import simple, tx
from riemann import utils as rutils
from riemann.encoding import addresses as addr


test_privkey = \
    'cf3ab75cde557c505f359148e6438ea081280c752a338382c7a1ea974a090ce7'

JAMES = 'bc1qkn3r0ms2wjc08nu6tt2pvfauclurl9y458ycqr'

priv = utils.coerce_key(test_privkey)
pub = utils.to_pubkey(priv).hex()
test_keypair = (test_privkey, pub)

# bc1qlkmj7zln5qqxypqxl8dsurfccazhpqp0w28mm5
address = addr.make_p2wpkh_address(bytes.fromhex(pub))

# 1976a914fdb72f0bf3a000620406f9db0e0d38c74570802f88ac
pkh = rutils.hash160(bytes.fromhex(pub))
output_script = b'\x19\x76\xa9\x14' + pkh + b'\x88\xac'


def make_partial_tx(outpoint, output_value, output_address,
                    lock_time=0):
    '''Creates an unsigned partial tx
    Args:
        outpoint (riemann.tx.Outpoint): the outpoint to spend
        sequence                 (int): tx nSequence
        output_value             (int): the number of satoshi to receive
        output_address           (str): the seller's address
        lock_time                (int): the tx's lock time
    '''
    tx_ins = [simple.unsigned_input(outpoint, sequence=0xFFFFFFFD)]
    tx_outs = [simple.output(output_value, output_address)]
    return simple.unsigned_witness_tx(
        tx_ins=tx_ins,
        tx_outs=tx_outs,
        lock_time=lock_time)


def sign_partial_tx(partial_tx, keypair, prevout_script, prevout_value):
    '''
    Signs a partial transaction.
    Args:
        partial_tx (riemann.tx.Tx): the partial_tx to sign
        keypair  (tuple(str, str)): privkey as hex, pubkey as hex
        prevout_script     (bytes): the script code of the prevout
        prevout_value        (int): the value of the prevout in sat
    Returns:
        (riemann.tx.Tx): sighash_singleanyonecanpay signed partial_tx
    '''
    sighash_bytes = partial_tx.sighash_single(
        index=0,
        script=prevout_script,
        prevout_value=prevout_value,
        anyone_can_pay=True)
    print(sighash_bytes.hex())
    sb2 = segwit_sighash(partial_tx, 0, output_script, prevout_value, 3, True)
    print(sb2.hex())
    sig = utils.sign_hash(sb2, keypair[0])
    print(sig)
    sig = '{}{}'.format(sig, '83')

    # Build the witness
    wit = tx.make_witness(
        [bytes.fromhex(sig),
         bytes.fromhex(keypair[1])])
    tx_witnesses = [wit]

    return partial_tx.copy(tx_witnesses=tx_witnesses)


def test_partial_with_utxo(tx_id, index, prevout_value):
    # block explorer:
    # 6e83370f4ef9edd11d56df0554e439cb79272d80bb114db426105f55ce723c89
    outpoint = simple.outpoint(tx_id, index)
    partial = make_partial_tx(outpoint, 1001, JAMES)
    unsigned = partial
    signed = sign_partial_tx(
        partial_tx=partial,
        keypair=test_keypair,
        prevout_script=output_script,
        prevout_value=rutils.i2le_padded(1000, 8))
    return unsigned, signed


def segwit_sighash(self, index, script, prevout_value=None,
                   sighash_type=None, anyone_can_pay=False):
    '''
    this function sets up sighash in BIP143 style
    https://github.com/bitcoin/bips/blob/master/bip-0143.mediawiki
    https://ricette.giallozafferano.it/Spaghetti-alla-Norma.html
    '''
    data = tx.ByteData()

    # 1. nVersion of the transaction (4-byte little endian)
    data += self.version
    # 2. hashPrevouts (32-byte hash)
    data += self._hash_prevouts(anyone_can_pay=anyone_can_pay)
    # 3. hashSequence (32-byte hash)
    data += self._hash_sequence(sighash_type=sighash_type,
                                anyone_can_pay=anyone_can_pay)
    # 4. outpoint (32-byte hash + 4-byte little endian)
    data += self.tx_ins[index].outpoint
    # 5. scriptCode of the input (serialized as scripts inside CTxOuts)
    data += _adjusted_script_code(self, script=script)
    # 6. value of the output spent by this input (8-byte little endian)
    data += prevout_value
    # 7. nSequence of the input (4-byte little endian)
    data += self.tx_ins[index].sequence
    # 8. hashOutputs (32-byte hash)
    data += self._hash_outputs(index=index, sighash_type=sighash_type)
    # 9. nLocktime of the transaction (4-byte little endian)
    data += self.lock_time
    # 10. sighash type of the signature (4-byte little endian)
    data += self._segwit_sighash_adjustment(sighash_type=sighash_type,
                                            anyone_can_pay=anyone_can_pay)
    print(data.hex())
    return rutils.hash256(data.to_bytes())


def _adjusted_script_code(self, script):
    '''
    Checks if the script code pased in to the sighash function is already
    length-prepended
    This will break if there's a redeem script that's just a pushdata
    That won't happen in practice

    Args:
        script (bytes): the spend script
    Returns:
        (bytes): the length-prepended script (if necessary)
    '''
    script_code = tx.ByteData()
    if script[0] == len(script) - 1:
        return script
    script_code += tx.VarInt(len(script))
    script_code += script
    return script_code
