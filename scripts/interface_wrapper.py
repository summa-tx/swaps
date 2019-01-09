import json
from ethereum import abi, transactions
from ethereum.transactions import rlp
from ethereum.utils import privtoaddr, normalize_key, ecsign, sha3


# Loads the abi from the file
# For some reason solc generates json stored as a string inside json
# So we have to call .loads twice
with open('build/IntegralAuction.json', 'r') as jsonfile:
    j = json.loads(jsonfile.read())
    ABI = json.loads(j['interface'])


def create_unsigned_tx(contract_address, tx_data, value=0, nonce=0,
                       gas_price=20, start_gas=500000):
    '''Creates an unsigned contract call transaction.
    Args:
        contract_method         (str): name of contract method to call
        contract_method_args   (list): contract method arguments in
        value                   (int): amount in wei payable to contract
                                       method. is 0 if contract method is
                                       not payable
        contract_address        (str): address of the contract to call
        value                   (int): amount of ether (in wei) to include
        nonce                   (int): number of transactions already sent by
                                       signing account
        gas_price               (int): gas price
        start_gas               (int): gas limit
    Returns:
        (Transaction instance): unsigned transaction
    '''
    # Transaction instance, unsigned
    return transactions.Transaction(
        nonce=nonce,
        gasprice=gas_price,
        startgas=start_gas,
        to=contract_address,
        value=value,
        data=tx_data,
        v=0, r=0, s=0)


def create_open_data(partial_tx, reservePrice, reqDiff, asset, value):
    '''Makes an data blob for calling open

    Args:
        partial_tx   (str): the partial transaction to submit
        reservePrice (int): the lowest acceptable price (not enforced)
        reqDiff      (int): the amount of difficult required
                                    in the proof's header chain
        asset        (str):  asset address
        value        (int):  asset amount or 721 ID

    Returns:
        (bytes): the data blob
    '''
    ct = abi.ContractTranslator(ABI)
    contract_method_args = [
        bytes.fromhex(partial_tx),
        reservePrice,
        reqDiff,
        asset,
        value]
    return ct.encode('open', contract_method_args)


def create_claim_data(tx, proof, index, headers):
    '''Makes an unsigned transaction calling claim

    Args:
        tx         (bytes): the fully signed tx
        proof      (bytes): the merkle inclusion proof
        index        (int): the index of the tx for merkle verification
        headers      (str): the header chain containing work

    Returns:
        (bytes): the data blob
    '''
    ct = abi.ContractTranslator(ABI)
    contract_method_args = [
        tx,
        proof,
        index,
        headers]
    return ct.encode('claim', contract_method_args)


def create_open_tx(partial_tx, reservePrice, reqDiff, asset, value, **kwargs):
    '''Makes an unsigned transaction calling open

    Args:
        partial_tx           (str): the partial transaction to submit
        reservePrice         (int): the lowest acceptable price (not enforced)
        reqDiff              (int): the amount of difficult required
                                    in the proof's header chain
        asset               (str):  asset address
        value               (int):  asset amount or 721 ID
        **kwargs:
            contract_address (str): address of the contract to call
            nonce            (int): number of transactions already sent by
                                    signing account
            gas_price        (int): gas price
            start_gas        (int): gas limit
    Returns:
        (ethereum.transactions.Transaction): the unsigned tx
    '''
    tx_data = create_open_data(
        partial_tx, reservePrice, reqDiff, asset, value)
    return create_unsigned_tx(
        tx_data=tx_data,
        value=value,
        **kwargs)


def create_claim_tx(tx, proof, index, headers, **kwargs):
    '''Makes an unsigned transaction calling claim

    Args:
        tx         (bytes): the fully signed tx
        proof        (str): the merkle inclusion proof
        index        (int): the index of the tx for merkle verification
        headers      (str): the header chain containing work
        **kwargs:
            contract_address (str): address of the contract to call
            value            (int): amount of ether (in wei) to include
            nonce            (int): number of transactions already sent by
                                    signing account
            gas_price        (int): gas price
            start_gas        (int): gas limit

    Returns:
        (ethereum.transactions.Transaction): the unsigned tx
    '''
    tx_data = create_claim_data(tx, proof, index, headers)
    return create_unsigned_tx(
        tx_data=tx_data,
        **kwargs)


def sign(tx, key, network_id=1):
    """Sign this transaction with a private key.
    A potentially already existing signature would be overridden.
    """

    rlpdata = transactions.rlp.encode(
        rlp.infer_sedes(
            tx).serialize(tx)[:-3] + [network_id, b'', b''])
    rawhash = sha3(rlpdata)

    key = normalize_key(key)

    v, r, s = ecsign(rawhash, key)
    if network_id is not None:
        v += 8 + network_id * 2

    ret = tx.copy(
        v=v, r=r, s=s
    )
    ret._sender = privtoaddr(key)
    return ret
