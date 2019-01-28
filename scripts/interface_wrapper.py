import json

from ether import calldata, transactions

# Loads the abi from the file
# For some reason solc generates json stored as a string inside json
# So we have to call .loads twice
with open('build/IntegralAuction.json', 'r') as jsonfile:
    j = json.loads(jsonfile.read())
    ABI = json.loads(j['interface'])


def create_unsigned_tx(
        contract_address: str,
        value=0,
        start_gas=500000,
        gas_price=20,
        nonce=0,
        tx_data: bytes = b'',
        network_id: int = 1) -> transactions.UnsignedEthTx:
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
    return transactions.UnsignedEthTx(
        to=contract_address,
        value=value,
        gas=start_gas,
        gasPrice=gas_price,
        nonce=nonce,
        data=tx_data,
        chainId=network_id)


def create_open_data(
        partial_tx: str,
        reservePrice: int,
        reqDiff: int,
        asset: str,
        value: int):
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
    contract_method_args = [
        bytes.fromhex(partial_tx),
        reservePrice,
        reqDiff,
        asset,
        value]
    return calldata.call('open', contract_method_args, ABI)


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
    contract_method_args = [
        tx,
        proof,
        index,
        headers]
    return calldata.call('claim', contract_method_args, ABI)


def create_open_tx(
        partial_tx: str,
        reservePrice: int,
        reqDiff: int,
        asset: str,
        value: int,
        **kwargs):
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
            network_id       (int): ethereum network id

    Returns:
        (ethereum.transactions.Transaction): the unsigned tx
    '''
    tx_data = create_open_data(
        partial_tx, reservePrice, reqDiff, asset, value)
    return create_unsigned_tx(
        tx_data=tx_data,
        value=value,
        **kwargs)


def create_claim_tx(
        tx: bytes,
        proof: bytes,
        index: int,
        headers: bytes,
        **kwargs):
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
            network_id       (int): ethereum network id

    Returns:
        (ethereum.transactions.Transaction): the unsigned tx
    '''
    tx_data = create_claim_data(tx, proof, index, headers)
    return create_unsigned_tx(
        tx_data=tx_data,
        **kwargs)


def sign(
        tx: transactions.UnsignedEthTx,
        key: bytes) -> transactions.SignedEthTx:
    """Sign this transaction with a private key.
    A potentially already existing signature would be overridden.
    """

    return transactions.sign_transaction(tx, key)
