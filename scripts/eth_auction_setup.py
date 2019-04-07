import scripts.utils as utils
import scripts.utxo_setup as us
import scripts.partial_tx as pt
import scripts.interface_wrapper as iw
import scripts.merkle as merkle

import asyncio

import riemann
import riemann.tx as tx
import riemann.utils as rutils
import riemann.simple as simple

from ether import transactions

from typing import List, Tuple

GWEI = 1000000000  # 1 GWEI
ETH_ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'


# 1. Prepare a bunch of UTXOs (split_tx)
#   1. Send money to ADDRESS
#   2. Get tx_id + index + value from block explorer, pass in
# 2. Sign dutch auctions partial_txns
#   1. Assume they're at index 0 - 9
#   2. Assume all are 550 sat
#   3. Define the auction format
# 3. Make Ether data blobs


def make_several_auctions(
        tx_id: str,
        index: int,
        control_addr: str,
        control_addr_keypair: Tuple[str, str],
        prevout_value: int,
        start_nonce: int,
        contract_address: str,
        reqDiff: int,
        eth_value: int,
        eth_privkey: str,
        num_auctions: int,
        recipient: str,
        form: List[Tuple[int, int]],
        network_id: int = 1) -> Tuple[tx.Tx, List[str], List[str]]:
    '''
    Args:
        tx_id                            (str): A txid containing an output
                                                held by control_addr
        index                            (int): The index controlled
        control_addr                     (str): the addr controlling the
                                                outpoint described above
        control_addr_keypair (Tuple(str, str)): the keypair to the control addr
        prevout_value                    (int): The value of the prevout
        start_nonce                      (int): the ethereum account nonce to
                                                use in the first tx
        contract_address                 (str): the ether auction contract
        eth_value                        (int): the amount of ethereum in wei
                                                to sell in each auc
        eth_privkey                      (str): the privkey to an eth account
        num_auctions                     (int): the number of auctions to make
        recipient                        (str): the bitcoin address to send
                                                proceeds to
        form                       list(tuple): the price/timelock tuples for
                                                the auctions
        network_id                       (int): ether network id, 1 for main,
                                                3 for ropsten
    Returns:
        tuple(riemann.tx.Tx, List(str), List(str)):
            the Bitcoin tx,
            the ether data blobs,
            and the signed Ethereum txns
    '''
    if network_id != 1:
        riemann.select_network('bitcoin_test')
    split_tx = make_and_sign_split_tx(
        tx_id=tx_id,
        index=index,
        prevout_value=prevout_value,
        control_addr=control_addr,
        control_addr_keypair=control_addr_keypair,
        num_auctions=num_auctions,
        change_addr=recipient)

    split_tx_id = split_tx.tx_id.hex()
    prevout_tuples = [(split_tx_id, i, 550) for i in range(num_auctions)]

    partial_txns = pt.multidutch_as_hex(
        prevouts=prevout_tuples,
        recipient_addr=recipient,
        format_tuples=form,
        keypair=control_addr_keypair)

    ether_blobs = [iw.create_open_data(
        partial_tx=p[0],
        reservePrice=1000000,
        reqDiff=reqDiff,
        asset=ETH_ZERO_ADDRESS,
        value=eth_value
    ).hex() for p in zip(partial_txns, range(len(partial_txns)))]

    unsigned_ether = [iw.create_open_tx(
        partial_tx=p[0],
        reservePrice=1000000,
        reqDiff=reqDiff,
        asset=ETH_ZERO_ADDRESS,
        value=eth_value,
        nonce=start_nonce + p[1],
        gas_price=15 * GWEI,
        start_gas=500000,
        contract_address=contract_address,
        network_id=network_id
    ) for p in zip(partial_txns, range(len(partial_txns)))]

    signed_ether_txns = [
        transactions.serialize(
            iw.sign(tx, bytes.fromhex(eth_privkey)))
        for tx in unsigned_ether
    ]

    return split_tx, ether_blobs, signed_ether_txns


def make_and_sign_split_tx(
        tx_id: str,
        index: int,
        prevout_value: int,
        control_addr: str,
        control_addr_keypair: Tuple[str, str],
        num_auctions: int,
        change_addr: str) -> tx.Tx:
    '''
    Makes and signs a transaction with several small outputs
    Args:
        tx_id: the input prevout's txid
        index: the input prevout's index
        prevout_value: the input prevout's value
        control_addr: the input prevout's controlling address
        control_addr_keypair: the priv/pub keypair as a tuple of hex
        num_auctions: how many outputs to make
        change_addr: where to send leftover funds
    '''
    # Split in 10, send SUMMA change
    split_tx = us.generate_small_utxos(
        tx_id=tx_id,
        index=index,
        prevout_value=prevout_value,
        recipient_addr=control_addr,
        num_outputs=num_auctions,
        change_addr=change_addr,
        fee=8000,
        size=550)

    pubkeyhash = rutils.hash160(bytes.fromhex(control_addr_keypair[1]))
    prevout_script = b'\x19\x76\xa9\x14' + pubkeyhash + b'\x88\xac'

    sighash_bytes = split_tx.sighash_single(
        index=0,
        script=prevout_script,
        prevout_value=rutils.i2le_padded(prevout_value, 8),
        anyone_can_pay=True)
    sig = utils.sign_hash(sighash_bytes, control_addr_keypair[0])
    sig = '{}{}'.format(sig, '83')

    # Build the witness
    wit = tx.make_witness(
        [bytes.fromhex(sig),
         bytes.fromhex(control_addr_keypair[1])])
    tx_witnesses = [wit]

    split_tx = split_tx.copy(tx_witnesses=tx_witnesses)

    return split_tx


def undo_split(
        tx_id: str,
        num_auctions: int,
        change_addr: str,
        control_addr_keypair: Tuple[str, str]) -> tx.Tx:
    '''
    undoes a split tx. NOT FOR SHUTTING DOWN AUCTIONS
    Args:
        tx_id: the tx_id of the split tx
        num_auctions: the number of non-change outputs of the split tx
        change_addr: the address to send leftovers to
        control_addr_keypair: the keypair of the controlling address
    '''
    tx_ins = [simple.unsigned_input(simple.outpoint(tx_id, i))
              for i in range(num_auctions)]
    tx_outs = [simple.output(600, change_addr)]
    unsplit_tx = simple.unsigned_witness_tx(tx_ins, tx_outs)

    pubkeyhash = rutils.hash160(bytes.fromhex(control_addr_keypair[1]))
    prevout_script = b'\x19\x76\xa9\x14' + pubkeyhash + b'\x88\xac'

    tx_witnesses = []
    for i in range(num_auctions):
        sighash_bytes = unsplit_tx.sighash_all(
            index=i,
            script=prevout_script,
            prevout_value=rutils.i2le_padded(550, 8),
            anyone_can_pay=False)

        sig = utils.sign_hash(sighash_bytes, control_addr_keypair[0])
        sig = '{}{}'.format(sig, '01')

        # Build the witness
        wit = tx.make_witness(
            [bytes.fromhex(sig),
             bytes.fromhex(control_addr_keypair[1])])
        tx_witnesses.append(wit)

    return unsplit_tx.copy(tx_witnesses=tx_witnesses)


def make_btc_shutdown_txns(
        auction_tx_id: str,
        idxs: List[int],
        add_funds_tx_id: str,
        add_funds_idx: int,
        add_funds_value: int,
        control_addr: str,
        control_addr_keypair: Tuple[str, str],
        change_addr: str,
        eth_addr: str,
        fee: int = 7700):
    '''
    Shuts down an auction by winning them with the owner keypair
    Args:
        tx_id: the split tx for the auction set
        idxs: the unpurchased indexes
        add_funds_tx_id: a prevout tx id to fund these transactions
        add_funds_idx: the prevout index
        add_funds_value: the prevout value
        control_addr: the input prevout's controlling address
        control_addr_keypair: the priv/pub keypair as a tuple of hex
        change_addr: where to send leftover funds
        eth_addr: where to deliver auction proceeds
        fee: the tx fee to pay
    '''
    prev = (add_funds_tx_id, add_funds_idx)
    val = add_funds_value
    shutdown_txns = []

    pubkeyhash = rutils.hash160(bytes.fromhex(control_addr_keypair[1]))
    prevout_script = b'\x19\x76\xa9\x14' + pubkeyhash + b'\x88\xac'

    for i in range(len(idxs)):
        tx_ins = [
            simple.unsigned_input(simple.outpoint(auction_tx_id, idxs[i])),
            simple.unsigned_input(simple.outpoint(*prev))
        ]

        out_val = val + 550 - fee
        addr = control_addr if i < len(idxs) - 1 else change_addr
        tx_outs = [
            simple.output(out_val, addr),
            tx.make_op_return_output(bytes.fromhex(eth_addr[2:]))
        ]

        shutdown_tx = simple.unsigned_witness_tx(tx_ins, tx_outs)

        tx_witnesses = []

        sighash_bytes = shutdown_tx.sighash_all(
            index=0,
            script=prevout_script,
            prevout_value=rutils.i2le_padded(550, 8),
            anyone_can_pay=False)
        sig = utils.sign_hash(sighash_bytes, control_addr_keypair[0])
        sig = '{}{}'.format(sig, '01')

        # Build the witness
        wit = tx.make_witness(
            [bytes.fromhex(sig),
             bytes.fromhex(control_addr_keypair[1])])
        tx_witnesses.append(wit)

        sighash_bytes_2 = shutdown_tx.sighash_all(
            index=1,
            script=prevout_script,
            prevout_value=rutils.i2le_padded(val, 8),
            anyone_can_pay=False)
        sig_2 = utils.sign_hash(sighash_bytes_2, control_addr_keypair[0])
        sig_2 = '{}{}'.format(sig_2, '01')

        # Build the witness
        wit_2 = tx.make_witness(
            [bytes.fromhex(sig_2),
             bytes.fromhex(control_addr_keypair[1])])
        tx_witnesses.append(wit_2)

        prev = (shutdown_tx.tx_id.hex(), 0)
        val = out_val
        shutdown_txns.append(shutdown_tx.copy(tx_witnesses=tx_witnesses).hex())

    return shutdown_txns


def make_and_broadcast_btc_shutdown(
        auction_tx_id: str,
        idxs: List[int],
        control_addr: str,
        control_addr_keypair: Tuple[str, str],
        add_funds_tx_id: str,
        add_funds_idx: int,
        add_funds_value: int,
        change_addr: str,
        eth_addr: str,
        fee: int = 7700) -> List[str]:

    '''
    Does make_btc_shutdown_txns and then broadcasts
    Args:
        auction_tx_id: the split tx for the auction set
        idxs: the unpurchased indexes
        add_funds_tx_id: a prevout tx id to fund these transactions
        add_funds_idx: the prevout index
        add_funds_value: the prevout value
        control_addr: the input prevout's controlling address
        control_addr_keypair: the priv/pub keypair as a tuple of hex
        change_addr: where to send leftover funds
        eth_addr: where to deliver auction proceeds
        fee: the tx fee to pay
    '''

    shutdown_txns = make_btc_shutdown_txns(
        auction_tx_id=auction_tx_id,
        idxs=idxs,
        control_addr=control_addr,
        control_addr_keypair=control_addr_keypair,
        add_funds_tx_id=add_funds_tx_id,
        add_funds_idx=add_funds_idx,
        add_funds_value=add_funds_value,
        change_addr=change_addr,
        eth_addr=eth_addr,
        fee=fee)

    async def do() -> List[str]:
        ret = [await merkle.broadcast(t) for t in shutdown_txns]
        return ret

    task = asyncio.ensure_future(do())
    return asyncio.get_event_loop().run_until_complete(task)


def make_ethereum_settlement_transactions(
        bitcoin_txids: List[str],
        start_nonce: int,
        eth_privkey: str,
        contract_address: str) -> List[str]:
    coros = [
        merkle.get_that_tx(
            bitcoin_txids[i], 8, contract_address, i + start_nonce)
        for i in range(len(bitcoin_txids))]
    task = asyncio.gather(*coros)
    txns = asyncio.get_event_loop().run_until_complete(task)
    signed = [iw.sign(txn, bytes.fromhex(eth_privkey)) for txn in txns]
    return [transactions.serialize(txn) for txn in signed]
