import { types } from "@algo-builder/web";
import { assert } from "chai";

import { RUNTIME_ERRORS } from "../../src/errors/errors-list";
import { AccountStore, Runtime } from "../../src/index";
import { ALGORAND_ACCOUNT_MIN_BALANCE } from "../../src/lib/constants";
import { useFixture } from "../helpers/integration";
import { expectRuntimeError } from "../helpers/runtime-errors";

describe("Pooled Transaction Fees Test", function () {
  useFixture("app-update");
  const minBalance = ALGORAND_ACCOUNT_MIN_BALANCE;
  let john = new AccountStore(1e30);
  let alice = new AccountStore(minBalance);
  let bob = new AccountStore(minBalance);

  let runtime: Runtime;

  this.beforeEach(async function () {
    runtime = new Runtime([john, alice, bob]); // setup test
  });

  // helper function
  function syncAccounts (): void {
    john = runtime.getAccount(john.address);
    bob = runtime.getAccount(bob.address);
    alice = runtime.getAccount(alice.address);
  }

  it("Should pass if second account doesn't pay fees and first account is covering fees", () => {
    const amount = 1e4 + 122;
    const initialBalance = john.balance();
    // group with fee distribution
    const groupTx: types.ExecParams[] = [
      {
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: john.account,
        toAccountAddr: alice.address,
        amountMicroAlgos: amount,
        payFlags: { totalFee: 2000 }
      },
      {
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: alice.account,
        toAccountAddr: bob.address,
        amountMicroAlgos: amount,
        payFlags: { totalFee: 0 }
      }
    ];

    runtime.executeTx(groupTx);

    syncAccounts();
    assert.equal(bob.balance(), BigInt(minBalance + amount));
    assert.equal(alice.balance(), BigInt(minBalance));
    assert.equal(john.balance(), initialBalance - BigInt(amount) - 2000n);
  });

  it("Should fail if fees is not enough", () => {
    const amount = 1e4 + 122;
    // group with fee distribution
    const groupTx: types.ExecParams[] = [
      {
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: john.account,
        toAccountAddr: alice.address,
        amountMicroAlgos: amount,
        payFlags: { totalFee: 1000 }
      },
      {
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: alice.account,
        toAccountAddr: bob.address,
        amountMicroAlgos: amount,
        payFlags: { totalFee: 0 }
      }
    ];

    // Fails if fees is not enough
    expectRuntimeError(
      () => runtime.executeTx(groupTx),
      RUNTIME_ERRORS.TRANSACTION.FEES_NOT_ENOUGH
    );
  });
});
