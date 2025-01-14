import { parsing } from "@algo-builder/web";
import { assert } from "chai";

import { RUNTIME_ERRORS } from "../../src/errors/errors-list";
import { AccountStore, Runtime } from "../../src/index";
import { AppDeploymentFlags, StackElem } from "../../src/types";
import { getProgram } from "../helpers/files";
import { useFixture } from "../helpers/integration";
import { expectRuntimeError } from "../helpers/runtime-errors";

describe("Crowdfunding basic tests", function () {
  useFixture("stateful");
  const john = new AccountStore(10e6);

  let runtime: Runtime;
  let approvalProgram: string;
  let clearProgram: string;
  let flags: AppDeploymentFlags;
  this.beforeAll(async function () {
    runtime = new Runtime([john]); // setup test
    approvalProgram = getProgram('crowdfunding.teal');
    clearProgram = getProgram('clear.teal');

    flags = {
      sender: john.account,
      globalBytes: 32,
      globalInts: 32,
      localBytes: 8,
      localInts: 8
    };
  });

  it("should fail during create application if 0 args are passed", function () {
    // create new app
    expectRuntimeError(
      () => runtime.addApp(flags, {}, approvalProgram, clearProgram),
      RUNTIME_ERRORS.TEAL.REJECTED_BY_LOGIC
    );
  });

  it("should create application and update global state if correct args are passed", function () {
    const validFlags: AppDeploymentFlags = Object.assign({}, flags);

    // Get begin date to pass in
    const beginDate = new Date();
    beginDate.setSeconds(beginDate.getSeconds() + 2);

    // Get end date to pass in
    const endDate = new Date();
    endDate.setSeconds(endDate.getSeconds() + 12000);

    // Get fund close date to pass in
    const fundCloseDate = new Date();
    fundCloseDate.setSeconds(fundCloseDate.getSeconds() + 120000);

    const appArgs = [
      parsing.uint64ToBigEndian(beginDate.getTime()),
      parsing.uint64ToBigEndian(endDate.getTime()),
      parsing.uint64ToBigEndian(7000000),
      parsing.addressToPk(john.address),
      parsing.uint64ToBigEndian(fundCloseDate.getTime())
    ];

    const johnMinBalance = john.minBalance;
    const appID = runtime.addApp(
      { ...validFlags, appArgs: appArgs }, {}, approvalProgram, clearProgram);
    // verify sender's min balance increased after creating application
    assert.isAbove(runtime.getAccount(john.address).minBalance, johnMinBalance);

    const getGlobal = (key: string):
    StackElem |undefined => runtime.getGlobalState(appID, key);
    const johnPk = parsing.addressToPk(john.address);

    // verify global state
    assert.isDefined(appID);
    assert.deepEqual(getGlobal('Creator'), johnPk);
    assert.deepEqual(getGlobal('StartDate'), BigInt(beginDate.getTime()));
    assert.deepEqual(getGlobal('EndDate'), BigInt(endDate.getTime()));
    assert.deepEqual(getGlobal('Goal'), 7000000n);
    assert.deepEqual(getGlobal('Receiver'), johnPk);
    assert.deepEqual(getGlobal('Total'), 0n);
  });
});
