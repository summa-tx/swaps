import sys
import json
import asyncio

# from scripts import interface_wrapper as iw

from connectrum.svr_info import ServerInfo
from connectrum.client import StratumClient

from riemann import tx
from riemann import utils as rutils

# from ether.transactions import UnsignedEthTx

from typing import Any, cast, Tuple, Union

with open('build/ValidateSPV.json', 'r') as jsonfile:
    j = json.loads(jsonfile.read())
    ABI = json.loads(j['interface'])


CLIENT: StratumClient


async def _get_client() -> StratumClient:
    try:
        return CLIENT
    except NameError:
        global CLIENT
        CLIENT = await setup_client()
        return CLIENT


async def setup_client() -> StratumClient:
    try:
        return CLIENT
    except NameError:
        pass

    server = ServerInfo({
        "nickname": None,
        "hostname": "fortress.qtornado.com",
        "ip_addr": None,
        "ports": [
            "s50002",
            "t50001"
        ],
        "version": "1.4",
        "pruning_limit": 0,
        "seen_at": 1533670768.8676858
    })

    client = StratumClient()

    await asyncio.wait_for(
        client.connect(
            server_info=server,
            proto_code='s',
            use_tor=False,
            disable_cert_verify=True),
        timeout=5)
    #
    # await asyncio.wait_for(
    #     client.RPC(
    #         'server.version',
    #         'bitcoin-spv-merkle',
    #         '1.2'),
    #     timeout=5)

    return client

# # # # # # # # # # # # # # #
# Use this script Sparingly #
# # # # # # # # # # # # # # #


async def broadcast(t: Union[tx.Tx, str]) -> Any:
    '''
    broadcasts a bitcoin transaction. accepts an object or a string
    '''
    if type(t) is str:
        txhex = cast(str, t)
    else:
        txhex = cast(tx.Tx, t).hex()

    client = await _get_client()
    res = await client.RPC('blockchain.transaction.broadcast', txhex)
    return res


# def make_ether_txn(
#         t: tx.Tx,
#         proof: str,
#         index: int,
#         headers: str,
#         contract_address: str,
#         nonce: int) -> UnsignedEthTx:
#
#     return iw.create_claim_tx(
#         tx=t.to_bytes(),
#         proof=bytes.fromhex(proof),
#         index=index,
#         headers=bytes.fromhex(headers),
#         nonce=nonce,
#         contract_address=contract_address,
#         gas_price=15 * 1000000000,  # 15 GWEI
#         start_gas=1000000,
#         value=0)


async def get_latest_blockheight() -> int:
    '''
    gets the latest blockheight that a server is aware of
    '''
    client = await _get_client()
    fut, _ = client.subscribe('blockchain.headers.subscribe')
    block_dict = await fut
    print(block_dict)
    return cast(int, block_dict['height'])


async def get_block_merkle_root(height: int) -> bytes:
    '''
    gets the merkle root of a block
    '''
    client = await _get_client()

    header_dict = await client.RPC('blockchain.block.headers', height, 1)
    merkle_root = bytes.fromhex(header_dict['hex'])[36:68]

    return merkle_root


async def get_tx_from_api(tx_id: str) -> Tuple[dict, tx.Tx]:
    '''
    gets a transaction from electrum and returns it as a dict and an object
    '''
    client = await _get_client()
    tx_dict = await client.RPC('blockchain.transaction.get', tx_id, True)
    t = tx.Tx.from_hex(tx_dict['hex'])

    latest_blockheight = await get_latest_blockheight()

    # NB: I'm not sure why this works. I feel like it should be -1
    tx_dict['block_height'] = latest_blockheight - tx_dict['confirmations'] + 1

    return tx_dict, t


async def get_header_chain(start_height: int, count: int) -> str:
    '''
    gets headers starting at a specified height
    '''
    client = await _get_client()

    res = await client.RPC(
        'blockchain.block.headers', start_height, count)

    return cast(str, res['hex'])


async def get_merkle_proof_from_api(tx_id: str, hght: int) -> Tuple[str, int]:
    '''
    gets a transaction inclusion proof from electrum
    puts it into the format we expect
    '''
    client = await _get_client()

    res = await client.RPC('blockchain.transaction.get_merkle', tx_id, hght)

    pos = res['pos']

    proof = bytearray()
    proof.extend(bytes.fromhex(tx_id)[::-1])
    for tx_id in res['merkle']:
        proof.extend(bytes.fromhex(tx_id)[::-1])

    block_root = await get_block_merkle_root(hght)

    proof.extend(block_root)

    # NB: add 1 because our proof uses 1-indexed position
    return proof.hex(), pos + 1


def verify_proof(proof: bytes, index: int) -> bool:
    '''
    verifies a merkle leaf occurs at a specified index given a merkle proof
    '''
    index = index  # This is 1 indexed
    # TODO: making creating and verifying indexes the same
    root = proof[-32:]
    current = proof[0:32]

    # For all hashes between first and last
    for i in range(1, len(proof) // 32 - 1):
        # If the current index is even,
        # The next hash goes before the current one
        if index % 2 == 0:
            current = rutils.hash256(
                proof[i * 32: (i + 1) * 32]
                + current
            )
            # Halve and floor the index
            index = index // 2
        else:
            # The next hash goes after the current one
            current = rutils.hash256(
                current
                + proof[i * 32: (i + 1) * 32]
            )
            # Halve and ceil the index
            index = index // 2 + 1
        print(current.hex())
    # At the end we should have made the root
    if current != root:
        return False
    return True


# async def get_that_tx(
#         tx_id: str,
#         num_headers: int,
#         contract_address: str,
#         nonce: int):
#     '''
#     Makes an ethereum transaction containing a full SPV proof for a tx
#     '''
#     (tx_json, t) = await get_tx_from_api(tx_id)
#
#     proof, index = await get_merkle_proof_from_api(
#         t.tx_id.hex(), tx_json['block_height'])
#
#     # Create a header chain
#     chain = await get_header_chain(
#         tx_json['block_height'],
#         num_headers + 1)
#
#     txn = make_ether_txn(t, proof, index, chain, contract_address, nonce)
#
#     return txn


async def do_it_all(tx_id: str, num_headers: int) -> None:
    '''
    Gets proof info and prints it
    '''
    (tx_json, t) = await get_tx_from_api(tx_id)

    proof, index = await get_merkle_proof_from_api(
        t.tx_id.hex(), tx_json['block_height'])

    # Create a header chain
    chain = await get_header_chain(
        tx_json['block_height'],
        num_headers + 1)

    # Error if the proof isn't valid
    assert(verify_proof(bytes.fromhex(proof), index))

    print()
    print()
    print('---- TX ----')
    print(t.hex())
    print()
    print()
    print('--- PROOF ---')
    print(proof)
    print()
    print()
    print('--- INDEX ---')
    print(index)
    print()
    print()
    print('--- CHAIN ---')
    print(chain)


def main() -> None:
    # Read tx_id from args, and then get it and its block from explorers
    tx_id = str(sys.argv[1])
    num_headers = int(sys.argv[2]) if len(sys.argv) > 2 else 6

    asyncio.get_event_loop().run_until_complete(do_it_all(tx_id, num_headers))


if __name__ == '__main__':
    main()
