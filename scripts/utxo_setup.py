from riemann import simple

from typing import cast
from riemann.tx import Tx


def generate_small_utxos(
        tx_id: str,
        index: int,
        prevout_value: int,
        recipient_addr: str,
        num_outputs: int,
        fee: int,
        change_addr: str,
        size: int = 550) -> Tx:
    '''
    Makes new utxos.
    All utxos have the same address (i.e. the same keypair)

    Args:
        tx_id          (str): txid of parent tx
        index          (int): index of input in parent tx
        prevout_value  (int): value in satoshi of the input
        recipient_addr (str): address of the recipient
        num_outputs    (int): how many new small UTXOs to make
        fee            (int): fee to pay in satoshi
        change_addr    (str): address to send change to
    Returns:
        (rieman.tx.Tx): The unsigned tx making num_outputs new UTXOs
    '''
    # Make the input
    outpoint = simple.outpoint(tx_id, index)
    tx_ins = [simple.unsigned_input(outpoint)]

    # make small outputs
    tx_outs = [simple.output(size, recipient_addr) for i in range(num_outputs)]

    # Make a change output
    change = prevout_value - (size * num_outputs) - fee
    tx_outs.append(simple.output(change, change_addr))

    return cast(Tx, simple.unsigned_witness_tx(tx_ins, tx_outs))
