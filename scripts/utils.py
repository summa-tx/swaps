import os
import sys
import json
import ecdsa
import signal
import hashlib
import logging

from ecdsa.util import sigencode_der_canonize
from ecdsa.ecdsa import int_to_string
from Cryptodome.Cipher import AES
from Cryptodome.Util.Padding import pad, unpad
from riemann import utils as rutils

from riemann.tx import Tx
from typing import Any, Tuple

# TODO: CHANGE FOR WINDOWS
PATH = os.path.expanduser('~/.integral/bidder/')
DB_PBKDF_SALT = b'integral-bidder-key-stretching'
PBKDF_ITERATIONS = 100000
SIGHASH_ALL = 0x01


def get_value_and_lock_time(tx: Tx) -> Tuple[int, int]:
    '''Parses the time lock and first output's value from a txn

    Args:
        tx (riemann.tx.Tx): the transaction
    Returns:
        (int, int): the value and locktime
    '''
    return (rutils.le2i(tx.tx_outs[0].value),
            rutils.le2i(tx.lock_time))


def sign_hash(hash_bytes: bytes, privkeydata):  # type: ignore
    '''Signs a hash with a private key

    Args:
        hash_bytes (bytes): The 32-byte hash to sign
        privkeydata    (*): The private key to sign with

    Returns:
        (bytes): The signature
    '''
    signing_key = coerce_key(privkeydata)
    return signing_key.sign_digest(
        hash_bytes,
        sigencode=sigencode_der_canonize).hex()


def coerce_key(data) -> ecdsa.SigningKey:  # type: ignore
    ''' Coerces key data to an ECDSA signing_key object
    Args:
        data (*): A key in some supported format
    Returns:
        (ecdsa.SigningKey): The key object
    '''
    try:
        data = bytes.fromhex(data)
    except:  # noqa: E722
        pass  # additional coercion attempts go here
    return ecdsa.SigningKey.from_string(
        data,
        curve=ecdsa.SECP256k1)


def write_to_file(data: bytes, filename: str) -> bool:
    '''
    writes bytes to a file with termination protection
    '''
    with TerminateProtected():
        with open(filename, 'wb') as outfile:
            outfile.write(data)
            return True


def write_encrypted_json_file(
        data_dict: dict,
        filename: str,
        secret_phrase: str) -> None:
    msg = json.dumps(data_dict).encode('utf-8')
    msg = encode_aes(msg, secret_phrase)
    write_to_file(msg, filename)


def read_encrypted_json_file(filename: str, secret_phrase: str) -> Any:
        with open(filename, 'rb') as datafile:
            content = datafile.read()
            content = decode_aes(content, secret_phrase).decode('utf-8')
            return json.loads(content)


def pbkdf2_hmac(
        data: bytes,
        salt: bytes = b'',
        hash_name: str = 'sha512',
        iterations: int = 2048) -> bytes:
    ''' Key stretching function PBKDF2 using HMAC-SHA512 to implement BIP39.
    Args:
        data       (bytes): data to stretch, mnemonic for BIP39
        salt       (bytes): optional data for security, 'mnemonic' for BIP39
        hash_name  (str): HMAC hash digest algorithm, SHA512 for BIP39
        iterations (int): number of HMAC-SHA512 hashing rounds, 2048 for BIP39
    Returns:
        (bytes): generated seed, 512-bit seed for BIP39
    '''
    return hashlib.pbkdf2_hmac(hash_name, data, salt, iterations)


def _aes_encrypt_with_iv(key: bytes, iv: bytes, data_bytes: bytes) -> bytes:
    '''Encrypts a message with a key.
    Args:
        key         (bytes): the AES key (32 bytes)
        iv          (bytes): the AES initialization vector
        data_bytes  (bytes): the message to encrypt
    Returns:
        (bytes): the encrypted message
    '''
    data_bytes = pad(data_bytes, 16)
    e = AES.new(key, AES.MODE_CBC, iv).encrypt(data_bytes)
    return e


def _aes_decrypt_with_iv(key: bytes, iv: bytes, data_bytes: bytes) -> bytes:
    '''Decrypts a message with a key.
    Args:
        key         (bytes): the AES key (32 bytes)
        iv          (bytes): the AES initialization vector
        data_bytes  (bytes): the message to decrypt
    Returns:
        (bytes): the decrypted message
    '''
    cipher = AES.new(key, AES.MODE_CBC, iv)
    data_bytes = cipher.decrypt(data_bytes)
    try:
        return unpad(data_bytes, 16)
    except ValueError as e:
        e.args += ('Invalid passphrase',)
        raise e


def encode_aes(message_bytes: bytes, secret_phrase: str) -> bytes:
    '''Encrypts a message with a phrase
    Args:
        message_bytes   (bytes): the bytes to encrypt
        secret_phrase     (str): the user's db encryption phrase
    Returns:
        (bytes): the encrypted message, prepended with its iv and ephemeral key
    '''
    secret = pbkdf2_hmac(
        data=secret_phrase.encode('utf-8'),
        salt=DB_PBKDF_SALT,
        hash_name='sha256',
        iterations=PBKDF_ITERATIONS)

    # NB: New iv and ephemeral key are created each time we encrypt
    iv = os.urandom(16)
    tmp_key = os.urandom(32)
    enc_tmp_key = _aes_encrypt_with_iv(secret, iv, tmp_key)

    ciphertext = _aes_encrypt_with_iv(tmp_key, iv, message_bytes)

    # NB: we prepend the ciphertext with its iv (16 bytes)
    #     and the ephemeral key (48 bytes)
    encrypted_message_bytes = iv + enc_tmp_key + ciphertext
    return encrypted_message_bytes


def decode_aes(encrypted_message_bytes, secret_phrase):  # type: ignore
    '''Decrypts a message with a phrase
    Args:
        encrypted_message_bytes (bytes): the encrypted message, prepended with
                                         its iv and ephemeral key
        secret_phrase             (str): the user's db encryption phrase
    Returns:
        (bytes): the decrypted message
    '''
    secret = pbkdf2_hmac(
        data=secret_phrase.encode('utf-8'),
        salt=DB_PBKDF_SALT,
        hash_name='sha256',
        iterations=PBKDF_ITERATIONS)

    # NB: Extract the iv and encrypted key from the message
    iv = encrypted_message_bytes[:16]
    enc_tmp_key = encrypted_message_bytes[16:64]
    encrypted_message_bytes = encrypted_message_bytes[64:]

    # NB: Decrypt the key and use it to decrypt the message
    tmp_key = _aes_decrypt_with_iv(secret, iv, enc_tmp_key)
    message_bytes = _aes_decrypt_with_iv(tmp_key, iv, encrypted_message_bytes)

    return message_bytes


class TerminateProtected:
    """ Protect a piece of code from being killed by SIGINT or SIGTERM.
    It can still be killed by a force kill.

    https://stackoverflow.com/questions/18499497/how-to-process-sigterm-signal-gracefully

    Example:
        with TerminateProtected():
            run_func_1()
            run_func_2()

    Both functions will be executed even if sigterm or sigkill received
    """
    killed = False

    def _handler(self, signum, frame):  # type: ignore
        logging.error('Received SIGINT or SIGTERM!'
                      'Finishing this block, then exiting.')
        self.killed = True

    def __enter__(self):  # type: ignore
        self.old_sigint = signal.signal(signal.SIGINT, self._handler)
        self.old_sigterm = signal.signal(signal.SIGTERM, self._handler)

    def __exit__(self, type, value, traceback):  # type: ignore
        if self.killed:
            sys.exit(0)
        signal.signal(signal.SIGINT, self.old_sigint)
        signal.signal(signal.SIGTERM, self.old_sigterm)


# ---------------------------------------------------------
#
# Copyright 2014 Corgan Labs
#
# The MIT License (MIT)
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.


def to_pubkey(privkey_obj: ecdsa.SigningKey) -> bytes:
        """
        Return compressed public key encoding
        Adapted from prusnak's bip32utils
        https://github.com/prusnak/bip32utils/
        https://github.com/prusnak/bip32utils/blob/master/LICENSE

        ecdsa.SigningKey -> bytes
        """
        ck = b''
        pubkey_obj = privkey_obj.get_verifying_key()
        padx = (b'\0' * 32 + int_to_string(pubkey_obj.pubkey.point.x()))[-32:]
        if pubkey_obj.pubkey.point.y() & 1:
            ck = b'\3' + padx
        else:
            ck = b'\2' + padx
        return ck
