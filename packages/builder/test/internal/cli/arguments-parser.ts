/* tslint:disable:no-string-literal */ // TODO this is for unit testing priv methods. We shouldn't test these at all?
import { assert } from "chai";

import { ArgumentsParser } from "../../../src/internal/cli/arguments-parser";
import { ERRORS } from "../../../src/internal/core/errors-list";
import {
  boolean,
  int,
  string,
} from "../../../src/internal/core/params/argument-types";
import { BUILDER_PARAM_DEFINITIONS } from "../../../src/internal/core/params/builder-params";
import {
  OverriddenTaskDefinition,
  SimpleTaskDefinition,
} from "../../../src/internal/core/tasks/task-definitions";
import {
  BuilderArguments,
  TaskArguments,
  TaskDefinition,
} from "../../../src/types";
import { expectBuilderError } from "../../helpers/errors";

describe("ArgumentsParser", () => {
  let argumentsParser: ArgumentsParser;
  let envArgs: BuilderArguments;
  let taskDefinition: TaskDefinition;
  let overridenTaskDefinition: OverriddenTaskDefinition;

  beforeEach(() => {
    argumentsParser = new ArgumentsParser();
    envArgs = {
      network: "test",
      showStackTraces: false,
      version: false,
      help: false,
      emoji: false,
      verbose: false,
    };
    taskDefinition = new SimpleTaskDefinition("compile", true)
      .addParam("param", "just a param", "a default value", string)
      .addParam("bleep", "useless param", 1602, int, true);

    const baseTaskDefinition = new SimpleTaskDefinition("overriddenTask")
      .addParam("strParam", "a str param", "defaultValue", string)
      .addFlag("aFlag", "a flag param");

    overridenTaskDefinition = new OverriddenTaskDefinition(baseTaskDefinition)
      .addFlag("overriddenFlag", "added flag param")
      .addOptionalParam("overriddenOptParam", "added opt param");
  });

  it("should transform a param name into CLA", () => {
    assert.equal(
      ArgumentsParser.paramNameToCLA("showStackTraces"),
      "--show-stack-traces"
    );
    assert.equal(ArgumentsParser.paramNameToCLA("version"), "--version");
  });

  it("Should throw if a param name CLA isn't all lowercase", () => {
    expectBuilderError(
      () => ArgumentsParser.cLAToParamName("--showStackTraces"),
      ERRORS.ARGUMENTS.PARAM_NAME_INVALID_CASING
    );

    expectBuilderError(
      () => ArgumentsParser.cLAToParamName("--showstackTraces"),
      ERRORS.ARGUMENTS.PARAM_NAME_INVALID_CASING
    );

    expectBuilderError(
      () => ArgumentsParser.cLAToParamName("--show-stack-Traces"),
      ERRORS.ARGUMENTS.PARAM_NAME_INVALID_CASING
    );
  });

  it("should transform CLA into a param name", () => {
    assert.equal(ArgumentsParser.cLAToParamName("--run"), "run");

    assert.equal(
      ArgumentsParser.cLAToParamName("--show-stack-traces"),
      "showStackTraces"
    );
  });

  it("should detect param name format", () => {
    assert.isTrue(argumentsParser["_hasCLAParamNameFormat"]("--run"));
    assert.isFalse(argumentsParser["_hasCLAParamNameFormat"]("run"));
  });

  it("should detect parameter names", () => {
    assert.isTrue(
      argumentsParser["_isCLAParamName"](
        "--show-stack-traces",
        BUILDER_PARAM_DEFINITIONS
      )
    );
    assert.isFalse(
      argumentsParser["_isCLAParamName"]("sarasa", BUILDER_PARAM_DEFINITIONS)
    );
    assert.isFalse(
      argumentsParser["_isCLAParamName"]("--sarasa", BUILDER_PARAM_DEFINITIONS)
    );
  });

  describe("builder arguments", () => {
    it("should parse builder arguments with task", () => {
      const rawCLAs: string[] = [
        "--show-stack-traces",
        "--network",
        "local",
        "compile",
        "--task-param",
      ];

      const {
        builderArguments,
        taskName,
        unparsedCLAs,
      } = argumentsParser.parseBuilderArguments(
        BUILDER_PARAM_DEFINITIONS,
        envArgs,
        rawCLAs
      );
      assert.equal(taskName, "compile");
      assert.equal(builderArguments.showStackTraces, true);
      assert.equal(builderArguments.network, "local");
      assert.equal(builderArguments.emoji, false);
      assert.equal(unparsedCLAs.length, 1);
      assert.equal("--task-param", unparsedCLAs[0]);
    });

    it("should parse builder arguments after taskname", () => {
      const rawCLAs: string[] = [
        "compile",
        "--task-param",
        "--show-stack-traces",
        "--network",
        "local",
      ];

      const {
        builderArguments,
        taskName,
        unparsedCLAs,
      } = argumentsParser.parseBuilderArguments(
        BUILDER_PARAM_DEFINITIONS,
        envArgs,
        rawCLAs
      );
      assert.equal(taskName, "compile");
      assert.equal(builderArguments.showStackTraces, true);
      assert.equal(builderArguments.network, "local");
      assert.equal(builderArguments.emoji, false);
      assert.equal(unparsedCLAs.length, 1);
      assert.equal("--task-param", unparsedCLAs[0]);
    });

    it("should fail trying to parse task arguments before taskname", () => {
      const rawCLAs: string[] = [
        "--task-param",
        "compile",
        "--show-stack-traces",
        "--network",
        "local",
      ];

      expectBuilderError(
        () =>
          argumentsParser.parseBuilderArguments(
            BUILDER_PARAM_DEFINITIONS,
            envArgs,
            rawCLAs
          ),
        ERRORS.ARGUMENTS.UNRECOGNIZED_COMMAND_LINE_ARG
      );
    });

    it("should parse a builder argument", () => {
      const rawCLAs: string[] = [
        "--show-stack-traces",
        "--network",
        "local",
        "compile",
      ];

      const builderArguments: TaskArguments = {};
      assert.equal(
        0,
        argumentsParser["_parseArgumentAt"](
          rawCLAs,
          0,
          BUILDER_PARAM_DEFINITIONS,
          builderArguments
        )
      );
      assert.equal(builderArguments.showStackTraces, true);
      assert.equal(
        2,
        argumentsParser["_parseArgumentAt"](
          rawCLAs,
          1,
          BUILDER_PARAM_DEFINITIONS,
          builderArguments
        )
      );
      assert.equal(builderArguments.network, "local");
    });

    it("should fail trying to parse builder with invalid argument", () => {
      const rawCLAs: string[] = [
        "--show-stack-traces",
        "--network",
        "local",
        "--invalid-param",
      ];
      expectBuilderError(
        () =>
          argumentsParser.parseBuilderArguments(
            BUILDER_PARAM_DEFINITIONS,
            envArgs,
            rawCLAs
          ),
        ERRORS.ARGUMENTS.UNRECOGNIZED_COMMAND_LINE_ARG
      );
    });

    it("should fail trying to parse a repeated argument", () => {
      const rawCLAs: string[] = [
        "--show-stack-traces",
        "--network",
        "local",
        "--network",
        "local",
        "compile",
      ];
      expectBuilderError(
        () =>
          argumentsParser.parseBuilderArguments(
            BUILDER_PARAM_DEFINITIONS,
            envArgs,
            rawCLAs
          ),
        ERRORS.ARGUMENTS.REPEATED_PARAM
      );
    });

    it("should only add non-present arguments", () => {
      const builderArguments = argumentsParser["_addBuilderDefaultArguments"](
        BUILDER_PARAM_DEFINITIONS,
        envArgs,
        {
          showStackTraces: true,
        }
      );

      assert.isTrue(builderArguments.showStackTraces);
      assert.isFalse(builderArguments.emoji);
    });
  });

  describe("tasks arguments", () => {
    it("should parse tasks arguments", () => {
      const rawCLAs: string[] = ["--param", "testing", "--bleep", "1337"];
      const { paramArguments, rawPositionalArguments } = argumentsParser[
        "_parseTaskParamArguments"
      ](taskDefinition, rawCLAs);
      assert.deepEqual(paramArguments, { param: "testing", bleep: 1337 });
      assert.equal(rawPositionalArguments.length, 0);
    });

    it("should parse overridden tasks arguments", () => {
      const rawCLAs: string[] = [
        "--str-param",
        "testing",
        "--a-flag",
        "--overridden-flag",
        "--overridden-opt-param",
        "optValue",
      ];

      const { paramArguments, rawPositionalArguments } = argumentsParser[
        "_parseTaskParamArguments"
      ](overridenTaskDefinition, rawCLAs);
      assert.deepEqual(paramArguments, {
        strParam: "testing",
        aFlag: true,
        overriddenFlag: true,
        overriddenOptParam: "optValue",
      });
      assert.equal(rawPositionalArguments.length, 0);
    });

    it("should parse task with variadic arguments", () => {
      taskDefinition.addVariadicPositionalParam(
        "variadic",
        "a variadic params",
        [],
        int
      );

      const rawPositionalArguments = ["16", "02"];
      const positionalArguments = argumentsParser["_parsePositionalParamArgs"](
        rawPositionalArguments,
        taskDefinition.positionalParamDefinitions
      );
      assert.deepEqual(positionalArguments.variadic, [16, 2]);
    });

    it("should parse task with default variadic arguments", () => {
      taskDefinition.addVariadicPositionalParam(
        "variadic",
        "a variadic params",
        [1729],
        int
      );

      const rawPositionalArguments: string[] = [];
      // tslint:disable-next-line:no-string-literal
      const positionalArguments = argumentsParser["_parsePositionalParamArgs"](
        rawPositionalArguments,
        taskDefinition.positionalParamDefinitions
      );

      assert.deepEqual(positionalArguments.variadic, [1729]);
    });

    it("should fail when passing invalid parameter", () => {
      const rawCLAs: string[] = ["--invalid-parameter", "not_valid"];
      expectBuilderError(() => {
        argumentsParser.parseTaskArguments(taskDefinition, rawCLAs);
      }, ERRORS.ARGUMENTS.UNRECOGNIZED_PARAM_NAME);
    });

    it("should fail to parse task without non optional variadic arguments", () => {
      const rawCLAs: string[] = ["--param", "testing", "--bleep", "1337"];
      taskDefinition.addVariadicPositionalParam(
        "variadic",
        "a variadic params"
      );

      expectBuilderError(() => {
        argumentsParser.parseTaskArguments(taskDefinition, rawCLAs);
      }, ERRORS.ARGUMENTS.MISSING_POSITIONAL_ARG);
    });

    it("should fail to parse task without non optional argument", () => {
      const rawCLAs: string[] = [];
      const definition = new SimpleTaskDefinition("compile", true);
      definition.addParam("param", "just a param");
      definition.addParam("bleep", "useless param", 1602, int, true);
      expectBuilderError(() => {
        argumentsParser.parseTaskArguments(definition, rawCLAs);
      }, ERRORS.ARGUMENTS.MISSING_TASK_ARGUMENT);
    });

    it("should fail trying to parse unrecognized positional argument", () => {
      const rawCLAs: string[] = [];
      const definition = new SimpleTaskDefinition("compile", true);
      definition.addParam("param", "just a param");
      definition.addParam("bleep", "useless param", 1602, int, true);
      expectBuilderError(() => {
        argumentsParser.parseTaskArguments(definition, rawCLAs);
      }, ERRORS.ARGUMENTS.MISSING_TASK_ARGUMENT);
    });

    it("should fail when passing unneeded arguments", () => {
      const rawCLAs: string[] = ["more", "arguments"];
      expectBuilderError(() => {
        argumentsParser.parseTaskArguments(taskDefinition, rawCLAs);
      }, ERRORS.ARGUMENTS.UNRECOGNIZED_POSITIONAL_ARG);
    });

    it("should parse task with positional arguments", () => {
      const rawCLAs: string[] = [
        "--param",
        "testing",
        "--bleep",
        "1337",
        "foobar",
      ];
      taskDefinition.addPositionalParam("positional", "a posititon param");

      const args = argumentsParser.parseTaskArguments(taskDefinition, rawCLAs);
      assert.deepEqual(args, {
        param: "testing",
        bleep: 1337,
        positional: "foobar",
      });
    });

    it("Should throw the right error if the last CLA is a non-flag --param", () => {
      const rawCLAs: string[] = ["--b"];

      taskDefinition = new SimpleTaskDefinition("t", false)
        .addOptionalParam("b", "A boolean", true, boolean)
        .setAction(async () => {});

      expectBuilderError(
        () => argumentsParser.parseTaskArguments(taskDefinition, rawCLAs),
        ERRORS.ARGUMENTS.MISSING_TASK_ARGUMENT
      );
    });
  });
});