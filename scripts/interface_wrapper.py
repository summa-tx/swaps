import json
from ethereum import abi, transactions


# Loads the abi from the file
# For some reason solc generates json stored as a string inside json
# So we have to call .loads twice
with open('build/IntegralAuction.json', 'r') as jsonfile:
    j = json.loads(jsonfile.read())
    ABI = json.loads(j['interface'])


def create_unsigned_tx(contract_method, contract_method_args, contract_address,
                       value=0, nonce=0, gas_price=20, start_gas=500000):
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
    # ContractTranslator instance used to encode and decode contract data
    ct = abi.ContractTranslator(ABI)

    # Encode contract method
    tx_data = ct.encode(contract_method, contract_method_args)

    # Transaction instance, unsigned
    return transactions.Transaction(
        nonce=nonce,
        gasprice=gas_price,
        startgas=start_gas,
        to=contract_address,
        value=value,
        data=tx_data,
        v=0, r=0, s=0)


def create_open_tx(partial_tx, reservePrice, reqDiff, asset, value, **kwargs):
    '''Makes an unsigned transaction calling open

    Args:
        partial_tx (riemann.tx.Tx): the partial transaction to submit
        reservePrice         (int): the lowest acceptable price (not enforced)
        reqDiff              (int): the amount of difficult required
                                    in the proof's header chain
        asset               (str):  asset address
        value               (int):  asset amount or 721 ID
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
    contract_method_args = [
        partial_tx.to_bytes(),
        reservePrice,
        reqDiff,
        asset,
        value]

    return create_unsigned_tx(
        contract_method='open',
        contract_method_args=contract_method_args,
        **kwargs)


def create_claim_tx(tx, proof, index, headers, **kwargs):
    '''Makes an unsigned transaction calling claim

    Args:
        tx (riemann.tx.Tx): the fully signed tx
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
    contract_method_args = [
        tx.to_bytes(),
        bytes.fromhex(proof),
        index,
        bytes.fromhex(headers)]

    return create_unsigned_tx(
        contract_method='claim',
        contract_method_args=contract_method_args,
        **kwargs)
