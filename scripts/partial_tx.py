import scripts.utils as utils
from riemann import simple, tx
from riemann import utils as rutils


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
    sig = utils.sign_hash(sighash_bytes, keypair[0])
    sig = '{}{}'.format(sig, '83')

    # Build the witness
    wit = tx.make_witness(
        [bytes.fromhex(sig),
         bytes.fromhex(keypair[1])])
    tx_witnesses = [wit]

    return partial_tx.copy(tx_witnesses=tx_witnesses)


def partial(tx_id, index, prevout_value, recipient_addr,
            output_value, lock_time, keypair):
    '''
    Makes a partial_tx from human readable information

    Args:
        tx_id                (str): txid of parent tx
        index                (int): index of input in parent tx
        prevout_value        (int): value in satoshi of the input
        recipient_addr       (str): address of the recipient
        output_value         (int): value in satoshi of the output
        lock_time            (int): desired lock_time in bitcoin format
        keypair  (tuple(str, str)): privkey as hex, pubkey as hex
    Returns:
        (riemann.tx.Tx): The signed transaction
    '''
    outpoint = simple.outpoint(tx_id, index)
    pub = bytes.fromhex(keypair[1])
    pkh = rutils.hash160(pub)
    output_script = b'\x19\x76\xa9\x14' + pkh + b'\x88\xac'  # Assume PKH

    unsigned = make_partial_tx(
        outpoint=outpoint,
        output_value=output_value,
        output_address=recipient_addr,
        lock_time=lock_time)

    signed = sign_partial_tx(
        partial_tx=unsigned,
        keypair=keypair,
        prevout_script=output_script,
        prevout_value=rutils.i2le_padded(prevout_value, 8))
    return signed


def dutch(tx_id, index, prevout_value, recipient_addr,
          format_tuples, keypair):
    '''
    Makes a dutch auction given a list representing the format

    Args:
        tx_id                           (str): txid of parent tx
        index                           (int): index of input in parent tx
        prevout_value                   (int): value in satoshi of the input
        recipient_addr                  (str): address of the recipient
        format_tuples (list(tuple(int, int))): tuples of value and timelock
        keypair             (tuple(str, str)): privkey as hex, pubkey as hex
    Returns:
        list(riemann.tx.Tx): The signed transactions
    '''
    ret = []
    for t in format_tuples:
        txn = partial(tx_id, index, prevout_value, recipient_addr,
                      t[0], t[1], keypair)
        ret.append(txn)
    return ret


def dutch_as_hex(tx_id, index, prevout_value, recipient_addr,
                 format_tuples, keypair):
    '''
    Makes a dutch auction given a list representing the format

    Args:
        tx_id                           (str): txid of parent tx
        index                           (int): index of input in parent tx
        prevout_value                   (int): value in satoshi of the input
        recipient_addr                  (str): address of the recipient
        format_tuples (list(tuple(int, int))): tuples of value and timelock
        keypair             (tuple(str, str)): privkey as hex, pubkey as hex
    Returns:
        str: The signed transactions as a hex blob
    '''
    txns = dutch(tx_id, index, prevout_value, recipient_addr,
                 format_tuples, keypair)
    b = bytearray()
    for t in txns:
        b.extend(t)
    return b.hex()


def multidutch(prevouts, recipient_addr, format_tuples, keypair):
    '''
    Makes identical dutch auctions for each outpoint in a list of outpoints

    Args:
        prevouts (list(tuple(str, str, int))): tuple of txid, index, value
        recipient_addr                  (str): address of the recipient
        format_tuples (list(tuple(int, int))): tuples of value and timelock
        keypair             (tuple(str, str)): privkey as hex, pubkey as hex
    Returns:
        list(list(riemann.tx.Tx)): The signed transactions
    '''
    ret = []
    for p in prevouts:
        d = dutch(p[0], p[1], p[2], recipient_addr,
                  format_tuples, keypair)
        ret.append(d)
    return ret


def multidutch_as_hex(prevouts, recipient_addr, format_tuples, keypair):
    '''
    Makes identical dutch auctions for each outpoint in a list of outpoints

    Args:
        prevouts (list(tuple(str, str, int))): tuple of txid, index, value
        recipient_addr                  (str): address of the recipient
        format_tuples (list(tuple(int, int))): tuples of value and timelock
        keypair             (tuple(str, str)): privkey as hex, pubkey as hex
    Returns:
        list(str): A list of dutch partial_tx blobs
    '''
    dutches = multidutch(prevouts, recipient_addr, format_tuples, keypair)
    ret = []
    for d in dutches:
        b = bytearray()
        for t in d:
            b.extend(t)
        ret.append(b.hex())
    return ret
