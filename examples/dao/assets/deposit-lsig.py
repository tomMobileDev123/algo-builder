import sys
sys.path.insert(0,'..')

from algobpy.parse import parse_params
from pyteal import *

def deposit_lsig(ARG_GOV_TOKEN, ARG_DAO_APP_ID):
    """
    A logic signature account which holds:
    - vote token deposits
    - Proposal deposits
    """

    # check no rekeying, close remainder to, asset close to for a txn
    def basic_checks(txn: Txn): return And(
        txn.rekey_to() == Global.zero_address(),
        txn.close_remainder_to() == Global.zero_address(),
        txn.asset_close_to() == Global.zero_address()
    )

    # Opt-in transaction. We only accept gov-token in this contract
    opt_in = And(
        basic_checks(Txn),
        Txn.type_enum() == TxnType.AssetTransfer,
        Txn.asset_amount() == Int(0),
        Txn.xfer_asset() == Int(ARG_GOV_TOKEN)
    )

    # Verifies:
    # 1. deposit to lsig (during add proposal or deposit votes)
    # 2. (OR) withdrawl from lsig (taking back vote_deposit, or clearing proposal record)
    deposit_or_withdraw = And(
        Global.group_size() == Int(2),

        # verify first transaction
        basic_checks(Gtxn[0]),
        Gtxn[0].type_enum() == TxnType.ApplicationCall,
        Gtxn[0].application_id() == Int(ARG_DAO_APP_ID),
        Or(
            Gtxn[0].application_args[0] == Bytes("add_proposal"),
            Gtxn[0].application_args[0] == Bytes("deposit_vote_token"),
            Gtxn[0].application_args[0] == Bytes("withdraw_vote_deposit"),
            Gtxn[0].application_args[0] == Bytes("clear_proposal"),
        ),

        # verify second transaction
        # NOTE: transfer attributes (sender, recipient, amount) are checked in the DAO App
        Txn.group_index() == Int(1),
        basic_checks(Gtxn[1]),
        Gtxn[1].type_enum() == TxnType.AssetTransfer,
        Gtxn[1].xfer_asset() == Int(ARG_GOV_TOKEN),
    )

    program = Cond(
        [Global.group_size() == Int(1), opt_in],
        [Global.group_size() == Int(2), deposit_or_withdraw],
    )

    return program

if __name__ == "__main__":
    params = {
        "ARG_GOV_TOKEN": 99,
        "ARG_DAO_APP_ID": 98
    }

    # Overwrite params if sys.argv[1] is passed
    if(len(sys.argv) > 1):
        params = parse_params(sys.argv[1], params)

    print(compileTeal(deposit_lsig(params["ARG_GOV_TOKEN"], params["ARG_DAO_APP_ID"]), Mode.Signature, version = 4))
