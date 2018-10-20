import json
from ethereum import abi, transactions

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
        **kwargs:
            nonce       (int): number of transactions already sent by
                               that account
            gas_price   (int): gas price
            start_gas   (int): gas limit
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


def create_open_tx(partial_tx, reservePrice, reqDiff, **kwargs):
    contract_method_args = [
        partial_tx.to_bytes(),
        reservePrice,
        reqDiff]

    return create_unsigned_tx(
        contract_method='open',
        contract_method_args=contract_method_args,
        **kwargs)


def create_claim_tx(tx, proof, index, headers, **kwargs):
    contract_method_args = [
        tx.to_bytes(),
        bytes.fromhex(proof),
        index,
        bytes.fromhex(headers)]

    return create_unsigned_tx(
        contract_method='claim',
        contract_method_args=contract_method_args,
        **kwargs)
