import { getProgram } from "@algo-builder/algob";
import { AccountStore, LogicSig, Runtime } from "@algo-builder/runtime";
import { types } from "@algo-builder/web";
import { assert } from "chai";

const minBalance = BigInt(1e6);
const masterBalance = BigInt(10e6);
const amount = BigInt(1e6);

describe('Sample Test', function () {
  let master: AccountStore;
  let fundReceiver: AccountStore;

  let runtime: Runtime;
  let lsig: LogicSig;
  const feeCheckProgram = getProgram('fee-check.teal');

  this.beforeEach(async function () {
    master = new AccountStore(masterBalance);
    fundReceiver = new AccountStore(minBalance);
    runtime = new Runtime([master, fundReceiver]);

    lsig = runtime.getLogicSig(feeCheckProgram, []);
    lsig.sign(master.account.sk);
  });

  function syncAccounts (): void {
    master = runtime.getAccount(master.address);
    fundReceiver = runtime.getAccount(fundReceiver.address);
  }

  it('Should not fail because txn fees is equal to or greater than 10000 microAlgos', () => {
    const validTxFee = 10000;
    assert.equal(fundReceiver.balance(), minBalance);
    assert.equal(master.balance(), masterBalance);

    runtime.executeTx({
      type: types.TransactionType.TransferAlgo,
      sign: types.SignType.LogicSignature,
      lsig: lsig,
      fromAccountAddr: master.address,
      toAccountAddr: fundReceiver.address,
      amountMicroAlgos: amount,
      payFlags: { totalFee: validTxFee }
    });
    syncAccounts();
    assert.equal(fundReceiver.balance(), minBalance + amount);
    assert.equal(master.balance(), masterBalance - amount - BigInt(validTxFee));
  });

  it('Should fail because txn fees is less than 10000 microAlgos', () => {
    const invalidTxFee = 1000;
    const initialFundRecBalance = fundReceiver.balance();
    const initialMasterBalance = master.balance();

    try {
      runtime.executeTx({
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.LogicSignature,
        lsig: lsig,
        fromAccountAddr: master.address,
        toAccountAddr: fundReceiver.address,
        amountMicroAlgos: amount,
        payFlags: { totalFee: invalidTxFee }
      });
    } catch (error) {
      console.log(error);
    }
    syncAccounts();
    // verify balance is unchanged
    assert.equal(fundReceiver.balance(), initialFundRecBalance);
    assert.equal(master.balance(), initialMasterBalance);
  });
});
